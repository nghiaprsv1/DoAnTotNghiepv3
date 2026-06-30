// TripMate — Luồng khi agent chọn search_documents (Hybrid RAG). Đường vẽ căn thủ công.
// Chạy: node docs/diagrams/tripmate-search-documents.build.mjs
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

const ST = {
  user:  "rounded=12;whiteSpace=wrap;html=1;fillColor=#FFE3D2;strokeColor=#ab2d00;fontColor=#7a2000;fontStyle=1;fontSize=13;",
  bubble:"rounded=12;whiteSpace=wrap;html=1;fillColor=#FFF1E8;strokeColor=#C0612F;fontColor=#8a3d12;fontStyle=1;fontSize=13;",
  llm:   "rounded=12;whiteSpace=wrap;html=1;fillColor=#F3EAFF;strokeColor=#7A4FB0;fontColor=#553089;fontStyle=1;fontSize=12;",
  embed: "rounded=8;whiteSpace=wrap;html=1;fillColor=#EAF4FF;strokeColor=#3B6EA5;fontColor=#1f4d7a;fontStyle=1;fontSize=12;",
  dense: "rounded=8;whiteSpace=wrap;html=1;fillColor=#E9F7EF;strokeColor=#3E8E5E;fontColor=#2c6444;fontStyle=1;fontSize=12;",
  sparse:"rounded=8;whiteSpace=wrap;html=1;fillColor=#FFF7E0;strokeColor=#B08A2E;fontColor=#7a5e15;fontStyle=1;fontSize=12;",
  rrf:   "rounded=8;whiteSpace=wrap;html=1;fillColor=#FDE8E8;strokeColor=#B0413E;fontColor=#7a2826;fontStyle=1;fontSize=12;",
  algoRerank: "rounded=8;whiteSpace=wrap;html=1;fillColor=#F3EAFF;strokeColor=#7A4FB0;fontColor=#553089;fontStyle=1;fontSize=12;",
  topk:  "rounded=8;whiteSpace=wrap;html=1;fillColor=#EAF4FF;strokeColor=#3B6EA5;fontColor=#1f4d7a;fontStyle=1;fontSize=12;",
  db:    "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;fillColor=#FBE9F3;strokeColor=#A23E78;fontColor=#7a2856;fontStyle=1;fontSize=12;",
  tool:  "rounded=16;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#3B6EA5;strokeWidth=2;fontColor=#1f4d7a;fontStyle=1;fontSize=13;verticalAlign=top;align=left;spacingLeft=16;spacingTop=8;",
};

// boundary công cụ (vẽ trước)
node("tool", 40, 250, 1130, 280, "Công cụ search_documents — pipeline RAG đầy đủ (rewrite → hybrid → rerank)", ST.tool);

// nhập + LLM
node("user",   40, 100, 150, 60, "Người dùng\n(câu hỏi CÁCH/QUY TRÌNH…)", ST.user);
node("bubble", 230, 100, 150, 60, "Bong bóng chat AI", ST.bubble);
node("rewrite",420, 92, 200, 76, "① Viết lại câu hỏi (đầu vào)\nrewrite + keywords + định tuyến\n(routeAndRewrite, 1 lần)", ST.algoRerank);
node("llm",    680, 92, 220, 76, "② Gemini LLM (agent)\nchọn search_documents\n+ sinh câu trả lời", ST.llm);

// pipeline trong công cụ (đã nhận sẵn câu rewrite → không rewrite lại)
node("embed",  70, 336, 160, 68, "③ Embedding\ncâu đã rewrite → vector", ST.embed);
node("dense",  280, 296, 170, 56, "④ DENSE\nCosine similarity", ST.dense);
node("sparse", 280, 400, 170, 56, "④ SPARSE\nBM25 (từ khoá)", ST.sparse);
node("rrf",    490, 340, 140, 76, "⑤ RRF\nhợp nhất\n→ N ứng viên", ST.rrf);
node("rerank", 660, 340, 170, 76, "⑥ Rerank (LLM)\nchấm 0–10\nlọc top-K", ST.algoRerank);
node("topk",   860, 340, 150, 76, "⑦ Top-K đoạn\nliên quan nhất", ST.topk);

// nguồn dữ liệu
node("db", 280, 555, 280, 64, "rag_knowledge_chunks (PostgreSQL)\nvector store — tài liệu đã ingest", ST.db);

// ---- edges ----
const FWD = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;strokeColor=#5A6B7B;strokeWidth=2;fontSize=11;fontColor=#3a4652;labelBackgroundColor=#ffffff;";
const PIPE = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;strokeColor=#3B6EA5;strokeWidth=2;fontSize=11;fontColor=#1f4d7a;labelBackgroundColor=#ffffff;";
const LOAD = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;dashed=1;strokeColor=#A23E78;strokeWidth=2;fontSize=11;fontColor=#7a2856;labelBackgroundColor=#ffffff;";
const RET = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;dashed=1;strokeColor=#3E8E5E;strokeWidth=2.5;fontSize=11;fontColor=#2c6444;labelBackgroundColor=#ffffff;";

// hỏi
edge("user", "bubble", "câu hỏi", FWD + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
edge("bubble", "llm", "gửi backend", FWD + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
// LLM gọi công cụ → rewrite (xuống trái, không đè bubble)
edge("llm", "rewrite", "gọi search_documents", FWD + "exitX=0;exitY=1;entryX=0.5;entryY=0;", [{x:135,y:200},{x:135,y:330}]);
// pipeline: rewrite → embed → fork dense/sparse
edge("rewrite", "embed", "", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
edge("embed", "dense",  "", PIPE + "exitX=1;exitY=0.3;entryX=0;entryY=0.5;", [{x:415,y:357},{x:415,y:324}]);
edge("embed", "sparse", "", PIPE + "exitX=1;exitY=0.7;entryX=0;entryY=0.5;", [{x:415,y:384},{x:415,y:428}]);
// join: dense/sparse → RRF
edge("dense",  "rrf", "", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.35;", [{x:612,y:324},{x:612,y:367}]);
edge("sparse", "rrf", "", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.7;", [{x:612,y:428},{x:612,y:393}]);
// RRF → rerank → topK
edge("rrf", "rerank", "N ứng viên", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
edge("rerank", "topk", "top-K", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
// db nạp chunk cho dense + sparse
edge("db", "dense", "nạp toàn bộ chunk", LOAD + "exitX=0.5;exitY=0;entryX=0.5;entryY=1;", [{x:500,y:480}]);
edge("db", "sparse", "", LOAD + "exitX=0.7;exitY=0;entryX=0.5;entryY=1;", [{x:560,y:500}]);
// topK → LLM (trả top-K đoạn), vòng phải
edge("topk", "llm", "trả Top-K đoạn", RET.replace("#3E8E5E","#3B6EA5").replace("#2c6444","#1f4d7a") + "exitX=0.5;exitY=0;entryX=1;entryY=0.5;", [{x:1075,y:130},{x:720,y:130}]);
// LLM → user (câu trả lời), vòng trên
edge("llm", "user", "câu trả lời", RET + "exitX=0.5;exitY=0;entryX=0.5;entryY=0;", [{x:595,y:74},{x:115,y:74}]);

const PW = 1210, PH = 670;
const title = `<mxCell id="ttl" value="TripMate — Luồng search_documents (rewrite → Embedding + Cosine + BM25 → RRF → Rerank)" style="text;html=1;align=center;fontStyle=1;fontSize=14;fontColor=#ab2d00;" vertex="1" parent="1"><mxGeometry x="0" y="32" width="${PW}" height="30" as="geometry"/></mxCell>`;
const xml = `<mxGraphModel dx="1200" dy="800" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${PW}" pageHeight="${PH}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${title}${cells.join("")}</root></mxGraphModel>`;
writeFileSync(new URL("./tripmate-search-documents.drawio", import.meta.url), `<mxfile host="app.diagrams.net"><diagram name="Luồng search_documents (Hybrid RAG)" id="sd">${xml}</diagram></mxfile>`);
console.log(`→ Đã ghi tripmate-search-documents.drawio (page ${PW}×${PH})`);
