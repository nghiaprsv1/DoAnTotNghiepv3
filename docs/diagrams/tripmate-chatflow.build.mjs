// TripMate — Luồng chat AI: hỏi → đáp. Khối agent thể hiện CÔNG CỤ + THUẬT TOÁN thật (không dùng nhãn trừu tượng).
// Chạy: node docs/diagrams/tripmate-chatflow.build.mjs
import { writeFileSync } from "node:fs";

const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const val = (s) => esc(s).replace(/\n/g,"&#10;");
const cells = [];
let eid = 0;
const node = (id,x,y,w,h,label,style) => cells.push(`<mxCell id="${id}" value="${val(label)}" style="${style}" vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
const edge = (src,tgt,label,style,pts=[]) => {
  const arr = pts.length ? `<Array as="points">${pts.map(p=>`<mxPoint x="${p.x}" y="${p.y}"/>`).join("")}</Array>` : "";
  cells.push(`<mxCell id="ed${++eid}" value="${val(label)}" style="${style}" edge="1" parent="1" source="${src}" target="${tgt}"><mxGeometry relative="1" as="geometry">${arr}</mxGeometry></mxCell>`);
};

// ---- styles ----
const ST = {
  user:   "rounded=12;whiteSpace=wrap;html=1;fillColor=#FFE3D2;strokeColor=#ab2d00;fontColor=#7a2000;fontStyle=1;fontSize=13;",
  bubble: "rounded=12;whiteSpace=wrap;html=1;fillColor=#FFF1E8;strokeColor=#C0612F;fontColor=#8a3d12;fontStyle=1;fontSize=13;",
  llm:    "rounded=12;whiteSpace=wrap;html=1;fillColor=#F3EAFF;strokeColor=#7A4FB0;fontColor=#553089;fontStyle=1;fontSize=13;",
  tool:   "rounded=8;whiteSpace=wrap;html=1;fillColor=#E9F7EF;strokeColor=#3E8E5E;fontColor=#2c6444;fontStyle=1;fontSize=12;",
  algo:   "rounded=8;whiteSpace=wrap;html=1;fillColor=#EAF4FF;strokeColor=#3B6EA5;fontColor=#1f4d7a;fontStyle=1;fontSize=12;",
  db:     "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;fillColor=#FBE9F3;strokeColor=#A23E78;fontColor=#7a2856;fontStyle=1;fontSize=12;",
  agent:  "rounded=16;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#7A4FB0;strokeWidth=2;fontColor=#553089;fontStyle=1;fontSize=13;verticalAlign=top;align=left;spacingLeft=16;spacingTop=8;",
};

// ---- AGENT boundary (vẽ trước = nằm dưới) ----
node("agentbox", 470, 80, 720, 300, "Trợ lý RAG v2 — LLM điều phối công cụ (function calling)", ST.agent);

// ---- nhập ----
node("user",   40, 110, 160, 66, "Người dùng\n(đặt câu hỏi)", ST.user);
node("bubble", 250, 110, 180, 66, "Bong bóng chat AI\n(AIChatBubble)", ST.bubble);

// ---- LLM điều phối (trong agent, trên) ----
node("llm", 760, 118, 220, 64, "Gemini LLM\n(điều phối · sinh câu trả lời)", ST.llm);

// ---- công cụ + thuật toán (trong agent, dưới) ----
node("toolDB",  498, 250, 214, 84, "Tìm kiếm DB\nchuyến · địa điểm · HDV · bài viết", ST.tool);
node("toolDoc", 732, 250, 250, 96, "Tra tài liệu (Hybrid RAG)\nEmbedding → Cosine + BM25 → RRF", ST.algo);
node("toolItin",1002,250, 168, 84, "Dựng lộ trình\n(LLM sinh JSON)", ST.tool);

// ---- dữ liệu (ngoài, dưới) ----
node("db", 700, 440, 250, 72, "PostgreSQL\ndữ liệu + vector store", ST.db);

// ---- edges ----
const FWD = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;strokeColor=#5A6B7B;strokeWidth=2;fontSize=11;fontColor=#3a4652;labelBackgroundColor=#ffffff;";
const CALL = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;startArrow=classic;startFill=1;endArrow=classic;endFill=1;strokeColor=#7A4FB0;strokeWidth=2;fontSize=11;fontColor=#553089;labelBackgroundColor=#ffffff;";
const DOWN = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;strokeColor=#3E8E5E;strokeWidth=2;fontSize=11;fontColor=#2c6444;labelBackgroundColor=#ffffff;";
const RET = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;dashed=1;strokeColor=#3E8E5E;strokeWidth=2.5;fontSize=11;fontColor=#2c6444;labelBackgroundColor=#ffffff;";

// hỏi (ngang, thẳng)
edge("user", "bubble", "Đặt câu hỏi", FWD + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
edge("bubble", "agentbox", "Gửi /rag-v2/ask", FWD + "exitX=1;exitY=0.5;entryX=0;entryY=0.21;");
// LLM gọi công cụ (fan-out 3, track y=214) — 2 chiều: gọi + nhận kết quả
edge("llm", "toolDB",  "gọi", CALL + "exitX=0.2;exitY=1;entryX=0.5;entryY=0;", [{x:804,y:214},{x:605,y:214}]);
edge("llm", "toolDoc", "gọi", CALL + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;", [{x:870,y:214},{x:857,y:214}]);
edge("llm", "toolItin","gọi", CALL + "exitX=0.8;exitY=1;entryX=0.5;entryY=0;", [{x:936,y:214},{x:1086,y:214}]);
// công cụ truy vấn dữ liệu (track y=405)
edge("toolDB",  "db", "truy vấn", DOWN + "exitX=0.5;exitY=1;entryX=0.45;entryY=0;", [{x:605,y:405},{x:812,y:405}]);
edge("toolDoc", "db", "vector", DOWN + "exitX=0.5;exitY=1;entryX=0.6;entryY=0;", [{x:857,y:405},{x:850,y:405}]);
// trả lời (vòng mé trái-dưới, không đè đường hỏi)
edge("agentbox", "user", "Câu trả lời", RET + "exitX=0;exitY=0.85;entryX=0.5;entryY=1;", [{x:120,y:335}]);

const PW = 1240, PH = 560;
const title = `<mxCell id="ttl" value="TripMate — Luồng hỏi đáp trợ lý AI (công cụ và thuật toán)" style="text;html=1;align=center;fontStyle=1;fontSize=15;fontColor=#ab2d00;" vertex="1" parent="1"><mxGeometry x="0" y="30" width="${PW}" height="30" as="geometry"/></mxCell>`;
const xml = `<mxGraphModel dx="1200" dy="800" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${PW}" pageHeight="${PH}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${title}${cells.join("")}</root></mxGraphModel>`;
writeFileSync(new URL("./tripmate-chatflow.drawio", import.meta.url), `<mxfile host="app.diagrams.net"><diagram name="Luồng chat AI (công cụ và thuật toán)" id="cf">${xml}</diagram></mxfile>`);
console.log(`→ Đã ghi tripmate-chatflow.drawio (page ${PW}×${PH})`);
