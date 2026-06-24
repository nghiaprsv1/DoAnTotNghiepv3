import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Client embedding Gemini cho RAG v2 — ĐỘC LẬP với module ai hiện tại.
 *
 * Gọi REST API `text-embedding-004` (hoặc model cấu hình qua RAGV2_EMBEDDING_MODEL)
 * để biến văn bản thành vector số thực. Vector này dùng cho cả lúc index tài liệu
 * lẫn lúc embed câu hỏi, rồi so khớp bằng cosine similarity.
 */
@Injectable()
export class GeminiEmbeddings {
  private readonly logger = new Logger(GeminiEmbeddings.name);

  constructor(private readonly config: ConfigService) {}

  get model(): string {
    return this.config.get<string>('RAGV2_EMBEDDING_MODEL') || 'gemini-embedding-001';
  }

  isReady(): boolean {
    return !!this.config.get<string>('GEMINI_API_KEY');
  }

  private apiKey(): string {
    const key = this.config.get<string>('GEMINI_API_KEY');
    if (!key) {
      throw new Error(
        'Thiếu GEMINI_API_KEY — RAG v2 cần khoá Gemini để tạo embedding. Đặt biến môi trường GEMINI_API_KEY.',
      );
    }
    return key;
  }

  /** Embed 1 đoạn text → vector. taskType giúp Gemini tối ưu cho truy hồi. */
  async embed(
    text: string,
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT',
  ): Promise<number[]> {
    const key = this.apiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent?key=${key}`;
    const body = {
      model: `models/${this.model}`,
      content: { parts: [{ text }] },
      taskType,
    };

    // Free tier giới hạn rất chặt (vài request/phút) → 429 "Resource exhausted".
    // Retry với exponential backoff để ingest vẫn chạy được trên free tier.
    const maxRetries = Number(this.config.get<string>('RAGV2_EMBED_RETRIES')) || 5;
    let lastErr = '';
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as { embedding?: { values?: number[] } };
        const values = json.embedding?.values;
        if (!values?.length) throw new Error('Gemini không trả về embedding hợp lệ');
        return values;
      }
      const txt = await res.text().catch(() => '');
      lastErr = `HTTP ${res.status} ${txt.slice(0, 160)}`;
      // Chỉ retry với 429 (rate limit) hoặc 5xx (lỗi tạm thời).
      if ((res.status === 429 || res.status >= 500) && attempt < maxRetries) {
        const waitMs = Math.min(60_000, 2_000 * 2 ** attempt); // 2s,4s,8s,16s,32s
        this.logger.warn(
          `Gemini embed ${lastErr} — thử lại sau ${waitMs / 1000}s (lần ${attempt + 1}/${maxRetries})`,
        );
        await sleep(waitMs);
        continue;
      }
      break;
    }
    throw new Error(`Gemini embed ${lastErr}`);
  }

  /**
   * Embed nhiều đoạn. API Gemini hiện tại (key mới) KHÔNG hỗ trợ endpoint đồng
   * bộ `batchEmbedContents` — chỉ có `embedContent` (đơn) và `asyncBatchEmbedContent`
   * (bất đồng bộ, phức tạp). Với số chunk nhỏ của đồ án, gọi tuần tự `embed()`
   * là đủ và bền nhất. Trả về danh sách vector theo đúng thứ tự đầu vào.
   */
  async embedBatch(
    texts: string[],
    taskType: 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY' = 'RETRIEVAL_DOCUMENT',
  ): Promise<number[][]> {
    if (texts.length === 0) return [];
    // Giãn cách giữa các lần gọi để không vượt rate limit free tier.
    const gapMs = Number(this.config.get<string>('RAGV2_EMBED_GAP_MS')) || 1_200;
    const out: number[][] = [];
    for (let i = 0; i < texts.length; i++) {
      out.push(await this.embed(texts[i], taskType));
      if (i < texts.length - 1 && gapMs > 0) await sleep(gapMs);
    }
    return out;
  }
}

/** Chờ ms mili-giây. */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
