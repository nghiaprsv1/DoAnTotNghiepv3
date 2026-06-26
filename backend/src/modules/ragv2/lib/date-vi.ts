/**
 * Bóc & xử lý ngày tiếng Việt cho RAG v2 — ĐỘC LẬP với module ai.
 *
 * Hỗ trợ các cách người dùng nêu ngày khi tạo/chỉnh lộ trình:
 *   "từ 20/12 đến 23/12", "khởi hành 25/12", "ngày 2 tháng 9", "20/12/2026".
 * Năm trống → mặc định năm hiện tại; nếu ngày đã qua thì +1 năm (không tạo
 * chuyến trong quá khứ).
 */

/** Ghép d/m/y → ISO (yyyy-mm-dd). Trả null nếu vô lý. */
export function parseVnDate(
  d: string,
  m: string,
  y?: string,
  now: Date = new Date(),
): string | null {
  const day = Number(d);
  const month = Number(m);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');

  if (y) {
    let year = Number(y);
    if (year < 100) year += 2000; // "26" → 2026
    return `${year}-${mm}-${dd}`;
  }

  // Không có năm → năm hiện tại; nếu đã qua thì +1 năm.
  const curYear = now.getFullYear();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const candidate = new Date(curYear, month - 1, day).getTime();
  const year = candidate < todayMid ? curYear + 1 : curYear;
  return `${year}-${mm}-${dd}`;
}

/**
 * Bóc tất cả ngày trong câu (theo thứ tự xuất hiện). Nhận dạng:
 *   dd/mm[/yyyy] (cả - .) và "ngày D tháng M [năm Y]".
 */
export function extractDates(query: string, now: Date = new Date()): string[] {
  const q = query.toLowerCase();
  const found: { pos: number; iso: string }[] = [];

  // dd/mm[/yyyy] — năm chỉ nhận khi cùng dấu phân tách (\2) với d/m.
  for (const mt of q.matchAll(/(\d{1,2})\s*([/\-.])\s*(\d{1,2})(?:\s*\2\s*(\d{2,4}))?/g)) {
    const iso = parseVnDate(mt[1], mt[3], mt[4], now);
    if (iso) found.push({ pos: mt.index ?? 0, iso });
  }
  // "ngày D tháng M [năm Y]"
  for (const mt of q.matchAll(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+(\d{4}))?/g)) {
    const iso = parseVnDate(mt[1], mt[2], mt[3], now);
    if (iso) found.push({ pos: mt.index ?? 0, iso });
  }

  return found.sort((a, b) => a.pos - b.pos).map((f) => f.iso);
}

/** Cộng n ngày vào 1 ngày ISO. */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Số ngày bao gồm cả 2 đầu mút (inclusive). */
export function daysBetween(startIso: string, endIso: string): number {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  return Math.floor((b - a) / 86_400_000) + 1;
}

/**
 * Chuẩn hoá cặp (startDate, endDate, durationDays) cho nhất quán:
 *  - có start + days, thiếu end → suy end = start + (days-1).
 *  - có cả start + end → tính lại days theo 2 mốc.
 * Trả về object mới (không sửa input).
 */
export function reconcileDates(input: {
  startDate?: string;
  endDate?: string;
  durationDays?: number;
}): { startDate?: string; endDate?: string; durationDays?: number } {
  let { startDate, endDate, durationDays } = input;
  if (startDate && !endDate && durationDays && durationDays > 0) {
    endDate = addDaysIso(startDate, durationDays - 1);
  }
  if (startDate && endDate) {
    const d = daysBetween(startDate, endDate);
    if (d > 0) durationDays = d;
  }
  return { startDate, endDate, durationDays };
}
