/**
 * Bộ test chatbot RAG v2 với dữ liệu địa điểm Đà Nẵng vừa nạp.
 * Gửi payload tiếng Việt UTF-8 chuẩn (tránh mojibake khi qua shell Windows).
 * Chạy: cd backend && node scripts/test-chatbot-danang.mjs
 */
const API = process.env.API_BASE || 'http://localhost:8080/api';

const CASES = [
  { q: 'Đà Nẵng có những địa điểm du lịch nào nổi tiếng?', expect: 'liệt kê nhiều place Đà Nẵng' },
  { q: 'Ở Đà Nẵng có bãi biển nào đẹp để tắm không?', expect: 'Bãi biển Mỹ Khê' },
  { q: 'Tôi muốn đi cáp treo ở Bà Nà Hills, kể cho tôi nghe', expect: 'Bà Nà Hills / Cầu Vàng' },
  { q: 'Cầu Rồng phun lửa lúc mấy giờ?', expect: 'tối cuối tuần 21h' },
  { q: 'Đà Nẵng có chỗ nào ăn uống đặc sản không?', expect: 'Chợ Cồn' },
  { q: 'Muốn tìm hiểu văn hóa Chăm Pa thì đi đâu ở Đà Nẵng?', expect: 'Bảo tàng Chăm' },
  { q: 'Giá vé vào Bà Nà Hills bao nhiêu?', expect: 'cáp treo 750.000đ (grounding entranceFee)' },
  { q: 'Lập giúp tôi lịch trình 3 ngày ở Đà Nẵng', expect: 'tạo itinerary (suggestion)' },
];

async function ask(question) {
  const res = await fetch(`${API}/rag-v2/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  if (!res.ok) return { error: `HTTP ${res.status} ${await res.text()}` };
  const j = await res.json();
  return j.data || j;
}

function tag(r) {
  const rw = (r.trace?.steps || []).find((s) => s.key === 'query_rewrite');
  const tools = (r.trace?.steps || [])
    .filter((s) => s.key === 'agent_tool')
    .flatMap((s) => (s.detail?.calls || []).map((c) => c.name));
  return {
    rewritten: rw?.detail?.rewritten,
    tools,
    cards: (r.cards || []).map((c) => `${c.title}[${c.source}]`),
    hasSuggestion: !!r.suggestion,
  };
}

async function main() {
  for (let i = 0; i < CASES.length; i++) {
    const { q, expect } = CASES[i];
    console.log('\n' + '='.repeat(78));
    console.log(`#${i + 1}  Q: ${q}`);
    console.log(`    KỲ VỌNG: ${expect}`);
    const r = await ask(q);
    if (r.error) {
      console.log('    ✗ LỖI:', r.error);
      continue;
    }
    const t = tag(r);
    console.log(`    rewrite: "${t.rewritten}"`);
    console.log(`    tools:   ${t.tools.join(' → ') || '(none)'}`);
    console.log(`    cards:   ${t.cards.join(', ') || '(0)'}`);
    console.log(`    itinerary: ${t.hasSuggestion ? 'CÓ' : 'không'}`);
    console.log(`    --- answer ---\n    ${(r.answer || '').replace(/\n/g, '\n    ')}`);
  }
}

main().catch((e) => {
  console.error('LỖI:', e.message);
  process.exit(1);
});
