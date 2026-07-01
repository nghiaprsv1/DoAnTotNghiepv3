import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RagChat } from './rag-llm.interface';
import { RagReranker, RerankScore } from './rag-reranker.interface';

/**
 * Reranker dùng LLM (cách CŨ) — GIỮ LẠI để chạy luân phiên và so sánh với
 * cross-encoder trong báo cáo. Gửi cả danh sách đoạn cho model sinh, yêu cầu
 * chấm điểm 0–10 dạng JSON. Chọn bằng env `RAGV2_RERANK_PROVIDER=llm`.
 *
 * Tốn 1 lượt gọi LLM, chậm hơn cross-encoder local và phụ thuộc model "chịu"
 * trả đúng JSON — nhưng tận dụng được hiểu biết ngữ nghĩa rộng của LLM.
 */
@Injectable()
export class LlmReranker extends RagReranker {
  readonly providerName = 'llm';
  private readonly logger = new Logger(LlmReranker.name);

  constructor(
    private readonly chat: RagChat,
    private readonly config: ConfigService,
  ) {
    super();
  }

  get model(): string {
    return this.chat.model;
  }

  isReady(): boolean {
    return this.chat.isReady();
  }

  async rerank(query: string, texts: string[]): Promise<RerankScore[]> {
    if (texts.length === 0) return [];
    // Đánh số đoạn để LLM tham chiếu bằng index (ngắn gọn, ít token).
    const list = texts.map((t, i) => `[${i}] ${t.slice(0, 400)}`).join('\n\n');
    const system = `Bạn là bộ xếp hạng độ liên quan cho RAG. Cho CÂU HỎI và danh sách ĐOẠN
được đánh số. Chấm mỗi đoạn điểm liên quan 0-10 (10 = trả lời trực tiếp câu hỏi,
0 = không liên quan). TRẢ VỀ DUY NHẤT JSON:
{"ranked":[{"index":<số>,"score":<0-10>}]}
Chỉ chấm theo nội dung đoạn, không bịa. Sắp theo score giảm dần.`;
    const parsed = await this.chat.completeJson<{
      ranked?: { index?: number; score?: number }[];
    }>({
      system,
      prompt: `CÂU HỎI: ${query}\n\nCÁC ĐOẠN:\n${list}`,
      temperature: 0.1,
      maxTokens: 1024,
    });

    const ranked = parsed?.ranked;
    if (!Array.isArray(ranked) || !ranked.length) {
      this.logger.warn('LLM rerank không trả JSON hợp lệ — trả mảng rỗng để fallback RRF.');
      return [];
    }
    return ranked
      .filter((r) => typeof r.index === 'number' && r.index! >= 0 && r.index! < texts.length)
      .map((r) => ({ index: r.index!, score: Number(r.score) || 0 }));
  }
}
