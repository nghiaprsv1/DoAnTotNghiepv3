/**
 * Sparse retrieval (BM25) thuần Node cho RAG v2 — bổ trợ cho dense (cosine).
 *
 * Vì sao cần: embedding (dense) khớp theo NGỮ NGHĨA nhưng đôi khi bỏ sót khi câu
 * hỏi chứa từ khoá hiếm / tên riêng / mã số mà model embedding "làm mượt" đi.
 * BM25 khớp theo TỪ KHOÁ (lexical) nên bắt đúng những trường hợp đó. Kết hợp cả
 * hai (hybrid search) cho recall tốt hơn hẳn dùng riêng một loại.
 *
 * Triển khai brute-force trên toàn bộ chunk — phù hợp quy mô nhỏ của đồ án,
 * không cần Elasticsearch hay extension Postgres.
 */

/** Stopword tiếng Việt + Anh phổ biến — loại để token mang nghĩa nổi lên. */
const STOPWORDS = new Set([
  'và', 'là', 'của', 'có', 'cho', 'các', 'những', 'một', 'được', 'khi', 'để',
  'với', 'trong', 'ở', 'tại', 'này', 'đó', 'đã', 'sẽ', 'thì', 'mà', 'như',
  'nên', 'hay', 'hoặc', 'nếu', 'vì', 'do', 'bởi', 'từ', 'đến', 'ra', 'vào',
  'lên', 'xuống', 'tôi', 'bạn', 'mình', 'chúng', 'ta', 'họ', 'nó', 'gì', 'sao',
  'làm', 'thế', 'nào', 'bao', 'nhiêu', 'không', 'cần', 'phải', 'rất', 'cũng',
  'the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'on', 'for', 'and', 'or',
  'how', 'what', 'do', 'i', 'you', 'can', 'with',
]);

/**
 * Tách token tiếng Việt đơn giản: hạ chữ thường, bỏ dấu câu, tách theo khoảng
 * trắng, bỏ stopword + token quá ngắn. Giữ nguyên dấu tiếng Việt (không bỏ dấu)
 * để "núi" ≠ "nui" — khớp chính xác hơn cho tài liệu tiếng Việt có dấu.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // bỏ dấu câu, giữ chữ + số (mọi ngôn ngữ)
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

/** Một tài liệu đã token hoá, kèm độ dài (số token) để BM25 chuẩn hoá. */
export interface LexicalDoc {
  id: string;
  tokens: string[];
  length: number;
}

export interface LexicalHit {
  id: string;
  score: number;
}

/**
 * Chấm điểm BM25 cho query trên tập tài liệu. Trả về điểm theo từng doc id
 * (kể cả 0) để bên gọi tự xếp hạng / hợp nhất.
 *
 * BM25: score = Σ_term IDF(term) · (tf·(k1+1)) / (tf + k1·(1 - b + b·|d|/avgdl))
 *   k1 (1.2–2.0) điều tiết bão hoà tần suất; b (~0.75) điều tiết chuẩn hoá độ dài.
 */
export function bm25Scores(
  query: string,
  docs: LexicalDoc[],
  opts: { k1?: number; b?: number } = {},
): Map<string, number> {
  const k1 = opts.k1 ?? 1.5;
  const b = opts.b ?? 0.75;
  const N = docs.length;
  const scores = new Map<string, number>();
  if (N === 0) return scores;

  const avgdl = docs.reduce((s, d) => s + d.length, 0) / N || 1;

  // Document frequency: số doc chứa mỗi term.
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const term of new Set(d.tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1);
    }
  }

  const qTerms = [...new Set(tokenize(query))];

  for (const d of docs) {
    // Tần suất term trong doc này.
    const tf = new Map<string, number>();
    for (const t of d.tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of qTerms) {
      const f = tf.get(term);
      if (!f) continue;
      const n = df.get(term) ?? 0;
      // IDF dạng BM25 (Robertson) — cộng 1 để luôn không âm.
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      const denom = f + k1 * (1 - b + (b * d.length) / avgdl);
      score += idf * ((f * (k1 + 1)) / denom);
    }
    scores.set(d.id, score);
  }
  return scores;
}
