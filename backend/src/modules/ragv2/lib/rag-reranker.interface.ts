/**
 * Trừu tượng hoá bước RERANK (xếp hạng lại) của RAG v2.
 *
 * Trước đây rerank được làm bằng LLM (gửi cả danh sách đoạn cho mô hình sinh,
 * yêu cầu chấm điểm 0–10 dạng JSON). Cách đó tốn 1 lượt gọi LLM nữa, chậm và
 * phụ thuộc model sinh "chịu" trả đúng JSON.
 *
 * Bản này tách rerank thành 1 năng lực riêng để có thể thay bằng CROSS-ENCODER —
 * mô hình phân loại cặp (câu hỏi, đoạn) → 1 điểm liên quan duy nhất, đúng bản
 * chất reranker trong IR (information retrieval). Cross-encoder cho điểm chính
 * xác hơn bi-encoder/cosine vì nó "đọc" câu hỏi và đoạn CÙNG LÚC (full
 * cross-attention), không nén mỗi bên thành 1 vector riêng.
 *
 * Là abstract class nên đồng thời đóng vai trò DI TOKEN: module dùng factory
 * chọn implementation theo env `RAGV2_RERANK_PROVIDER` (cross-encoder | llm),
 * RagV2Service inject theo token trừu tượng — đổi cách rerank KHÔNG sửa pipeline.
 */

/** 1 cặp (truy vấn, văn bản) cần chấm điểm liên quan. */
export interface RerankPair {
  /** Câu hỏi / truy vấn người dùng. */
  query: string;
  /** Nội dung đoạn tài liệu ứng viên. */
  text: string;
}

/** Điểm 1 cặp sau khi cross-encoder chấm. */
export interface RerankScore {
  /** Vị trí trong mảng đầu vào (giữ để map ngược về ứng viên gốc). */
  index: number;
  /** Điểm liên quan đã chuẩn hoá về thang 0–10 (10 = rất liên quan). */
  score: number;
}

/**
 * Năng lực rerank: nhận câu hỏi + danh sách đoạn → trả điểm liên quan từng đoạn
 * (thang 0–10, đồng nhất với ngưỡng RAGV2_RERANK_MIN_SCORE cũ). Bên gọi tự sắp
 * xếp + cắt top-K. Trả null/empty nếu không sẵn sàng (bên gọi fallback RRF).
 */
export abstract class RagReranker {
  /** Tên provider (cross-encoder | llm) — phục vụ trace/status. */
  abstract readonly providerName: string;
  /** Tên model rerank đang dùng. */
  abstract get model(): string;
  /** Mô hình đã (hoặc có thể) sẵn sàng để chấm điểm chưa. */
  abstract isReady(): boolean;
  /**
   * Chấm điểm liên quan cho từng cặp (query, text). Trả về theo ĐÚNG thứ tự
   * index đầu vào (hoặc kèm index để map). Ném lỗi → bên gọi bắt và fallback RRF.
   */
  abstract rerank(query: string, texts: string[]): Promise<RerankScore[]>;
}
