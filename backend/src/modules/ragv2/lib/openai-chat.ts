import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RagChat,
  type RagChatInput,
  type AgentMessage,
  type ChatToolsResult,
  type ToolCall,
  type ToolDef,
  extractJson,
} from './rag-llm.interface';

/**
 * Client sinh câu trả lời (generation) OpenAI cho RAG v2 — song song với GeminiChat,
 * chọn qua env `RAGV2_LLM_PROVIDER=openai`.
 *
 * Gọi REST API `POST {base}/chat/completions` (mặc định model `gpt-4o-mini`).
 * Khác Gemini:
 *  - Auth: header `Authorization: Bearer <key>` (không nhét key vào URL).
 *  - Body: `messages:[{role,content}]` (system + user), `temperature`, `max_tokens`.
 *  - JSON mode: `response_format:{type:'json_object'}` (system/prompt phải có chữ "JSON").
 *  - Parse: `choices[0].message.content`.
 *  - Không có `thinkingConfig` (đặc thù Gemini 2.5) → bỏ qua.
 */
@Injectable()
export class OpenAiChat extends RagChat {
  readonly providerName = 'openai';
  private readonly logger = new Logger(OpenAiChat.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  get model(): string {
    return this.config.get<string>('RAGV2_CHAT_MODEL') || 'gpt-4o-mini';
  }

  isReady(): boolean {
    return !!this.config.get<string>('OPENAI_API_KEY');
  }

  /** Base URL OpenAI — đổi sang proxy tương thích qua OPENAI_BASE_URL. */
  private baseUrl(): string {
    return (this.config.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(
      /\/+$/,
      '',
    );
  }

  async complete(input: RagChatInput): Promise<string> {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (!key) {
      throw new Error('Thiếu OPENAI_API_KEY — RAG v2 (provider openai) cần khoá OpenAI.');
    }
    const url = `${this.baseUrl()}/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.model,
      messages: [
        { role: 'system', content: input.system },
        { role: 'user', content: input.prompt },
      ],
      temperature: input.temperature ?? 0.3,
      max_tokens: input.maxTokens ?? 1024,
      ...(input.json ? { response_format: { type: 'json_object' } } : {}),
    };

    // Retry với backoff cho 429 (rate limit) / 5xx. Quota theo NGÀY thì retry không
    // cứu được — ném lỗi để service dùng fallback trích xuất.
    const maxRetries = Number(this.config.get<string>('RAGV2_CHAT_RETRIES')) || 2;
    let lastErr = '';
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        return (json.choices?.[0]?.message?.content ?? '').trim();
      }
      const txt = await res.text().catch(() => '');
      lastErr = `HTTP ${res.status} ${txt.slice(0, 160)}`;
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const waitMs = Math.min(20_000, 2_000 * 2 ** attempt);
        this.logger.warn(
          `OpenAI chat ${lastErr} — thử lại sau ${waitMs / 1000}s (lần ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      break;
    }
    throw new Error(`OpenAI chat ${lastErr}`);
  }

  async completeJson<T = unknown>(input: RagChatInput): Promise<T | null> {
    const raw = await this.complete({ ...input, json: true });
    return extractJson<T>(raw);
  }

  /**
   * TOOL-CALLING OpenAI (`/chat/completions` + `tools`): gửi hội thoại + danh
   * sách tool, model tự quyết gọi tool nào hoặc trả lời thẳng. Map AgentMessage
   * (shape trung lập) ↔ format messages của OpenAI, parse `tool_calls` ra ToolCall.
   */
  async chatWithTools(
    messages: AgentMessage[],
    tools: ToolDef[],
    opts?: { temperature?: number; maxTokens?: number },
  ): Promise<ChatToolsResult> {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (!key) {
      throw new Error('Thiếu OPENAI_API_KEY — RAG v2 (provider openai) cần khoá OpenAI.');
    }
    const url = `${this.baseUrl()}/chat/completions`;
    const body: Record<string, unknown> = {
      model: this.model,
      messages: messages.map((m) => this.toOpenAiMessage(m)),
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 1024,
      tools: tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      })),
      tool_choice: 'auto',
    };

    const maxRetries = Number(this.config.get<string>('RAGV2_CHAT_RETRIES')) || 2;
    let lastErr = '';
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: {
            finish_reason?: string;
            message?: {
              content?: string;
              tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[];
            };
          }[];
        };
        const choice = json.choices?.[0];
        const msg = choice?.message;
        const toolCalls: ToolCall[] = (msg?.tool_calls ?? []).map((tc, i) => ({
          id: tc.id || `call_${i}`,
          name: tc.function?.name ?? '',
          arguments: safeJsonArgs(tc.function?.arguments),
        }));
        return {
          toolCalls,
          content: (msg?.content ?? '').trim(),
          finishReason: choice?.finish_reason,
        };
      }
      const txt = await res.text().catch(() => '');
      lastErr = `HTTP ${res.status} ${txt.slice(0, 160)}`;
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const waitMs = Math.min(20_000, 2_000 * 2 ** attempt);
        this.logger.warn(
          `OpenAI tools ${lastErr} — thử lại sau ${waitMs / 1000}s (lần ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      break;
    }
    throw new Error(`OpenAI tools ${lastErr}`);
  }

  /** Map AgentMessage (trung lập) → 1 message theo format OpenAI. */
  private toOpenAiMessage(m: AgentMessage): Record<string, unknown> {
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.toolCallId, content: m.content ?? '' };
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'assistant',
        content: m.content ?? '',
        tool_calls: m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      };
    }
    return { role: m.role, content: m.content ?? '' };
  }
}

/** Parse chuỗi arguments JSON của tool_call; trả {} nếu rỗng/lỗi (không ném). */
function safeJsonArgs(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
