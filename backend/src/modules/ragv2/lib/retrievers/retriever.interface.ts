/**
 * Interface chung cho mọi nguồn truy hồi (Modular RAG — "Search/Retriever module").
 *
 * Mỗi nguồn dữ liệu (tài liệu vector, bảng trips, places, guides, posts…) hiện
 * thực interface này. Nhờ cùng một hợp đồng, Router chỉ việc chọn retriever nào
 * chạy, và Fusion/Context gộp kết quả đồng nhất — thêm nguồn mới = thêm 1 class,
 * KHÔNG phải sửa pipeline (đúng tinh thần "lắp ghép kiểu LEGO" của Modular RAG).
 */

/** Khoá định danh nguồn — dùng cho Router định tuyến và FE phân loại thẻ. */
export type RagSource = 'doc' | 'trip' | 'place' | 'guide' | 'post';

/** Bộ lọc Router bóc từ câu hỏi để thu hẹp truy vấn DB. */
export interface RetrieverFilters {
  /** Từ khoá tìm kiếm đã được viết lại (giàu tín hiệu hơn câu gốc). */
  search: string;
  /** Keywords rời để khớp token/tags. */
  keywords: string[];
  /** Điểm đến / khu vực nếu Router nhận ra (vd "Đà Nẵng"). */
  destination?: string;
  /** Loại hình nếu có (beach, mountain, food…). */
  category?: string;
  /** Ngân sách trần (VND) nếu user nêu. */
  maxBudget?: number;
  /** Số ngày nếu user nêu (dùng cho trip). */
  days?: number;
  /**
   * Chế độ LIỆT KÊ/DUYỆT: user muốn xem danh sách chung ("liệt kê HDV", "có
   * những chuyến nào", "tất cả địa điểm") mà KHÔNG có từ khoá lọc cụ thể.
   * Khi bật, retriever bỏ điều kiện khớp text, trả top-N theo rating/độ phổ biến.
   */
  browse?: boolean;
}

/**
 * Thẻ kết quả chuẩn hoá từ MỌI nguồn DB — FE render thành card bấm được, đồng
 * thời tóm tắt được nhồi vào ngữ cảnh cho LLM viết câu trả lời (dữ liệu THẬT).
 */
export interface RetrievedCard {
  source: RagSource;
  id: string;
  title: string;
  /** Dòng phụ ngắn (điểm đến · số ngày · giá…). */
  subtitle: string;
  /** Ảnh bìa (nếu có) cho card. */
  image?: string;
  /** Đường dẫn FE tới trang chi tiết (vd /trips/:id). */
  detailPath: string;
  /** Điểm liên quan thô (để xếp hạng nội bộ nguồn). */
  score: number;
  /** Mô tả ngắn để nhồi vào ngữ cảnh LLM (không hiển thị nguyên trên card). */
  context: string;
}

export interface RagRetriever {
  readonly source: RagSource;
  /** Truy hồi tối đa `limit` thẻ khớp filter. Phải KHÔNG ném lỗi (trả [] khi rỗng). */
  retrieve(filters: RetrieverFilters, limit: number): Promise<RetrievedCard[]>;
}

/**
 * Tách token tìm kiếm tiếng Việt: bỏ stopword du lịch + token thuần số, để cụm
 * địa danh/danh từ nổi lên. Tái dùng tinh thần matchTrips() của AI v1.
 */
const SEARCH_STOP = new Set([
  'tìm', 'chuyến', 'đi', 'du', 'lịch', 'muốn', 'có', 'nào', 'không', 'cho',
  'tôi', 'mình', 'đến', 'ở', 'tại', 'một', 'các', 'và', 'the', 'trip', 'gì',
  'ngày', 'đêm', 'tuần', 'người', 'bạn', 'giúp', 'với', 'về', 'cái', 'là',
]);

/** Lấy các token có nghĩa (>=2 ký tự, không phải stopword, không thuần số). */
export function searchTokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !SEARCH_STOP.has(w.toLowerCase()) && !/^\d+$/.test(w));
}
