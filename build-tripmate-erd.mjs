import { writeFileSync } from 'node:fs';

// ── Bảng cốt lõi: mỗi entity = swimlane (header màu cụm + thân liệt kê cột) ──
// Cụm màu: header = màu cụm, thân = trắng.
const CL = {
  identity: { head: '#DAE8FC', stroke: '#6C8EBF' },
  trip:     { head: '#D5E8D4', stroke: '#82B366' },
  guide:    { head: '#FFE6CC', stroke: '#D79B00' },
  content:  { head: '#E1D5E7', stroke: '#9673A6' },
  social:   { head: '#FFF2CC', stroke: '#D6B656' },
  ai:       { head: '#F5F5F5', stroke: '#999999' },
};

// id, bảng, cụm, cột (PK/FK đánh dấu), vị trí cột (col) — y tự xếp theo cột
const E = [
  // Identity
  { id: 'users', t: 'users', cl: 'identity', col: 0,
    rows: ['PK id', 'email (UQ)', 'name · handle', 'role', 'email_verified'] },

  // Guide & Wallet (cùng cột với User vì 1–1)
  { id: 'guide_profiles', t: 'guide_profiles', cl: 'guide', col: 0,
    rows: ['PK id', 'FK user_id (UQ)', 'region · price_per_day', 'status'] },
  { id: 'wallets', t: 'wallets', cl: 'guide', col: 0,
    rows: ['PK id', 'FK user_id (UQ)', 'balance_available', 'balance_frozen'] },
  { id: 'wallet_transactions', t: 'wallet_transactions', cl: 'guide', col: 0,
    rows: ['PK id', 'FK wallet_id', 'type · amount', 'status'] },

  // Trip cluster
  { id: 'trip_members', t: 'trip_members', cl: 'trip', col: 1,
    rows: ['PK id', 'FK trip_id', 'FK user_id', 'role'] },
  { id: 'trips', t: 'trips', cl: 'trip', col: 1,
    rows: ['PK id', 'FK creator_id', 'FK guide_id (0..1)', 'FK category_id', 'title · destination', 'start/end_date', 'status'] },
  { id: 'itinerary_days', t: 'itinerary_days', cl: 'trip', col: 1,
    rows: ['PK id', 'FK trip_id', 'day_number · date'] },
  { id: 'guide_bookings', t: 'guide_bookings', cl: 'guide', col: 1,
    rows: ['PK id', 'FK guide_id', 'FK traveler_id', 'FK trip_id (0..1)', 'amount · status'] },

  // Content & social (giữa)
  { id: 'posts', t: 'posts', cl: 'content', col: 2,
    rows: ['PK id', 'FK author_id', 'FK trip_id (0..1)', 'FK place_id (0..1)', 'title · visibility'] },
  { id: 'reviews', t: 'reviews', cl: 'content', col: 2,
    rows: ['PK id', 'FK author_id', 'target_type', 'target_id (đa hình)', 'rating'] },
  { id: 'conversations', t: 'conversations', cl: 'social', col: 2,
    rows: ['PK id', 'kind', 'trip_id (0..1)'] },

  // Place + messaging (phải)
  { id: 'places', t: 'places', cl: 'content', col: 3,
    rows: ['PK id', 'FK province_id', 'FK category_id', 'name · slug', 'rating'] },
  { id: 'chat_messages', t: 'chat_messages', cl: 'social', col: 3,
    rows: ['PK id', 'FK conversation_id', 'FK sender_id', 'content'] },
  { id: 'provinces', t: 'provinces', cl: 'content', col: 3,
    rows: ['PK id', 'name · slug · region'] },
  { id: 'categories', t: 'categories', cl: 'content', col: 3,
    rows: ['PK id', 'name · key'] },

  // Ngoài cùng phải
  { id: 'notifications', t: 'notifications', cl: 'social', col: 4,
    rows: ['PK id', 'FK user_id', 'FK actor_id (0..1)', 'type · read'] },
  { id: 'rag_knowledge_chunks', t: 'rag_knowledge_chunks', cl: 'ai', col: 4,
    rows: ['PK id', 'doc_name · chunk_index', 'content', 'embedding (jsonb)'] },
];

// Quan hệ: [src(1), tgt(n), nhãn, kind]  kind: 'one'|'opt'|'oneone'
const R = [
  ['users', 'trips', 'tạo', 'one'],
  ['users', 'trips', 'dẫn (HDV)', 'opt'],
  ['users', 'trip_members', 'tham gia', 'one'],
  ['trips', 'trip_members', '', 'one'],
  ['trips', 'itinerary_days', '', 'one'],
  ['users', 'guide_profiles', '1–1', 'oneone'],
  ['guide_profiles', 'guide_bookings', '', 'one'],
  ['users', 'guide_bookings', 'đặt', 'one'],
  ['trips', 'guide_bookings', '', 'opt'],
  ['users', 'wallets', '1–1', 'oneone'],
  ['wallets', 'wallet_transactions', '', 'one'],
  ['provinces', 'places', '', 'one'],
  ['categories', 'places', '', 'one'],
  ['categories', 'trips', '', 'one'],
  ['users', 'posts', 'đăng', 'one'],
  ['trips', 'posts', '', 'opt'],
  ['places', 'posts', '', 'opt'],
  ['users', 'reviews', 'viết', 'one'],
  ['conversations', 'chat_messages', '', 'one'],
  ['users', 'chat_messages', 'gửi', 'one'],
  ['users', 'notifications', 'nhận', 'one'],
];

const ROW_H = 16, HEAD = 26, PAD = 10, W = 210, COL_X = [40, 320, 600, 880, 1160], GAP = 38, TOP = 90;

// xếp y theo cột
const colY = {};
const pos = {};
for (const e of E) {
  const bodyH = e.rows.length * ROW_H + PAD;
  e.h = HEAD + bodyH;
  e.x = COL_X[e.col];
  const y = colY[e.col] ?? TOP;
  e.y = y;
  colY[e.col] = y + e.h + GAP;
  pos[e.id] = e;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cells = [];
let eid = 0;

// title
const pageW = COL_X[COL_X.length - 1] + W + 60;
const pageH = Math.max(...Object.values(colY)) + 40;
cells.push(`<mxCell id="title" value="ERD TripMate — các bảng cốt lõi (gom theo 5 cụm nghiệp vụ)" style="text;html=1;align=center;fontStyle=1;fontSize=15;fontColor=#1A1A1A;" vertex="1" parent="1"><mxGeometry x="0" y="24" width="${pageW}" height="30" as="geometry"/></mxCell>`);

// entities (swimlane + child text)
for (const e of E) {
  const c = CL[e.cl];
  cells.push(`<mxCell id="${e.id}" value="${esc(e.t)}" style="swimlane;html=1;startSize=${HEAD};fillColor=${c.head};swimlaneFillColor=#FFFFFF;strokeColor=${c.stroke};fontStyle=1;fontSize=12;fontColor=#1A1A1A;align=center;verticalAlign=middle;" vertex="1" parent="1"><mxGeometry x="${e.x}" y="${e.y}" width="${W}" height="${e.h}" as="geometry"/></mxCell>`);
  const body = e.rows.map((r) => esc(r)).join('&lt;br&gt;');
  cells.push(`<mxCell id="${e.id}_b" value="${body}" style="text;html=1;align=left;verticalAlign=top;spacingLeft=10;spacingTop=4;fontSize=11;fontColor=#1A1A1A;" vertex="1" parent="${e.id}"><mxGeometry x="0" y="${HEAD}" width="${W}" height="${e.h - HEAD}" as="geometry"/></mxCell>`);
}

// crow's foot edges
const startArr = (k) => (k === 'opt' ? 'ERzeroToOne' : 'ERmandOne');
const endArr = (k) => (k === 'oneone' ? 'ERmandOne' : 'ERmany');
for (const [s, t, label, kind] of R) {
  const a = pos[s], b = pos[t];
  // hướng exit/entry theo vị trí cột tương đối
  let pins;
  if (b.x > a.x) pins = 'exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;';
  else if (b.x < a.x) pins = 'exitX=0;exitY=0.5;exitDx=0;exitDy=0;entryX=1;entryY=0.5;entryDx=0;entryDy=0;';
  else if (b.y > a.y) pins = 'exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;';
  else pins = 'exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;';
  let st = `edgeStyle=orthogonalEdgeStyle;html=1;rounded=0;jettySize=auto;orthogonalLoop=1;fontSize=10;fontColor=#555555;strokeColor=#5A6B7B;strokeWidth=1.4;startArrow=${startArr(kind)};startFill=0;endArrow=${endArr(kind)};endFill=0;`;
  if (label) st += 'labelBackgroundColor=#FFFFFF;';
  st += pins;
  cells.push(`<mxCell id="ed${++eid}" value="${esc(label)}" style="${st}" edge="1" parent="1" source="${s}" target="${t}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
}

// note: Review đa hình
const noteX = pos.reviews.x, noteY = pos.conversations.y + pos.conversations.h + GAP;
cells.push(`<mxCell id="note_review" value="Review.target_id là khoá ĐA HÌNH → place | trip | guide | member.&#10;Không dùng FK cứng (lưu target_type + target_id)." style="text;html=1;align=left;verticalAlign=top;spacingLeft=8;spacingTop=6;fontSize=10;fontColor=#7A5C00;fillColor=#FFF8E1;strokeColor=#D6B656;rounded=0;whiteSpace=wrap;" vertex="1" parent="1"><mxGeometry x="${noteX}" y="${noteY}" width="${W}" height="58" as="geometry"/></mxCell>`);

// note: rag chunk độc lập
const aiNoteY = pos.rag_knowledge_chunks.y + pos.rag_knowledge_chunks.h + 12;
cells.push(`<mxCell id="note_rag" value="rag_knowledge_chunks: độc lập, KHÔNG FK&#10;(vector store cho chatbot RAG)." style="text;html=1;align=left;verticalAlign=top;spacingLeft=8;spacingTop=6;fontSize=10;fontColor=#555555;fillColor=#F5F5F5;strokeColor=#999999;rounded=0;whiteSpace=wrap;" vertex="1" parent="1"><mxGeometry x="${pos.rag_knowledge_chunks.x}" y="${aiNoteY}" width="${W}" height="50" as="geometry"/></mxCell>`);

// legend
const legY = 56;
cells.push(`<mxCell id="legend" value="Chú thích: │ = một (bắt buộc)   ◦│ = không hoặc một (FK nullable)   &lt;&lt; = nhiều (crow's foot).  Màu = cụm nghiệp vụ." style="text;html=1;align=left;fontSize=10;fontColor=#555555;" vertex="1" parent="1"><mxGeometry x="40" y="${legY}" width="${pageW - 80}" height="20" as="geometry"/></mxCell>`);

const model = `<mxGraphModel dx="1400" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel>`;

const mxfile = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio-ai-kit" modified="2026-06-30T00:00:00.000Z" agent="drawio-ai-kit" version="24.7.17">
  <diagram id="tripmate-erd" name="ERD cốt lõi">${model}</diagram>
</mxfile>`;

writeFileSync('C:/DoAnTotNghiepv3/tripmate-erd.drawio', mxfile, 'utf8');
console.log('Wrote tripmate-erd.drawio  page=' + pageW + 'x' + pageH);
console.log('Entities=' + E.length + ' Relations=' + R.length);
