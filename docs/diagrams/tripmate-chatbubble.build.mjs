// TripMate — Kiến trúc BONG BÓNG CHAT (AIChatBubble → RAG v2 Agent). Layout engine, không hardcode toạ độ.
// Luồng: UI nổi → store/service FE → HTTP → NestJS controller/service → ReAct agent → 6 tool → LLM + Postgres.
// Chạy: node docs/diagrams/tripmate-chatbubble.build.mjs
import { writeFileSync } from "node:fs";
import { Diagram } from "file:///C:/Users/Asus/drawio-ai-kit/src/builder.mjs";
import { frame, grid, icon, renderTree, ossBox, endpoint } from "file:///C:/Users/Asus/drawio-ai-kit/src/layout-engine.mjs";

const d = new Diagram("network", { title: "TripMate — Kiến trúc bong bóng chat AI (AIChatBubble ⇄ RAG v2 Agent)" });

// brand logo Gemini vào catalog runtime
const CDN = "https://unpkg.com/@lobehub/icons-static-svg@1.91.0/icons";
d.c.byName.set("gemini_logo", { name: "gemini_logo", style: `shape=image;html=1;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;image=${CDN}/gemini-color.svg`, w: 48, h: 48, kind: "icon" });
d.c.validNames.add("gemini_logo");

// === Tầng 1: UI bong bóng (React) ===
const tier1 = frame("t1", "1 · Frontend UI — AIChatBubble.tsx (React, hiện mọi trang)", { dir: "row", gap: 34 }, [
  ossBox("fab", "FAB nổi\n(nút mở, góc phải-dưới)"),
  frame("panel", "Panel chat (popover)", { dir: "col", gap: 14 }, [
    ossBox("header", "Header · menu\n(Xoá hội thoại / Tắt)"),
    ossBox("body", "Body — danh sách tin nhắn\nMessageRow · ResultCard · SuggestionCard"),
    ossBox("composer", "Composer\n(ô nhập + nút gửi) · Quick prompts"),
  ]),
]);

// === Tầng 2: State + Service FE ===
const tier2 = frame("t2", "2 · FE State & Service", { dir: "row", gap: 34 }, [
  ossBox("store", "aiAssistantStore (Zustand)\npersist messages · enabled · isOpen"),
  ossBox("svc", "aiAssistantService\nask(query, history, draft) · createTrip()"),
  ossBox("axios", "axiosInstance\nBearer + auto-refresh · timeout 120s"),
]);

// === Tầng 3: Backend NestJS RAG v2 — ĐẢO thứ tự (ctrl phải, dưới axios) để trục request thẳng ===
const tier3 = frame("t3", "3 · Backend NestJS — module ragv2 (@Public)", { dir: "row", gap: 34 }, [
  ossBox("agent", "runRagAgent — vòng ReAct\nReason → Act → Observe (≤5 vòng)"),
  ossBox("service", "RagV2Service.ask()\n→ askWithAgent()"),
  ossBox("ctrl", "RagV2Controller\nPOST /rag-v2/ask {question, history, draft}"),
]);

// === Tầng 4: LLM (điều phối tool-calling) ===
const tier4 = frame("t4", "4 · LLM — điều phối (function calling)", { dir: "row", gap: 30 }, [
  ossBox("chat", "RagChat.chatWithTools()\nfactory theo RAGV2_LLM_PROVIDER"),
  icon("gemini", "gemini_logo", "Google Gemini\n(mặc định) thinkingBudget=0"),
  icon("openai", "openai", "OpenAI\n(tùy chọn)"),
]);

// === Tầng 5: 6 Tool (agent tự gọi) ===
const tier5 = grid("t5", null, "5 · Bộ công cụ — agent tự gọi (rag-tools.ts)", { cols: 3, gap: 22 }, [
  ossBox("t_trip", "search_trips"),
  ossBox("t_place", "search_places"),
  ossBox("t_guide", "search_guides"),
  ossBox("t_post", "search_posts"),
  ossBox("t_doc", "search_documents\nembed → DENSE cosine + BM25 → RRF"),
  ossBox("t_itin", "create / revise_itinerary\n(dựng lộ trình JSON)"),
]);

// === Tầng 6: Lưu trữ ===
const tier6 = frame("t6", "6 · PostgreSQL 16", { dir: "row", gap: 30 }, [
  icon("kb", "postgres", "rag_knowledge_chunks\nvector (jsonb) + nội dung"),
  icon("domain", "postgres", "Trip · Place · GuideProfile · Post\n(retriever ĐỌC trực tiếp)"),
]);

const root = frame("root", "", { dir: "col", gap: 58, align: "center", header: 0, pad: 10, fill: "none", stroke: "none" }, [
  endpoint("user", "Người dùng"),
  tier1, tier2, tier3, tier4, tier5, tier6,
]);
renderTree(d, root, [40, 90]);

// --- Luồng REQUEST (đi xuống) ---
d.link("user", "fab", "mở");
d.link("fab", "panel", "hiện");
d.link("composer", "svc", "gửi câu hỏi", { flow: true });
d.link("svc", "store", "add/update msg → body render");
d.link("svc", "axios", "");
d.link("axios", "ctrl", "POST /rag-v2/ask", { flow: true });
d.link("ctrl", "service", "");
d.link("service", "agent", "");
// agent ⇄ LLM (quyết định gọi tool nào)
d.link("agent", "chat", "câu hỏi + lịch sử + schema 6 tool");
d.link("chat", "agent", "tool_calls", { dash: true });
d.link("chat", "gemini", "", { role: "fanout" });
d.link("chat", "openai", "", { role: "fanout" });
// agent chạy tool (fan-out 6 tool)
d.link("agent", "t_trip", "", { role: "fanout" });
d.link("agent", "t_place", "", { role: "fanout" });
d.link("agent", "t_guide", "", { role: "fanout" });
d.link("agent", "t_post", "", { role: "fanout" });
d.link("agent", "t_doc", "", { role: "fanout" });
d.link("agent", "t_itin", "", { role: "fanout" });
// tool đọc dữ liệu
d.link("t_trip", "domain", "", { role: "fanin" });
d.link("t_place", "domain", "", { role: "fanin" });
d.link("t_guide", "domain", "", { role: "fanin" });
d.link("t_post", "domain", "", { role: "fanin" });
d.link("t_doc", "kb", "cosine + BM25");
d.link("t_itin", "chat", "sinh JSON lộ trình", { dash: true });
// --- RESPONSE về UI ---
d.link("service", "svc", "answer + cards + suggestion", { dash: true });

const res = d.validate();
console.log("VALIDATE:", JSON.stringify({ ok: res.ok, errors: res.errors, warnings: res.warnings, advice: res.audit?.advice }, null, 2));
writeFileSync(new URL("./tripmate-chatbubble.drawio", import.meta.url), d.mxfile("TripMate — Kiến trúc bong bóng chat AI"));
console.log("→ Đã ghi tripmate-chatbubble.drawio");
