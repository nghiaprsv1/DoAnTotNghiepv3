// TripMate — Sơ đồ Use Case tổng quát toàn hệ thống (UML, vẽ bằng shape draw.io gốc).
// Layout tính tự động theo số use case/gói (không hand-tune từng toạ độ). Xuất .drawio.
// Chạy: node docs/diagrams/tripmate-usecase.build.mjs
import { writeFileSync } from "node:fs";

const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const val = (s) => esc(s).replace(/\n/g,"&#10;");
const cells = [];
let z = 0;
const nid = () => `e${++z}`;
const node = (id,x,y,w,h,label,style) => cells.push(`<mxCell id="${id}" value="${val(label)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" as="geometry"/></mxCell>`);
const link = (src,tgt,label,style) => cells.push(`<mxCell id="${nid()}" value="${val(label||"")}" style="${style}" edge="1" parent="1" source="${src}" target="${tgt}"><mxGeometry relative="1" as="geometry"/></mxCell>`);

const E_W=172,E_H=64,P_PAD=16,P_HEAD=34,P_GX=18,P_GY=14,P_COLS=2,PCOLS=3;
const colW=P_PAD*2+P_COLS*E_W+(P_COLS-1)*P_GX;
const PCG=64,PRG=40,BSP=40,BTOP=56,BBOT=36,BX=300,BY=80;

const PKGS=[
 {id:"acc",title:"Tài khoản & Xác thực",fill:"#FFF1E8",stroke:"#C0612F",ucs:[["acc1","Đăng ký &\nxác thực email"],["acc2","Đăng nhập /\nĐăng xuất"],["acc3","Quản lý hồ sơ\ncá nhân"],["acc4","Theo dõi\nngười dùng"]]},
 {id:"exp",title:"Khám phá (khách)",fill:"#EAF4FF",stroke:"#3B6EA5",ucs:[["exp1","Tìm kiếm &\nxem chuyến đi"],["exp2","Xem địa điểm"],["exp3","Xem hướng\ndẫn viên"],["exp4","Xem bảng tin"]]},
 {id:"ai",title:"Trợ lý AI",fill:"#F3EAFF",stroke:"#7A4FB0",ucs:[["ai1","Chat trợ lý\ndu lịch"],["ai2","Tạo chuyến\ntừ AI"]]},
 {id:"trip",title:"Chuyến đi",fill:"#E9F7EF",stroke:"#3E8E5E",ucs:[["trip1","Quản lý\nchuyến đi"],["trip2","Tham gia &\nduyệt thành viên"],["trip3","Chat nhóm\nchuyến đi"],["trip4","Gợi ý\nchuyến đi"]]},
 {id:"soc",title:"Mạng xã hội",fill:"#FFF7E0",stroke:"#B08A2E",ucs:[["soc1","Đăng & tương\ntác bài viết"],["soc2","Lưu nội dung"],["soc3","Đánh giá"]]},
 {id:"pay",title:"Thanh toán",fill:"#FDE8E8",stroke:"#B0413E",ucs:[["pay1","Nạp tiền\nvào ví"]]},
 {id:"gd",title:"Hướng dẫn viên",fill:"#E8F6F8",stroke:"#3A8A93",ucs:[["gd1","Đăng ký\nlàm HDV"],["gd2","Đặt HDV"],["gd3","Quản lý lịch\n& booking"],["gd4","Ví & rút tiền"]]},
 {id:"msg",title:"Tin nhắn & Thông báo",fill:"#F0F0F5",stroke:"#6B6B8A",ucs:[["msg1","Nhắn tin\ntrực tiếp"],["msg2","Nhận thông báo"]]},
 {id:"adm",title:"Quản trị",fill:"#FBE9F3",stroke:"#A23E78",ucs:[["adm1","Quản lý người\ndùng & HDV"],["adm2","Kiểm duyệt\nnội dung"],["adm3","Duyệt rút tiền"],["adm4","Thống kê &\ndoanh thu"]]},
];
// --- đo kích thước từng gói theo số use case ---
for (const p of PKGS) {
  const rows = Math.ceil(p.ucs.length / P_COLS);
  p.w = colW;
  p.h = P_HEAD + P_PAD * 2 + rows * E_H + (rows - 1) * P_GY;
}
// --- xếp gói vào lưới PCOLS cột; mỗi hàng cao bằng gói cao nhất hàng đó ---
const rowsOf = [];
for (let i = 0; i < PKGS.length; i += PCOLS) rowsOf.push(PKGS.slice(i, i + PCOLS));
const rowH = rowsOf.map((r) => Math.max(...r.map((p) => p.h)));
const innerX = BX + 36, innerY = BY + BTOP;
rowsOf.forEach((row, ri) => {
  const yOff = innerY + rowH.slice(0, ri).reduce((s, h) => s + h + PRG, 0);
  row.forEach((p, ci) => { p.x = innerX + ci * (colW + PCG); p.y = yOff; });
});
const gridW = PCOLS * colW + (PCOLS - 1) * PCG;
const gridH = rowH.reduce((s, h) => s + h, 0) + (rowH.length - 1) * PRG;
const BW = gridW + 72, BH = BTOP + gridH + BBOT;

// --- system boundary ---
node("sys", BX, BY, BW, BH, "Hệ thống TripMate / TravelSocial",
  "rounded=0;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#ab2d00;strokeWidth=2;verticalAlign=top;fontStyle=1;fontSize=15;fontColor=#ab2d00;spacingTop=10;");

// --- gói + use case ---
for (const p of PKGS) {
  node(`pk_${p.id}`, p.x, p.y, p.w, p.h, p.title,
    `rounded=8;whiteSpace=wrap;html=1;fillColor=${p.fill};strokeColor=${p.stroke};verticalAlign=top;fontStyle=1;fontSize=12;fontColor=${p.stroke};spacingTop=6;dashed=0;`);
  p.ucs.forEach(([id, label], i) => {
    const r = Math.floor(i / P_COLS), c = i % P_COLS;
    const n = p.ucs.length;
    const cols = (n === 1) ? 1 : P_COLS;
    const rowItems = (r === Math.floor((n - 1) / P_COLS)) ? (n - r * P_COLS) : P_COLS;
    const blockW = cols * E_W + (cols - 1) * P_GX;
    const startX = p.x + (p.w - (rowItems * E_W + (rowItems - 1) * P_GX)) / 2;
    const x = startX + c * (E_W + P_GX);
    const y = p.y + P_HEAD + P_PAD + r * (E_H + P_GY);
    node(id, x, y, E_W, E_H, label,
      "ellipse;whiteSpace=wrap;html=1;fillColor=#FFFFFF;strokeColor=#5A6B7B;fontColor=#1A1A1A;fontSize=11;");
  });
}

// --- actor shape ---
const ACT_W = 40, ACT_H = 92;
const actor = (id, x, y, label) =>
  node(id, x, y, ACT_W, ACT_H, label, "shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=12;fontStyle=1;fontColor=#1A1A1A;strokeColor=#1A1A1A;");

// === 3 TÁC NHÂN: Du khách (Traveler) ◁ Hướng dẫn viên (Guide) · Quản trị viên (Admin) ===
const gridTop = BY + BTOP;
const lx = BX - 170, rx = BX + BW + 120;
actor("traveler", lx, gridTop + gridH * 0.28, "Du khách\n(Traveler)");
actor("guide", lx, gridTop + gridH * 0.72, "Hướng dẫn viên\n(Guide)");
const admPkg = PKGS.find((p) => p.id === "adm");
actor("admin", rx, admPkg.y + admPkg.h / 2 - ACT_H / 2, "Quản trị viên\n(Admin)");

// --- generalization (con ▷ cha): Guide kế thừa Traveler — mũi tên tam giác rỗng ---
const GEN = "endArrow=block;endFill=0;endSize=14;html=1;rounded=0;edgeStyle=orthogonalEdgeStyle;strokeColor=#1A1A1A;";
link("guide", "traveler", "", GEN);

// --- association: actor — use case (đường thẳng, không mũi tên) ---
const AS = "endArrow=none;html=1;strokeColor=#7A8794;edgeStyle=orthogonalEdgeStyle;rounded=1;jettySize=auto;";
const assoc = (a, ucs) => ucs.forEach((u) => link(a, u, "", AS));
// Du khách: toàn bộ chức năng người dùng (tài khoản, khám phá, AI, chuyến đi, xã hội, nạp ví, đặt/đăng ký HDV, nhắn tin)
assoc("traveler", ["acc1", "acc2", "acc3", "acc4", "exp1", "exp2", "exp3", "exp4", "ai1", "ai2",
  "trip1", "trip2", "trip3", "trip4", "soc1", "soc2", "soc3", "pay1", "gd1", "gd2", "msg1", "msg2"]);
// Hướng dẫn viên (kế thừa Du khách): quản lý lịch & booking, ví & rút tiền
assoc("guide", ["gd3", "gd4"]);
// Quản trị viên
assoc("admin", ["adm1", "adm2", "adm3", "adm4"]);

const PW = BX + BW + 260, PH = BY + BH + 80;
const xml = `<mxGraphModel dx="1400" dy="900" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${PW}" pageHeight="${PH}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join("")}</root></mxGraphModel>`;
const mxfile = `<mxfile host="app.diagrams.net"><diagram name="TripMate — Use Case tổng quát" id="uc">${xml}</diagram></mxfile>`;
writeFileSync(new URL("./tripmate-usecase.drawio", import.meta.url), mxfile);
console.log(`→ Đã ghi tripmate-usecase.drawio (${PKGS.length} gói, ${PKGS.reduce((s,p)=>s+p.ucs.length,0)} use case, page ${PW}×${PH})`);

