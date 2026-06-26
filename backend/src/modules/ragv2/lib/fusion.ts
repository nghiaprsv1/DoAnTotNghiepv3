/**
 * Reciprocal Rank Fusion (RRF) — hợp nhất nhiều bảng xếp hạng thành một.
 *
 * Bài toán hybrid search: dense (cosine) và sparse (BM25) cho ra hai danh sách
 * xếp hạng với THANG ĐIỂM KHÁC NHAU (cosine ∈ [-1,1], BM25 ∈ [0,∞)). Cộng thẳng
 * điểm là sai. RRF bỏ qua giá trị điểm, chỉ dùng THỨ HẠNG (rank) của mỗi item
 * trong từng danh sách:
 *
 *   RRF(item) = Σ_list  1 / (k + rank_list(item))
 *
 * k (mặc định 60, theo Cormack 2009) làm dịu ảnh hưởng của vài hạng đầu. Item
 * xuất hiện ở hạng cao trong NHIỀU danh sách sẽ có điểm hợp nhất cao nhất.
 */

export interface FusedItem {
  id: string;
  /** Điểm RRF tổng hợp. */
  rrf: number;
  /** Thứ hạng trong từng danh sách (1-based); undefined nếu không xuất hiện. */
  ranks: Record<string, number | undefined>;
}

/**
 * @param rankings  map tên-danh-sách → mảng id ĐÃ xếp hạng (tốt nhất trước).
 * @param k         hằng số RRF (mặc định 60).
 * @returns         mảng FusedItem sắp theo rrf giảm dần.
 */
export function reciprocalRankFusion(
  rankings: Record<string, string[]>,
  k = 60,
): FusedItem[] {
  const acc = new Map<string, FusedItem>();
  const listNames = Object.keys(rankings);

  for (const name of listNames) {
    rankings[name].forEach((id, idx) => {
      const rank = idx + 1; // 1-based
      let item = acc.get(id);
      if (!item) {
        item = { id, rrf: 0, ranks: {} };
        // Khởi tạo tất cả list = undefined để trace hiển thị rõ "không có mặt".
        for (const n of listNames) item.ranks[n] = undefined;
        acc.set(id, item);
      }
      item.ranks[name] = rank;
      item.rrf += 1 / (k + rank);
    });
  }

  return [...acc.values()].sort((a, b) => b.rrf - a.rrf);
}
