/**
 * Cosine similarity thuần Node cho vector store RAG v2.
 * Dùng brute-force trên toàn bộ chunk — phù hợp số lượng chunk nhỏ của đồ án,
 * không cần cài extension pgvector vào Postgres.
 */

/** Tích vô hướng 2 vector cùng chiều. */
export function dot(a: number[], b: number[]): number {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

/** Độ dài (norm) của vector. */
export function magnitude(a: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}

/**
 * Cosine similarity ∈ [-1, 1]. Trả 0 nếu một trong hai vector rỗng/độ dài 0
 * để tránh chia cho 0.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  const ma = magnitude(a);
  const mb = magnitude(b);
  if (ma === 0 || mb === 0) return 0;
  return dot(a, b) / (ma * mb);
}
