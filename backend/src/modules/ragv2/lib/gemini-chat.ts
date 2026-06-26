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
 * Client sinh câu trả lời (generation) cho RAG v2 — ĐỘC LẬP với module ai.
 *
 * Gọi `gemini-2.0-flash` (hoặc model cấu hình qua RAGV2_CHAT_MODEL). Ở bước cuối
 * pipeline RAG, ta đưa cho model NGỮ CẢNH lấy từ vector store và yêu cầu nó chỉ
 * trả lời dựa trên ngữ cảnh đó (chống bịa).
 *
 * Implement RagChat để chạy song song bản OpenAI (chọn qua RAGV2_LLM_PROVIDER).
 */
@Injectable()
export class GeminiChat extends RagChat {
  readonly providerName = 'gemini';
  private readonly logger = new Logger(GeminiChat.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  get model(): string {
    return this.config.get<string>('RAGV2_CHAT_MODEL') || 'gemini-2.0-flash';
  }

  isReady(): boolean {
    return !!this.config.get<string>('GEMINI_API_KEY');
  }

  /** Sinh văn bản từ system + prompt. */
  async complete(input: RagChatInput): Promise<string> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key) {
      throw new Error('Thiếu GEMINI_API_KEY — RAG v2 cần khoá Gemini để sinh câu trả lời.');
    }
    // Base URL có thể đổi sang proxy bên thứ 3 rẻ hơn qua env GEMINI_BASE_URL
    // (vd https://v98store.com/v1beta). Mặc định endpoint chính thức của Google.
    const base = (
      this.config.get<string>('GEMINI_BASE_URL') ||
      'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');
    const url = `${base}/models/${this.model}:generateContent?key=${key}`;
    // Gemini 2.5 là thinking model: token suy luận ăn vào maxOutputTokens → câu
    // trả lời dễ rỗng/cụt → rơi vào extractive_fallback. Tắt thinking (budget 0)
    // để dồn token cho câu trả lời. Chỉ áp dụng cho 2.5 (2.0 không có tham số này).
    const isThinkingModel = /2\.5/.test(this.model);
    const thinkingBudget = Number(this.config.get<string>('GEMINI_THINKING_BUDGET') ?? 0);
    const body = {
      systemInstruction: { role: 'system', parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: input.temperature ?? 0.3,
        maxOutputTokens: input.maxTokens ?? 1024,
        ...(input.json ? { responseMimeType: 'application/json' } : {}),
        ...(isThinkingModel ? { thinkingConfig: { thinkingBudget } } : {}),
      },
    };

    // Retry với backoff cho 429 (rate limit theo phút) / 5xx. Quota theo NGÀY thì
    // retry không cứu được — sẽ ném lỗi để service dùng fallback trích xuất.
    const maxRetries = Number(this.config.get<string>('RAGV2_CHAT_RETRIES')) || 2;
    let lastErr = '';
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text =
          json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
        return text.trim();
      }
      const txt = await res.text().catch(() => '');
      lastErr = `HTTP ${res.status} ${txt.slice(0, 160)}`;
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const waitMs = Math.min(20_000, 2_000 * 2 ** attempt);
        this.logger.warn(
          `Gemini chat ${lastErr} — thử lại sau ${waitMs / 1000}s (lần ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      break;
    }
    throw new Error(`Gemini chat ${lastErr}`);
  }

  /**
   * Gọi Gemini ở chế độ JSON rồi parse an toàn (bóc khối {…}/[…] đầu tiên nếu
   * model lỡ bọc text/```). Trả null khi không parse được — bên gọi tự fallback.
   */
  async completeJson<T = unknown>(input: RagChatInput): Promise<T | null> {
    const raw = await this.complete({ ...input, json: true });
    return extractJson<T>(raw);
  }

  /**
   * TOOL-CALLING Gemini (function calling): khác OpenAI ở chỗ tools nằm trong
   * `tools[0].functionDeclarations`, lịch sử là `contents[{role,parts}]`, lời gọi
   * tool là part `functionCall {name,args}`, kết quả nhồi lại là part
   * `functionResponse {name,response}`. Map AgentMessage ↔ format Gemini.
   * Gemini không cấp id cho call → tự sinh id theo tên để map về AgentMessage.
   */
  async chatWithTools(
    messages: AgentMessage[],
    tools: ToolDef[],
    opts?: { temperature?: number; maxTokens?: number },
  ): Promise<ChatToolsResult> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key) throw new Error('Thiếu GEMINI_API_KEY — RAG v2 cần khoá Gemini.');
    const base = (
      this.config.get<string>('GEMINI_BASE_URL') ||
      'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');
    const url = `${base}/models/${this.model}:generateContent?key=${key}`;
    const isThinkingModel = /2\.5/.test(this.model);
    const thinkingBudget = Number(this.config.get<string>('GEMINI_THINKING_BUDGET') ?? 0);

    const body = {
      contents: messages.map((m) => this.toGeminiContent(m)),
      tools: [
        {
          functionDeclarations: tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ],
      generationConfig: {
        temperature: opts?.temperature ?? 0.3,
        maxOutputTokens: opts?.maxTokens ?? 1024,
        ...(isThinkingModel ? { thinkingConfig: { thinkingBudget } } : {}),
      },
    };

    const maxRetries = Number(this.config.get<string>('RAGV2_CHAT_RETRIES')) || 2;
    let lastErr = '';
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          candidates?: {
            finishReason?: string;
            content?: {
              parts?: {
                text?: string;
                functionCall?: { name?: string; args?: Record<string, unknown> };
              }[];
            };
          }[];
        };
        const cand = json.candidates?.[0];
        const parts = cand?.content?.parts ?? [];
        const toolCalls: ToolCall[] = [];
        let content = '';
        parts.forEach((p, i) => {
          if (p.functionCall?.name) {
            toolCalls.push({
              id: `${p.functionCall.name}_${i}`,
              name: p.functionCall.name,
              arguments: p.functionCall.args ?? {},
            });
          } else if (p.text) {
            content += p.text;
          }
        });
        return { toolCalls, content: content.trim(), finishReason: cand?.finishReason };
      }
      const txt = await res.text().catch(() => '');
      lastErr = `HTTP ${res.status} ${txt.slice(0, 160)}`;
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const waitMs = Math.min(20_000, 2_000 * 2 ** attempt);
        this.logger.warn(
          `Gemini tools ${lastErr} — thử lại sau ${waitMs / 1000}s (lần ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      break;
    }
    throw new Error(`Gemini tools ${lastErr}`);
  }

  /** Map AgentMessage (trung lập) → 1 content theo format Gemini. */
  private toGeminiContent(m: AgentMessage): Record<string, unknown> {
    if (m.role === 'tool') {
      return {
        role: 'user', // Gemini coi functionResponse như input từ phía user.
        parts: [
          {
            functionResponse: {
              name: m.name ?? '',
              response: { result: m.content ?? '' },
            },
          },
        ],
      };
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      return {
        role: 'model',
        parts: m.toolCalls.map((tc) => ({
          functionCall: { name: tc.name, args: tc.arguments },
        })),
      };
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content ?? '' }],
    };
  }
}
