import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Client sinh câu trả lời (generation) cho RAG v2 — ĐỘC LẬP với module ai.
 *
 * Gọi `gemini-2.0-flash` (hoặc model cấu hình qua RAGV2_CHAT_MODEL). Ở bước cuối
 * pipeline RAG, ta đưa cho model NGỮ CẢNH lấy từ vector store và yêu cầu nó chỉ
 * trả lời dựa trên ngữ cảnh đó (chống bịa).
 */
@Injectable()
export class GeminiChat {
  private readonly logger = new Logger(GeminiChat.name);

  constructor(private readonly config: ConfigService) {}

  get model(): string {
    return this.config.get<string>('RAGV2_CHAT_MODEL') || 'gemini-2.0-flash';
  }

  isReady(): boolean {
    return !!this.config.get<string>('GEMINI_API_KEY');
  }

  /** Sinh văn bản từ system + prompt. */
  async complete(input: {
    system: string;
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<string> {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key) {
      throw new Error('Thiếu GEMINI_API_KEY — RAG v2 cần khoá Gemini để sinh câu trả lời.');
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`;
    const body = {
      systemInstruction: { role: 'system', parts: [{ text: input.system }] },
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
      generationConfig: {
        temperature: input.temperature ?? 0.3,
        maxOutputTokens: input.maxTokens ?? 1024,
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
}
