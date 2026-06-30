// TripMate — Pipeline RAG v2 ĐẦY ĐỦ (7 bước, có rerank). Đường vẽ căn thủ công.
// Chạy: node docs/diagrams/tripmate-rag-pipeline.build.mjs
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
  llm:   "rounded=8;whiteSpace=wrap;html=1;fillColor=#F3EAFF;strokeColor=#7A4FB0;fontColor=#553089;fontStyle=1;fontSize=12;",
  step:  "rounded=8;whiteSpace=wrap;html=1;fillColor=#EAF4FF;strokeColor=#3B6EA5;fontColor=#1f4d7a;fontStyle=1;fontSize=12;",
  dense: "rounded=8;whiteSpace=wrap;html=1;fillColor=#E9F7EF;strokeColor=#3E8E5E;fontColor=#2c6444;fontStyle=1;fontSize=11;",
  sparse:"rounded=8;whiteSpace=wrap;html=1;fillColor=#FFF7E0;strokeColor=#B08A2E;fontColor=#7a5e15;fontStyle=1;fontSize=11;",
  rrf:   "rounded=8;whiteSpace=wrap;html=1;fillColor=#FDE8E8;strokeColor=#B0413E;fontColor=#7a2826;fontStyle=1;fontSize=11;",
  rerank:"rounded=8;whiteSpace=wrap;html=1;fillColor=#F3EAFF;strokeColor=#7A4FB0;fontColor=#553089;fontStyle=1;fontSize=12;",
  db:    "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;fillColor=#FBE9F3;strokeColor=#A23E78;fontColor=#7a2856;fontStyle=1;fontSize=11;",
  hybrid:"rounded=14;whiteSpace=wrap;html=1;dashed=1;fillColor=none;strokeColor=#3B6EA5;strokeWidth=2;fontColor=#1f4d7a;fontStyle=1;fontSize=12;verticalAlign=top;align=left;spacingLeft=14;spacingTop=6;",
};

// hàng 1 (y=120): user → ①rewrite → ②db_retrieval
node("user", 40, 116, 150, 64, "Người dùng\n(câu hỏi)", ST.user);
node("s1", 230, 110, 200, 76, "① Router + Viết lại\n(LLM: rewrite + keywords\n+ chọn nguồn + filter)", ST.llm);
node("s2", 470, 110, 210, 76, "② Truy hồi DB (multi-source)\ntrips · places · guides · posts\n(SQL, 0 token)", ST.step);
node("dbdomain", 500, 250, 180, 56, "PostgreSQL (domain)", ST.db);

// khối ③ hybrid (y≈360)
node("hybrid", 40, 350, 640, 180, "③ Hybrid search trên tài liệu (rag_knowledge_chunks)", ST.hybrid);
node("s3embed", 60, 396, 150, 60, "Embedding câu hỏi\n→ vector", ST.step);
node("dense", 250, 380, 180, 52, "DENSE\nCosine similarity", ST.dense);
node("sparse",250, 458, 180, 52, "SPARSE\nBM25", ST.sparse);
node("rrf",   470, 418, 180, 64, "RRF\nhợp nhất xếp hạng\n→ N ứng viên", ST.rrf);
node("dbkb",  250, 250, 200, 56, "rag_knowledge_chunks\n(vector store)", ST.db);

// hàng cuối (y≈360, phải): ④rerank → ⑤context → ⑥generate
node("s4", 760, 350, 210, 80, "④ Rerank\nLLM chấm điểm 0–10\nlọc top-K tinh", ST.rerank);
node("s5", 760, 250, 210, 60, "⑤ Build context\nghép từ top-K", ST.step);
node("s6", 760, 110, 210, 76, "⑥ Generate\nLLM sinh câu trả lời\nCHỈ từ ngữ cảnh", ST.llm);

// ---- edges ----
const FWD = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;strokeColor=#5A6B7B;strokeWidth=2;fontSize=11;fontColor=#3a4652;labelBackgroundColor=#ffffff;";
const PIPE= "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;strokeColor=#3B6EA5;strokeWidth=2;fontSize=10;fontColor=#1f4d7a;labelBackgroundColor=#ffffff;";
const LOAD= "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;dashed=1;strokeColor=#A23E78;strokeWidth=1.5;fontSize=10;fontColor=#7a2856;labelBackgroundColor=#ffffff;";
const RET = "edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;endArrow=classic;endFill=1;dashed=1;strokeColor=#3E8E5E;strokeWidth=2.5;fontSize=11;fontColor=#2c6444;labelBackgroundColor=#ffffff;";

// luồng chính trên
edge("user","s1","hỏi", FWD + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
edge("s1","s2","nguồn + filter", FWD + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
edge("s2","dbdomain","query", LOAD + "exitX=0.5;exitY=1;entryX=0.5;entryY=0;");
// ① → ③ (xuống khối hybrid khi nguồn gồm 'doc')
edge("s1","s3embed","nếu cần tài liệu", PIPE + "exitX=0.4;exitY=1;entryX=0.5;entryY=0;", [{x:310,y:330},{x:135,y:330}]);
// trong hybrid
edge("s3embed","dense","", PIPE + "exitX=1;exitY=0.3;entryX=0;entryY=0.5;", [{x:230,y:413},{x:230,y:406}]);
edge("s3embed","sparse","", PIPE + "exitX=1;exitY=0.7;entryX=0;entryY=0.5;", [{x:230,y:438},{x:230,y:484}]);
edge("dense","rrf","", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.35;", [{x:452,y:406},{x:452,y:440}]);
edge("sparse","rrf","", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.7;", [{x:452,y:484},{x:452,y:463}]);
edge("dbkb","s3embed","nạp chunk", LOAD + "exitX=0.3;exitY=1;entryX=0.5;entryY=0;", [{x:310,y:330},{x:135,y:330}]);
// ③ → ④ rerank → ⑤ context → ⑥ generate (lên cột phải)
edge("rrf","s4","N ứng viên", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;");
edge("s4","s5","top-K", PIPE + "exitX=0.5;exitY=0;entryX=0.5;entryY=1;");
edge("s2","s5","thẻ DB", PIPE + "exitX=1;exitY=0.5;entryX=0;entryY=0.5;", [{x:720,y:148},{x:720,y:280}]);
edge("s5","s6","ngữ cảnh", PIPE + "exitX=0.5;exitY=0;entryX=0.5;entryY=1;");
// trả lời về user (vòng trên)
edge("s6","user","câu trả lời + thẻ", RET + "exitX=0.5;exitY=0;entryX=0.5;entryY=0;", [{x:865,y:70},{x:115,y:70}]);

const PW = 1015, PH = 560;
const title = `<mxCell id="ttl" value="TripMate — Pipeline RAG v2 đầy đủ (Router → Hybrid → Rerank → Generate)" style="text;html=1;align=center;fontStyle=1;fontSize=14;fontColor=#ab2d00;" vertex="1" parent="1"><mxGeometry x="0" y="28" width="${PW}" height="30" as="geometry"/></mxCell>`;
const xml = `<mxGraphModel dx="1200" dy="800" grid="0" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${PW}" pageHeight="${PH}" math="0" shadow="0"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${title}${cells.join("")}</root></mxGraphModel>`;
writeFileSync(new URL("./tripmate-rag-pipeline.drawio", import.meta.url), `<mxfile host="app.diagrams.net"><diagram name="Pipeline RAG v2 đầy đủ" id="rp">${xml}</diagram></mxfile>`);
console.log(`→ Đã ghi tripmate-rag-pipeline.drawio (page ${PW}×${PH})`);
