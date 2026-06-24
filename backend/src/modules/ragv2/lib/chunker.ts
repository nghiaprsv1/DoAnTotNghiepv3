/**
 * Chunker — tách văn bản dài thành các chunk để embedding, theo CÂU TRỌN VẸN.
 *
 * Chiến lược (sentence-aware):
 *   1. Tách văn bản thành danh sách CÂU hoàn chỉnh (tôn trọng ranh giới đoạn,
 *      KHÔNG cắt nhầm sau số thứ tự "6." hay số thập phân "1.500").
 *   2. Gói lần lượt các câu vào một chunk cho tới khi gần đầy (maxChars).
 *   3. Overlap (gối đầu) giữa 2 chunk cũng lấy theo CÂU TRỌN — phần đầu chunk
 *      sau luôn bắt đầu từ đầu một câu, không bao giờ cắt giữa câu.
 *
 * Nhờ vậy mỗi chunk bắt đầu và kết thúc ở ranh giới câu → nội dung không bị lệch,
 * khi truy hồi (retrieve) mỗi đoạn mang trọn ý nên câu trả lời chính xác hơn.
 */

export interface ChunkOptions {
  /** Kích thước tối đa mỗi chunk (ký tự). */
  maxChars?: number;
  /** Kích thước tối thiểu trước khi "chốt" một chunk (gộp đuôi ngắn lại). */
  minChars?: number;
  /** Số ký tự gối đầu (sẽ được làm tròn lên theo CÂU trọn). */
  overlapChars?: number;
}

export interface TextChunk {
  index: number;
  content: string;
  charCount: number;
}

const DEFAULTS: Required<ChunkOptions> = {
  maxChars: 900,
  minChars: 350,
  overlapChars: 160,
};

/**
 * Tách whitespace ở vị trí ranh giới câu: sau dấu . ! ? … rồi tới khoảng trắng.
 * Dùng lookbehind đòi hỏi ký tự TRƯỚC dấu kết câu KHÔNG phải chữ số — nhờ vậy
 * "6. Di tích" (số thứ tự) hay "1.500.000" (số) KHÔNG bị tách nhầm thành câu mới.
 */
const SENTENCE_SPLIT = /(?<=[^\d\s][.!?…])\s+/u;

/** Tách 1 khối text (đã gộp dòng) thành các câu trọn vẹn. */
function splitToSentences(block: string): string[] {
  return block
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Lấy phần overlap từ cuối một chunk: gom các CÂU cuối cùng sao cho tổng độ dài
 * không vượt quá overlapChars (luôn giữ ít nhất 1 câu trọn). Trả chuỗi bắt đầu
 * từ đầu một câu.
 */
function sentenceOverlap(text: string, overlapChars: number): string {
  if (overlapChars <= 0) return '';
  const sents = splitToSentences(text);
  let acc = '';
  for (let i = sents.length - 1; i >= 0; i--) {
    const candidate = acc ? `${sents[i]} ${acc}` : sents[i];
    if (candidate.length > overlapChars && acc) break;
    acc = candidate;
  }
  return acc;
}

/**
 * Tách văn bản thành các chunk theo câu trọn vẹn, có overlap theo câu.
 * @returns danh sách chunk kèm chỉ số thứ tự.
 */
export function chunkText(raw: string, opts: ChunkOptions = {}): TextChunk[] {
  const { maxChars, minChars, overlapChars } = { ...DEFAULTS, ...opts };
  const text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) return [];

  // Tách theo đoạn (1+ dòng trống). Trong mỗi đoạn, gộp các dòng bị xuống dòng
  // mềm thành một dòng để tách câu cho chuẩn, rồi lấy các câu trọn.
  const sentences: string[] = [];
  for (const block of text.split(/\n\s*\n+/)) {
    const oneLine = block.replace(/\s*\n\s*/g, ' ').trim();
    if (oneLine) sentences.push(...splitToSentences(oneLine));
  }
  if (sentences.length === 0) return [];

  // Gói câu vào chunk; khi sắp vượt maxChars thì chốt chunk và mở chunk mới bắt
  // đầu bằng overlap (các câu cuối của chunk vừa chốt).
  const chunks: string[] = [];
  let cur = '';
  for (const s of sentences) {
    // Một câu đơn dài hơn maxChars: chốt chunk hiện tại (nếu có) rồi để câu này
    // đứng riêng — vẫn là câu trọn, không cắt giữa câu.
    if (s.length >= maxChars) {
      if (cur.trim()) chunks.push(cur.trim());
      chunks.push(s.trim());
      cur = sentenceOverlap(s, overlapChars);
      continue;
    }
    if (cur && cur.length + 1 + s.length > maxChars) {
      chunks.push(cur.trim());
      const overlap = sentenceOverlap(cur, overlapChars);
      cur = overlap ? `${overlap} ${s}` : s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur.trim()) {
    // Đuôi ngắn hơn minChars → gộp vào chunk trước để tránh chunk vụn.
    if (chunks.length && cur.trim().length < minChars) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${cur.trim()}`;
    } else {
      chunks.push(cur.trim());
    }
  }

  return chunks
    .map((c) => c.trim())
    .filter(Boolean)
    .map((content, index) => ({ index, content, charCount: content.length }));
}
