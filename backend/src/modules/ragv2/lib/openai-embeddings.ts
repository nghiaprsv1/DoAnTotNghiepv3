import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RagEmbeddings, type EmbedTaskType } from './rag-llm.interface';

/**
 * Client embedding OpenAI cho RAG v2 — song song với GeminiEmbeddings, chọn qua
 * env `RAGV2_LLM_PROVIDER=openai`.
 *
 * Gọi REST API `POST {base}/embeddings` (mặc định model `text-embedding-3-small`,
 * 1536 chiều). Khác Gemini: key đặt ở header `Authorization: Bearer`, body dùng
 * `{ model, input }` (input nhận MẢNG → embed cả batch trong 1 request), kết quả
 * đọc ở `data[i].embedding`. OpenAI không có khái niệm taskType nên bỏ qua tham số.
 *
 * ⚠️ Số chiều vector OpenAI (1536) KHÁC Gemini (3072) → ĐỔI provider thì PHẢI
 * chạy lại `npm run rag:ingest` để re-embed toàn bộ chunk, nếu không cosine lệch chiều.
 */
@Injectable()
export class OpenAiEmbeddings extends RagEmbeddings {
  readonly providerName = 'openai';
  private readonly logger = new Logger(OpenAiEmbeddings.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  get model(): string {
    return this.config.get<string>('RAGV2_EMBEDDING_MODEL') || 'text-embedding-3-small';
  }

  isReady(): boolean {
    return !!this.config.get<string>('OPENAI_API_KEY');
  }

  private apiKey(): string {
    const key = this.config.get<string>('OPENAI_API_KEY');
    if (!key) {
      throw new Error(
        'Thiếu OPENAI_API_KEY — RAG v2 (provider openai) cần khoá OpenAI để tạo embedding.',
      );
    }
    return key;
  }

  /** Base URL OpenAI — đổi sang proxy tương thích qua OPENAI_BASE_URL (vd https://api.openai.com/v1). */
  private baseUrl(): string {
    return (this.config.get<string>('OPENAI_BASE_URL') || 'https://api.openai.com/v1').replace(
      /\/+$/,
      '',
    );
  }

  /** Embed 1 đoạn → tận dụng embedBatch (OpenAI gộp được nhiều input/1 call). */
  async embed(text: string, _taskType: EmbedTaskType = 'RETRIEVAL_DOCUMENT'): Promise<number[]> {
    const [vec] = await this.embedBatch([text]);
    if (!vec?.length) throw new Error('OpenAI không trả về embedding hợp lệ');
    return vec;
  }

  /**
   * Embed nhiều đoạn. OpenAI cho phép gửi cả mảng `input` trong 1 request → nhanh
   * và ít tốn quota hơn Gemini (phải gọi tuần tự). Vẫn cắt theb batch nhỏ để tránh
   * vượt giới hạn payload, và retry 429/5xx với backoff.
   */
  async embedBatch(
    texts: string[],
    _taskType: EmbedTaskType = 'RETRIEVAL_DOCUMENT',
  ): Promise<number[][]> {
    if (texts.length === 0) return [];
    const key = this.apiKey();
    const url = `${this.baseUrl()}/embeddings`;
    const batchSize = Number(this.config.get<string>('RAGV2_EMBED_BATCH')) || 64;
    const maxRetries = Number(this.config.get<string>('RAGV2_EMBED_RETRIES')) || 5;

    const out: number[][] = [];
    for (let start = 0; start < texts.length; start += batchSize) {
      const slice = texts.slice(start, start + batchSize);
      const vectors = await this.embedSlice(url, key, slice, maxRetries);
      out.push(...vectors);
    }
    return out;
  }

  /** Gọi 1 batch + retry. Trả vector đúng thứ tự (sort theo data[].index cho chắc). */
  private async embedSlice(
    url: string,
    key: string,
    inputs: string[],
    maxRetries: number,
  ): Promise<number[][]> {
    const body = { model: this.model, input: inputs };
    let lastErr = '';
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          data?: { embedding?: number[]; index?: number }[];
        };
        const data = json.data ?? [];
        if (data.length !== inputs.length) {
          throw new Error(`OpenAI trả ${data.length} embedding, cần ${inputs.length}`);
        }
        // Sắp theo index để khớp đúng thứ tự input.
        return [...data]
          .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
          .map((d) => d.embedding ?? []);
      }
      const txt = await res.text().catch(() => '');
      lastErr = `HTTP ${res.status} ${txt.slice(0, 160)}`;
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const waitMs = Math.min(60_000, 2_000 * 2 ** attempt);
        this.logger.warn(
          `OpenAI embed ${lastErr} — thử lại sau ${waitMs / 1000}s (lần ${attempt + 1}/${maxRetries})`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      break;
    }
    throw new Error(`OpenAI embed ${lastErr}`);
  }
}
