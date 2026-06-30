import { writeFileSync } from 'node:fs';
import { Diagram } from 'file:///C:/Users/Asus/drawio-ai-kit/src/builder.mjs';
import { frame, stage, band, endpoint, ossBox, icon, renderTree } from 'file:///C:/Users/Asus/drawio-ai-kit/src/layout-engine.mjs';

// Vẽ một cạnh dài đi vòng hẳn lên trên (side:'top') hoặc xuống dưới (side:'bottom')
// để hai đường dài (loop-back ReAct vs final answer) nằm ở 2 lane khác nhau, không chồng nhau.
function rawEdge(d, src, tgt, label, { side, dashed = false, laneIds = [] }) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const a = d.R[src], b = d.R[tgt];
  const rs = laneIds.map((i) => d.R[i]).filter(Boolean);
  const top = Math.min(...rs.map((r) => r.y));
  const bot = Math.max(...rs.map((r) => r.y + r.h));
  const sx = Math.round(a.x + a.w / 2), tx = Math.round(b.x + b.w / 2);
  let pins, lane;
  if (side === 'top') {
    lane = Math.round(top - 22);
    pins = 'exitX=0.5;exitY=0;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;';
  } else {
    lane = Math.round(bot + 26);
    pins = 'exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=1;entryDx=0;entryDy=0;';
  }
  let st = 'edgeStyle=orthogonalEdgeStyle;html=1;jettySize=auto;orthogonalLoop=1;fontSize=10;fontColor=#5A6B7B;strokeColor=#5A6B7B;strokeWidth=1.5;rounded=0;';
  if (dashed) st += 'dashed=1;';
  if (label) st += 'labelBackgroundColor=light-dark(#ffffff,#0f1620);';
  st += pins;
  const pts = `<Array as="points"><mxPoint x="${sx}" y="${lane}"/><mxPoint x="${tx}" y="${lane}"/></Array>`;
  d.cells.push(`<mxCell id="ed${++d.eid}" value="${esc(label)}" style="${st}" edge="1" parent="1" source="${src}" target="${tgt}"><mxGeometry relative="1" as="geometry">${pts}</mxGeometry></mxCell>`);
}


function buildAgenticRagPage() {
  const d = new Diagram('pipeline', { page: [1600, 760] });

  const client = endpoint('user', 'NGƯỜI DÙNG\n\ncâu hỏi du lịch', { w: 160, h: 100 });

  const frontend = stage('fe_stage', 0, '1 · Frontend', [
    ossBox('chatbot_v2', 'ChatbotV2Page\ngọi ragV2Service.ask()', { w: 200, h: 84 }),
  ], { gap: 18 });

  const backend = stage('be_stage', 1, '2 · Backend', [
    ossBox('api', 'POST /rag-v2/ask\nRagV2Service', { w: 200, h: 84 }),
  ], { gap: 18 });

  const agent = stage('agent_stage', 2, '3 · Agent (ReAct)', [
    ossBox('agent_loop', 'runRagAgent()\nLLM chọn tool ↔ observation', { w: 220, h: 100 }),
  ], { gap: 18 });

  const tools = stage('tool_stage', 3, '4 · Tools', [
    ossBox('search_tools', 'search_trips / places\nguides / posts', { w: 200, h: 78 }),
    ossBox('rag_tool', 'search_documents\n(Hybrid RAG)', { w: 200, h: 70 }),
    ossBox('itinerary_tools', 'create / revise_itinerary', { w: 200, h: 56 }),
  ], { gap: 16 });

  const data = stage('data_stage', 4, '5 · Dữ liệu', [
    icon('postgres', 'postgres', 'PostgreSQL\nTrips · Places · Guides · Posts'),
    ossBox('vector_store', 'rag_knowledge_chunks\nvector + nội dung', { w: 200, h: 78 }),
  ], { gap: 18 });

  const result = endpoint('result', 'KẾT QUẢ UI\n\nanswer · cards\nsuggestion', { w: 200, h: 116 });

  const main = frame('main', '', { dir: 'row', gap: 44, align: 'top', header: 0, fill: 'none', stroke: 'none' }, [
    client,
    frontend,
    backend,
    agent,
    tools,
    data,
    result,
  ]);
  const root = frame('root', '', { dir: 'col', gap: 34, align: 'center', header: 0, pad: 12, fill: 'none', stroke: 'none' }, [main]);

  renderTree(d, root, [30, 80]);
  d.title('Luồng Agentic RAG / ReAct của Chatbot TripMate');

  d.link('user', 'chatbot_v2', 'câu hỏi', { flow: true });
  d.link('chatbot_v2', 'api', 'HTTP', { flow: true });
  d.link('api', 'agent_loop', 'chạy agent', { flow: true });
  d.link('agent_loop', 'search_tools', 'gọi tool', { role: 'fanout' });
  d.link('agent_loop', 'rag_tool', 'gọi tool', { role: 'fanout' });
  d.link('agent_loop', 'itinerary_tools', 'gọi tool', { role: 'fanout' });
  d.link('search_tools', 'postgres', 'query', { role: 'fanout' });
  d.link('rag_tool', 'vector_store', 'retrieval', { role: 'fanout' });
  // Hai đường dài tách lane: observation (loop ReAct) đi vòng phía DƯỚI,
  // câu trả lời cuối đi vòng phía TRÊN — không chồng lên nhau và không cắt qua các cụm.
  rawEdge(d, 'agent_loop', 'result', 'câu trả lời grounded', { side: 'top', laneIds: ['agent_stage', 'tool_stage', 'data_stage'] });
  rawEdge(d, 'data_stage', 'agent_loop', 'observation (lặp ReAct)', { side: 'bottom', dashed: true, laneIds: ['agent_stage', 'tool_stage', 'data_stage'] });

  return d;
}

function buildSearchDocumentsPage() {
  const d = new Diagram('pipeline', { page: [1600, 620] });

  const query = endpoint('query', 'INPUT\n\nquestion', { w: 150, h: 90 });

  const route = stage('route_stage', 0, '1 · Rewrite', [
    ossBox('rewrite', 'routeAndRewrite()\nrewrite + filters', { w: 190, h: 84 }),
  ], { gap: 18 });

  const embed = stage('embed_stage', 1, '2 · Embed', [
    ossBox('embed_query', 'embed query\n→ query vector', { w: 190, h: 84 }),
  ], { gap: 18 });

  const hybrid = stage('hybrid_stage', 2, '3 · Hybrid Search', [
    ossBox('search', 'Dense (cosine)\n+ Sparse (BM25)', { w: 190, h: 84 }),
  ], { gap: 18 });

  const rank = stage('rank_stage', 3, '4 · Rerank', [
    ossBox('rerank', 'RRF Fusion\n+ LLM rerank → top-K', { w: 200, h: 84 }),
  ], { gap: 18 });

  const output = stage('output_stage', 4, '5 · Observation', [
    ossBox('observation', 'Doc hits\n→ observation', { w: 190, h: 84 }),
  ], { gap: 18 });

  const agent = endpoint('agent_out', 'OUTPUT\n\ncâu trả lời\ngrounded', { w: 170, h: 100 });

  const main = frame('main', '', { dir: 'row', gap: 48, align: 'top', header: 0, fill: 'none', stroke: 'none' }, [
    query,
    route,
    embed,
    hybrid,
    rank,
    output,
    agent,
  ]);
  const root = frame('root', '', { dir: 'col', gap: 36, align: 'center', header: 0, pad: 12, fill: 'none', stroke: 'none' }, [main]);

  renderTree(d, root, [30, 80]);
  d.title('Pipeline search_documents: Hybrid RAG + Rerank');

  d.link('query', 'rewrite', '', { flow: true });
  d.link('rewrite', 'embed_query', '', { flow: true });
  d.link('embed_query', 'search', '', { flow: true });
  d.link('search', 'rerank', '', { flow: true });
  d.link('rerank', 'observation', '', { flow: true });
  d.link('observation', 'agent_out', '', { flow: true });

  return d;
}

const d1 = buildAgenticRagPage();
const d2 = buildSearchDocumentsPage();

const v1 = d1.validate({ strict: false });
const v2 = d2.validate({ strict: false });
console.log('VALIDATE page1:', JSON.stringify({ ok: v1.ok, errors: v1.errors, warnings: v1.warnings }));
console.log('VALIDATE page2:', JSON.stringify({ ok: v2.ok, errors: v2.errors, warnings: v2.warnings }));

const page1 = d1.toXML();
const page2 = d2.toXML();

const mxfile = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio-ai-kit" modified="2026-06-30T00:00:00.000Z" agent="drawio-ai-kit" version="24.7.17">
  <diagram id="agentic-rag" name="Luồng Agentic RAG">${page1}</diagram>
  <diagram id="search-documents" name="Pipeline search_documents">${page2}</diagram>
</mxfile>`;

writeFileSync('C:/DoAnTotNghiepv3/rag-chatbot-architecture.drawio', mxfile, 'utf8');
console.log('Wrote C:/DoAnTotNghiepv3/rag-chatbot-architecture.drawio');
