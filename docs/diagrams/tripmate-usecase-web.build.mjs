// TripMate — Trang web Sơ đồ Use Case (theo danh sách use case do người dùng cung cấp).
// Sinh docs/so-do-usecase.html: SVG UML tự layout (2 cột use case + actor 2 bên,
// link "All"/kế thừa định tuyến qua máng trống phía trên → KHÔNG cắt nhau)
// + bảng use case ↔ actor ↔ endpoint REST thật (đọc từ controller NestJS).
// Chạy: node docs/diagrams/tripmate-usecase-web.build.mjs
import { writeFileSync } from 'node:fs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ───────── DANH SÁCH USE CASE (đúng theo bảng người dùng đưa) ─────────
   id, tên hiển thị (xuống dòng = \n), nhãn actor, endpoint[] */
const ALL = [
  ['register', 'Đăng ký\ntài khoản', 'All', ['POST /auth/register', 'POST /auth/verify-email', 'POST /auth/resend-verification']],
  ['login', 'Đăng nhập', 'All', ['POST /auth/login', 'POST /auth/refresh', 'POST /auth/logout']],
];
const TRAVELER = [
  ['profile', 'Quản lý hồ sơ\ncá nhân', 'Traveler', ['GET /auth/profile', 'PUT /users/me', 'PUT /auth/password', 'GET·PUT /users/me/preferences']],
  ['post', 'Quản lý\nbài viết', 'Traveler', ['POST·PUT·DELETE /posts/:id', 'POST /posts/:id/like', 'POST /posts/:id/comments']],
  ['trip', 'Quản lý\nchuyến đi', 'Traveler / Owner', ['POST·PUT·DELETE /trips/:id', 'POST /trips/:id/cancel', 'PUT /trips/:id/itinerary', 'GET /trips/mine/created|joined']],
  ['join', 'Gửi yêu cầu\ntham gia', 'Traveler', ['POST /trips/:id/join', 'POST /trips/:id/leave']],
  ['approveJoin', 'Duyệt / từ chối\nyêu cầu tham gia', 'Owner Trip', ['POST /trips/:id/requests/:reqId/accept', 'POST /trips/:id/requests/:reqId/reject', 'DELETE /trips/:id/members/:userId']],
  ['chatroom', 'Chat room', 'Member Trip', ['GET /messages/trip/:tripId', 'POST /messages/:id/messages', 'GET /messages/:id/messages']],
  ['findGuide', 'Tìm kiếm\nhướng dẫn viên', 'Traveler', ['GET /guides', 'GET /guides/:id', 'GET /guides/:id/busy-dates']],
  ['bookGuide', 'Book HDV\ncho Tour', 'Owner Trip', ['POST /guides/bookings', 'POST /trips/:id/hire-guide', 'GET /guides/bookings/me/traveler']],
  ['applyGuide', 'Đăng ký làm\nhướng dẫn viên', 'Traveler', ['POST /guides/apply', 'GET·PUT /guides/me/profile']],
  ['history', 'Kiểm tra lịch sử\ngiao dịch', 'Traveler', ['GET /guides/wallet/me']],
  ['topup', 'Nạp tiền', 'Traveler', ['POST /payments/sepay/intent', 'POST /payments/sepay/webhook']],
  ['review', 'Đánh giá', 'Traveler', ['POST /reviews', 'GET /reviews', 'POST /reviews/:id/like', 'DELETE /reviews/:id']],
  ['chatai', 'Chat AI', 'Traveler / Guide', ['POST /rag-v2/ask', 'POST /ai/ask', 'POST /ai/create-trip']],
];
const GUIDE = [
  ['gBooking', 'Quản lý\nbooking', 'Guide', ['PUT /guides/bookings/:id', 'GET /guides/bookings/me/guide', 'GET /guides/bookings/:id']],
  ['gRevenue', 'Quản lý doanh\nthu cá nhân', 'Guide', ['GET /guides/wallet/me']],
  ['gBusy', 'Quản lý\nlịch bận', 'Guide', ['GET /guides/:id/busy-dates', 'PUT /guides/bookings/:id']],
  ['gWithdraw', 'Rút tiền', 'Guide', ['POST /guides/wallet/withdrawals']],
];
const ADMIN = [
  ['aStats', 'Thống kê\ntổng quan', 'Admin', ['GET /admin/dashboard', 'GET /admin/stats/registrations']],
  ['aApproveGuide', 'Duyệt hướng\ndẫn viên', 'Admin', ['GET /admin/guides/pending', 'POST /guides/:id/approve', 'POST /guides/:id/reject']],
  ['aApproveWithdraw', 'Duyệt rút tiền', 'Admin', ['GET /guides/wallet/withdrawals/pending', 'PUT /guides/wallet/withdrawals/:id']],
  ['aLock', 'Khoá / mở\nkhoá user', 'Admin', ['GET /admin/users', 'POST /admin/users/:id/lock', 'POST /admin/users/:id/unlock']],
  ['aRevenue', 'Quản lý\ndoanh thu', 'Admin', ['GET /admin/revenue', 'GET /admin/guides/:id/revenue', 'GET /admin/wallets', 'POST /admin/wallets/topup']],
];

/* ───────────────────────── LAYOUT (toạ độ tự tính) ─────────────────────────
   Chiến lược chống chồng chéo:
   • Dùng generalization Guide ▷ Traveler → Guide kế thừa toàn bộ case của
     Traveler (register, login, chat AI…), KHỎI vẽ lại các đường đó.
   • Cột TRÁI = 15 case của Traveler (gồm register/login/chatai) → quạt từ
     actor Traveler (trái). Cột PHẢI = 4 case Guide (trên) + 5 case Admin (dưới)
     → 2 quạt riêng từ actor Guide & Admin (phải), tách nhau theo chiều dọc.
   • Chỉ còn 2 đường "dài" (Admin → register/login) + 1 generalization → định
     tuyến vuông góc qua MÁNG BUS phía trên, mỗi đường 1 lane y riêng, điểm
     lên/xuống nằm NGOÀI dải case → không cắt quạt nào. */
const E_W = 174, E_H = 54, V_PITCH = 72, ACT_W = 46, ACT_H = 96;
const CASES_TOP = 92;            // tâm hàng đầu = CASES_TOP + E_H/2
const CX_L = 380;                // cột case Traveler (trái)
const CX_R = 880;                // cột case Guide + Admin (phải)
const GUIDE_GAP_ROWS = 1;        // hàng trống ngăn cách khối Guide ↔ Admin

// Thứ tự cột trái: register, login, rồi 13 case Traveler.
const LEFT = ALL.concat(TRAVELER);
const leftCy = LEFT.map((_, i) => CASES_TOP + E_H / 2 + i * V_PITCH);

const guideCy = GUIDE.map((_, i) => CASES_TOP + E_H / 2 + i * V_PITCH);
const adRow0 = GUIDE.length + GUIDE_GAP_ROWS;
const adminCy = ADMIN.map((_, i) => CASES_TOP + E_H / 2 + (adRow0 + i) * V_PITCH);

const pos = {};
LEFT.forEach((u, i) => { pos[u[0]] = { cx: CX_L, cy: leftCy[i] }; });
GUIDE.forEach((u, i) => { pos[u[0]] = { cx: CX_R, cy: guideCy[i] }; });
ADMIN.forEach((u, i) => { pos[u[0]] = { cx: CX_R, cy: adminCy[i] }; });

// Actor (acx = tâm ngang, cy = tâm dọc).
const travelerA = { acx: 150, cy: (leftCy[0] + leftCy[leftCy.length - 1]) / 2, label: 'Traveler\n(Du khách)' };
const guideA = { acx: CX_R + E_W / 2 + 140, cy: (guideCy[0] + guideCy[guideCy.length - 1]) / 2, label: 'Guide\n(Hướng dẫn viên)' };
const adminA = { acx: CX_R + E_W / 2 + 210, cy: (adminCy[0] + adminCy[adminCy.length - 1]) / 2, label: 'Admin\n(Quản trị viên)' };

// Lane bus phía trên dành cho generalization (đặt trong VẼ SVG: TOP_BUS).

const PW = adminA.acx + ACT_W / 2 + 70;
const bottomCy = Math.max(leftCy[leftCy.length - 1], adminCy[adminCy.length - 1]);
const PH = bottomCy + E_H / 2 + 78; // chừa chỗ cho máng bus dưới + nhãn

/* ───────────────────────── VẼ SVG ───────────────────────── */
const svg = [];
const wrapText = (label, cx, cy, fs, fill, weight) => {
  const lines = String(label).split('\n');
  const lh = fs * 1.18;
  const y0 = cy - ((lines.length - 1) * lh) / 2;
  return lines.map((ln, i) =>
    `<text x="${cx}" y="${(y0 + i * lh).toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" fill="${fill}" font-weight="${weight || 400}" font-family="Inter, sans-serif">${esc(ln)}</text>`
  ).join('');
};

const drawActor = (a, color) => {
  const cx = a.acx, top = a.cy - ACT_H / 2;
  const headR = 12, headY = top + headR;
  const bodyY1 = headY + headR, bodyY2 = bodyY1 + 30, armY = bodyY1 + 9, legY = bodyY2 + 26, lblY = legY + 20;
  return `<g>
    <circle cx="${cx}" cy="${headY}" r="${headR}" fill="#fff" stroke="${color}" stroke-width="2.2"/>
    <line x1="${cx}" y1="${bodyY1}" x2="${cx}" y2="${bodyY2}" stroke="${color}" stroke-width="2.2"/>
    <line x1="${cx - 18}" y1="${armY}" x2="${cx + 18}" y2="${armY}" stroke="${color}" stroke-width="2.2"/>
    <line x1="${cx}" y1="${bodyY2}" x2="${cx - 15}" y2="${legY}" stroke="${color}" stroke-width="2.2"/>
    <line x1="${cx}" y1="${bodyY2}" x2="${cx + 15}" y2="${legY}" stroke="${color}" stroke-width="2.2"/>
    ${wrapText(a.label, cx, lblY, 12.5, '#1A1A1A', 700)}
  </g>`;
};

const ellipse = (id, label, kind) => {
  const u = pos[id];
  const fill = kind === 'all' ? '#FFF7ED' : kind === 'guide' ? '#E8F6F8' : kind === 'admin' ? '#FBE9F3' : '#FFFFFF';
  const stroke = kind === 'all' ? '#C2410C' : kind === 'guide' ? '#3A8A93' : kind === 'admin' ? '#A23E78' : '#5A6B7B';
  return `<ellipse cx="${u.cx}" cy="${u.cy}" rx="${E_W / 2}" ry="${E_H / 2}" fill="${fill}" stroke="${stroke}" stroke-width="1.3"/>${wrapText(label, u.cx, u.cy, 11.5, '#1A1A1A', 600)}`;
};

// điểm mép ellipse theo hướng
const edgeL = (id) => ({ x: pos[id].cx - E_W / 2, y: pos[id].cy });
const edgeR = (id) => ({ x: pos[id].cx + E_W / 2, y: pos[id].cy });
const edgeT = (id) => ({ x: pos[id].cx, y: pos[id].cy - E_H / 2 });

// association quạt (đường thẳng từ actor đến mép gần nhất)
const ASSOC = (color) => `fill="none" stroke="${color}" stroke-width="1.15" opacity="0.6"`;
const fanFromRight = (a, ids, color) => {
  const fx = a.acx - ACT_W / 2 - 2, fy = a.cy; // mép trái của actor (actor nằm bên phải case)
  ids.forEach((id) => {
    const e = edgeR(id);
    svg.push(`<path d="M ${e.x} ${e.y} L ${fx} ${fy}" ${ASSOC(color)}/>`);
  });
};
const fanFromLeftActor = (a, ids, color) => {
  const fx = a.acx + ACT_W / 2 + 2, fy = a.cy; // mép phải của actor (actor nằm bên trái case)
  ids.forEach((id) => {
    const e = edgeL(id);
    svg.push(`<path d="M ${fx} ${fy} L ${e.x} ${e.y}" ${ASSOC(color)}/>`);
  });
};

// ── Association quạt (mỗi actor một quạt riêng, không cắt nhau) ──
fanFromLeftActor(travelerA, LEFT.map((u) => u[0]), '#C0612F'); // Traveler → 15 case cột trái
fanFromRight(guideA, GUIDE.map((u) => u[0]), '#3A8A93');        // Guide → 4 case
fanFromRight(adminA, ADMIN.map((u) => u[0]), '#A23E78');        // Admin → 5 case

// ── Generalization Guide ▷ Traveler: máng TRÊN CÙNG (dành riêng, y=TOP_BUS) ──
const TOP_BUS = 24;
{
  const gx = guideA.acx, gyTop = guideA.cy - ACT_H / 2;
  const tx = travelerA.acx, tyTop = travelerA.cy - ACT_H / 2;
  svg.push(`<path d="M ${gx} ${gyTop} L ${gx} ${TOP_BUS} L ${tx} ${TOP_BUS} L ${tx} ${tyTop}" fill="none" stroke="#1A1A1A" stroke-width="1.6" marker-end="url(#tri)"/>`);
  svg.push(`<text x="${(gx + tx) / 2}" y="${TOP_BUS - 7}" text-anchor="middle" font-size="11.5" fill="#333" font-family="Inter" font-weight="700">«kế thừa» — Guide là một Traveler (dùng được mọi chức năng của Traveler)</text>`);
}

// ── Admin → register/login ("All"): vòng DƯỚI cột phải rồi lên MÁNG GAP trống ──
// (Admin ở xa bên phải, register/login ở xa bên trái, cột phải nằm giữa → đi
//  vòng dưới + lên hành lang trống giữa 2 cột = KHÔNG cắt quạt nào.)
const BOT_BUS = bottomCy + E_H / 2 + 22;
const MIDX = (CX_L + CX_R) / 2;
{
  const ax = adminA.acx, ayBot = adminA.cy + ACT_H / 2;
  [['register', MIDX - 18], ['login', MIDX + 18]].forEach(([id, corr]) => {
    const e = edgeR(id); // vào MÉP PHẢI ellipse (phía hành lang trống)
    svg.push(`<path d="M ${ax} ${ayBot} L ${ax} ${BOT_BUS} L ${corr} ${BOT_BUS} L ${corr} ${e.y} L ${e.x} ${e.y}" ${ASSOC('#A23E78')}/>`);
  });
  svg.push(`<text x="${MIDX}" y="${BOT_BUS + 16}" text-anchor="middle" font-size="10.5" fill="#A23E78" font-family="Inter" font-weight="600">Admin cũng Đăng ký / Đăng nhập («All»)</text>`);
}

// ── vẽ case (đè điểm cuối đường nối cho gọn đầu mũi) ──
ALL.forEach((u) => svg.push(ellipse(u[0], u[1], 'all')));
TRAVELER.forEach((u) => svg.push(ellipse(u[0], u[1], 'tr')));
GUIDE.forEach((u) => svg.push(ellipse(u[0], u[1], 'guide')));
ADMIN.forEach((u) => svg.push(ellipse(u[0], u[1], 'admin')));

// ── actors (vẽ sau cùng) ──
svg.push(`<defs><marker id="tri" markerWidth="16" markerHeight="16" refX="13" refY="6" orient="auto">
  <path d="M1,1 L13,6 L1,11 Z" fill="#fff" stroke="#1A1A1A" stroke-width="1.4"/></marker></defs>`);
svg.push(drawActor(travelerA, '#C0612F'));
svg.push(drawActor(guideA, '#3A8A93'));
svg.push(drawActor(adminA, '#A23E78'));

const SVG = `<svg viewBox="0 0 ${PW} ${PH}" xmlns="http://www.w3.org/2000/svg" class="ucsvg" role="img" aria-label="Sơ đồ Use Case TripMate">${svg.join('')}</svg>`;

/* ───────────────────────── DỰNG HTML ───────────────────────── */
const roleBadge = (act) => act.split('/').map((a) => {
  const t = a.trim();
  const cls = /All/i.test(t) ? 'all' : /Owner/i.test(t) ? 'owner' : /Member/i.test(t) ? 'member'
    : /Guide/i.test(t) ? 'guide' : /Admin/i.test(t) ? 'admin' : 'trav';
  return `<span class="role role-${cls}">${esc(t)}</span>`;
}).join('');

const card = (u, pk) => {
  const [id, name, act, eps] = u;
  return `<div class="uc-card" style="--pk:${pk}">
    <div class="uc-head"><h4>${esc(name.replace(/\n/g, ' '))}</h4></div>
    <div class="uc-roles">${roleBadge(act)}</div>
    <div class="uc-eps">${eps.map((e) => `<code>${esc(e)}</code>`).join('')}</div>
  </div>`;
};

const groupSec = (gid, title, dot, list, pk) =>
  `<section id="g-${gid}" class="grp-sec">
    <h3 class="grp-title"><span class="grp-dot" style="background:${dot}"></span>${esc(title)} <span class="cnt">${list.length}</span></h3>
    <div class="uc-grid">${list.map((u) => card(u, pk)).join('')}</div>
  </section>`;

const detailGroups = [
  groupSec('all', 'Dùng chung (All)', '#C2410C', ALL, '#C2410C'),
  groupSec('trav', 'Traveler (Du khách)', '#C0612F', TRAVELER, '#C0612F'),
  groupSec('guide', 'Guide (Hướng dẫn viên)', '#3A8A93', GUIDE, '#3A8A93'),
  groupSec('admin', 'Admin (Quản trị viên)', '#A23E78', ADMIN, '#A23E78'),
].join('\n');

const totalUcs = ALL.length + TRAVELER.length + GUIDE.length + ADMIN.length;

const CSS = `
  :root{--primary:#ab2d00;--ink:#1c1410;--muted:#6b5d54;--line:#ece4dd;--bg:#fbf7f3;--grad:linear-gradient(135deg,#ab2d00 0%,#d8541f 55%,#f0921f 100%);}
  *{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;color:var(--ink);background:var(--bg);line-height:1.7;-webkit-font-smoothing:antialiased;}
  h1,h2,h3,h4{font-family:'Plus Jakarta Sans',system-ui,sans-serif;line-height:1.25;}
  code{font-family:'JetBrains Mono',ui-monospace,Consolas,monospace;}
  .shell{display:grid;grid-template-columns:248px 1fr;min-height:100vh;}
  aside{position:sticky;top:0;align-self:start;height:100vh;overflow-y:auto;background:#fff;border-right:1px solid var(--line);padding:26px 18px;}
  .brand{display:flex;align-items:center;gap:10px;margin-bottom:4px;}
  .brand .dot{width:30px;height:30px;border-radius:9px;background:var(--grad);box-shadow:0 4px 14px rgba(171,45,0,.35);}
  .brand b{font-size:17px;font-weight:800;}
  .brand-sub{font-size:12px;color:var(--muted);margin-bottom:18px;padding-left:2px;}
  nav a{display:flex;align-items:center;gap:9px;padding:7px 11px;border-radius:9px;color:var(--muted);font-size:13px;font-weight:500;transition:.15s;}
  nav a:hover{background:#faf2ec;color:var(--primary);}
  nav a.active{background:#fdeee6;color:var(--primary);font-weight:700;}
  nav .grp{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#b6a99f;margin:16px 0 6px 11px;font-weight:700;}
  .ndot{width:9px;height:9px;border-radius:3px;flex:none;}
  main{max-width:1320px;padding-bottom:80px;}
  .hero{background:var(--grad);color:#fff;padding:52px 56px 44px;position:relative;overflow:hidden;}
  .hero::after{content:"";position:absolute;right:-80px;top:-80px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,.10);}
  .hero .kicker{font-size:12.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;opacity:.9;}
  .hero h1{font-size:36px;font-weight:800;margin:12px 0 12px;max-width:680px;}
  .hero p{font-size:15.5px;max-width:660px;opacity:.95;}
  .hero .meta{margin-top:20px;display:flex;gap:9px;flex-wrap:wrap;position:relative;z-index:1;}
  .hero .meta span{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.25);padding:5px 13px;border-radius:999px;font-size:12.5px;font-weight:500;backdrop-filter:blur(4px);}
  .wrap{padding:40px 56px 0;}
  section.block{margin-bottom:46px;scroll-margin-top:20px;}
  h2.sec{font-size:23px;font-weight:800;display:flex;align-items:center;gap:12px;margin-bottom:6px;}
  h2.sec .num{flex:none;width:32px;height:32px;border-radius:9px;background:#fdeee6;color:var(--primary);font-size:14px;display:grid;place-items:center;font-weight:800;}
  .lead{color:var(--muted);margin:0 0 20px 44px;font-size:14.5px;max-width:820px;}
  .diagram{background:#fff;border:1px solid var(--line);border-radius:18px;padding:20px 18px;box-shadow:0 1px 3px rgba(28,20,16,.04);overflow:auto;}
  .ucsvg{width:100%;height:auto;min-width:1080px;display:block;}
  .legend{display:flex;gap:20px;flex-wrap:wrap;margin:16px 0 0 2px;font-size:13px;color:var(--muted);align-items:center;}
  .legend .it{display:flex;align-items:center;gap:7px;}
  .lg-line{width:26px;height:0;border-top:1.6px solid #C0612F;}
  .lg-tri{width:0;height:0;border-left:12px solid #1A1A1A;border-top:6px solid transparent;border-bottom:6px solid transparent;}
  .swatch{width:13px;height:13px;border-radius:3px;display:inline-block;}
  .grp-sec{margin-bottom:28px;scroll-margin-top:18px;}
  .grp-title{font-size:18px;font-weight:800;display:flex;align-items:center;gap:10px;margin:0 0 14px;}
  .grp-dot{width:13px;height:13px;border-radius:4px;}
  .grp-title .cnt{font-size:12px;font-weight:700;color:#fff;background:#c9a;border-radius:999px;padding:1px 9px;background:var(--muted);}
  .uc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:13px;}
  .uc-card{background:#fff;border:1px solid var(--line);border-left:4px solid var(--pk);border-radius:13px;padding:14px 16px;box-shadow:0 1px 2px rgba(28,20,16,.03);}
  .uc-head h4{font-size:14.5px;font-weight:700;margin-bottom:8px;}
  .uc-roles{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
  .role{font-size:11px;font-weight:600;padding:2px 9px;border-radius:999px;}
  .role-all{background:#ffedd5;color:#b2480c;}
  .role-trav{background:#fbe9dd;color:#9a4a22;}
  .role-owner{background:#fff1cf;color:#946a00;}
  .role-member{background:#e6f6ec;color:#2f7d4e;}
  .role-guide{background:#e3f4f6;color:#2d7882;}
  .role-admin{background:#fbe6f1;color:#9a366f;}
  .uc-eps{display:flex;flex-direction:column;gap:5px;}
  .uc-eps code{font-size:11.5px;background:#faf4ef;color:#8a3310;padding:3px 9px;border-radius:6px;border:1px solid #f0e6dd;width:fit-content;max-width:100%;word-break:break-word;}
  .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;}
  .stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;}
  .stat .big{font-size:30px;font-weight:800;color:var(--primary);}
  .stat .lbl{font-size:13px;color:var(--muted);margin-top:2px;}
  footer{margin:24px 56px 0;padding-top:20px;border-top:1px solid var(--line);color:var(--muted);font-size:13px;}
  @media(max-width:900px){.shell{grid-template-columns:1fr;}aside{display:none;}.wrap,.hero{padding-left:22px;padding-right:22px;}footer{margin-left:22px;margin-right:22px;}}
`;

const HTML = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Sơ đồ Use Case — TripMate</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style>${CSS}</style>
</head>
<body>
<div class="shell">
  <aside>
    <div class="brand"><span class="dot"></span><b>TripMate</b></div>
    <div class="brand-sub">Sơ đồ Use Case · UML</div>
    <nav>
      <a href="#sodo">Sơ đồ tổng thể</a>
      <a href="#tacnhan">Tác nhân</a>
      <div class="grp">Chi tiết &amp; API</div>
      <a href="#g-all"><span class="ndot" style="background:#C2410C"></span>Dùng chung (All)</a>
      <a href="#g-trav"><span class="ndot" style="background:#C0612F"></span>Traveler</a>
      <a href="#g-guide"><span class="ndot" style="background:#3A8A93"></span>Guide</a>
      <a href="#g-admin"><span class="ndot" style="background:#A23E78"></span>Admin</a>
    </nav>
  </aside>
  <main>
    <header class="hero">
      <div class="kicker">TripMate / TravelSocial · Phân tích hệ thống</div>
      <h1>Sơ đồ Use Case</h1>
      <p>Mô hình hoá ${totalUcs} use case với 3 tác nhân (Traveler · Guide · Admin). Guide kế thừa toàn bộ chức năng của Traveler. Mỗi use case được ánh xạ tới endpoint REST thật trong backend NestJS.</p>
      <div class="meta"><span>${totalUcs} use case</span><span>3 tác nhân</span><span>Generalization</span><span>UML chuẩn</span></div>
    </header>
    <div class="wrap">
      <section id="sodo" class="block">
        <h2 class="sec"><span class="num">①</span>Sơ đồ Use Case tổng thể</h2>
        <p class="lead">Bố cục 2 cột: <strong>Traveler</strong> (trái) liên kết với 15 use case người dùng; <strong>Guide</strong> và <strong>Admin</strong> (phải) mỗi tác nhân một nhóm use case riêng. Mỗi đường nối là một quạt xuất phát từ một tác nhân nên không chồng chéo. Hai use case dùng chung (Đăng ký / Đăng nhập) của Admin được định tuyến vuông góc qua hành lang trống; Guide thừa kế Traveler bằng quan hệ generalization (mũi tên rỗng phía trên).</p>
        <div class="diagram">${SVG}</div>
        <div class="legend">
          <span class="it"><span class="lg-line"></span>Liên kết (association)</span>
          <span class="it"><span class="lg-tri"></span>Kế thừa (generalization)</span>
          <span class="it"><span class="swatch" style="background:#FFF7ED;border:1px solid #C2410C"></span>Dùng chung</span>
          <span class="it"><span class="swatch" style="background:#E8F6F8;border:1px solid #3A8A93"></span>Guide</span>
          <span class="it"><span class="swatch" style="background:#FBE9F3;border:1px solid #A23E78"></span>Admin</span>
        </div>
      </section>

      <section id="tacnhan" class="block">
        <h2 class="sec"><span class="num">②</span>Tác nhân</h2>
        <div class="uc-grid">
          <div class="uc-card" style="--pk:#C0612F"><div class="uc-head"><h4>Traveler (Du khách)</h4></div><div class="uc-roles"><span class="role role-trav">Người dùng</span></div><div style="font-size:13.5px;color:var(--muted)">Tác nhân chính. Quản lý hồ sơ, bài viết, chuyến đi; tham gia chuyến; tìm &amp; đặt HDV; nạp tiền; đánh giá; chat AI.</div></div>
          <div class="uc-card" style="--pk:#3A8A93"><div class="uc-head"><h4>Guide (Hướng dẫn viên)</h4></div><div class="uc-roles"><span class="role role-guide">Kế thừa Traveler</span></div><div style="font-size:13.5px;color:var(--muted)">Có mọi quyền của Traveler, bổ sung: quản lý booking, doanh thu cá nhân, lịch bận và rút tiền.</div></div>
          <div class="uc-card" style="--pk:#A23E78"><div class="uc-head"><h4>Admin (Quản trị viên)</h4></div><div class="uc-roles"><span class="role role-admin">Vận hành</span></div><div style="font-size:13.5px;color:var(--muted)">Thống kê tổng quan, duyệt HDV, duyệt rút tiền, khoá/mở user, quản lý doanh thu toàn hệ thống.</div></div>
        </div>
      </section>

      <section class="block">
        <h2 class="sec"><span class="num">③</span>Chi tiết use case &amp; ánh xạ API</h2>
        <p class="lead">Mỗi thẻ là một use case kèm tác nhân và các endpoint REST thật (đọc từ controller NestJS). Một số use case gộp các thao tác CRUD liên quan.</p>
        ${detailGroups}
      </section>

      <footer>Sinh tự động từ <code>docs/diagrams/tripmate-usecase-web.build.mjs</code> · TripMate / TravelSocial.</footer>
    </div>
  </main>
</div>
<script>
  const links=[...document.querySelectorAll('nav a')];
  const map=new Map(links.map(a=>[a.getAttribute('href').slice(1),a]));
  const io=new IntersectionObserver((es)=>{es.forEach(e=>{if(e.isIntersecting){const a=map.get(e.target.id);if(a){links.forEach(l=>l.classList.remove('active'));a.classList.add('active');}}});},{rootMargin:'-15% 0px -75% 0px'});
  document.querySelectorAll('section[id]').forEach(s=>io.observe(s));
</script>
</body>
</html>`;

writeFileSync(new URL('../so-do-usecase.html', import.meta.url), HTML);
console.log(`→ Đã ghi docs/so-do-usecase.html (${totalUcs} use case, SVG ${PW}×${PH})`);
