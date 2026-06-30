// TripMate — sơ đồ kiến trúc hệ thống. Dựng bằng drawio-ai-kit layout engine (KHÔNG hardcode toạ độ).
// Bố cục TẦNG DỌC (top-down): Client → Frontend → Backend(Render) → Data + Dịch vụ ngoài.
// Chạy:  node docs/diagrams/tripmate-architecture.build.mjs
import { writeFileSync } from "node:fs";
import { Diagram } from "file:///C:/Users/Asus/drawio-ai-kit/src/builder.mjs";
import { frame, grid, icon, renderTree, ossBox, endpoint } from "file:///C:/Users/Asus/drawio-ai-kit/src/layout-engine.mjs";

const d = new Diagram("network", { title: "TripMate / TravelSocial — Kiến trúc hệ thống" });

// --- Brand logo ngoài catalog (Vercel, Gemini) → nạp vào catalog runtime để icon()+validate nhận ---
const CDN = "https://unpkg.com/@lobehub/icons-static-svg@1.91.0/icons";
const IMG = (f) => `shape=image;html=1;imageAspect=0;aspect=fixed;verticalLabelPosition=bottom;verticalAlign=top;image=${CDN}/${f}.svg`;
for (const [name, file] of [["vercel_logo", "vercel"], ["gemini_logo", "gemini-color"]]) {
  d.c.byName.set(name, { name, style: IMG(file), w: 48, h: 48, kind: "icon" });
  d.c.validNames.add(name);
}

// --- Tầng 1: Client ---
const tier1 = frame("t1", "1 · Người dùng & Client", { dir: "row", gap: 50 }, [
  icon("web", "vercel_logo", "Web App · React 18 + Vite\nHost: Vercel (CDN)"),
  icon("mobile", "mobile_client", "Mobile · Capacitor (Android)"),
]);

// --- Tầng 2: Backend trên Render (NestJS) ---
const tier2 = frame("t2", "2 · Backend · Render — NestJS 10 + TypeORM", { dir: "row", gap: 40 }, [
  ossBox("ws", "Socket.IO Gateway\nchat realtime (WS)"),
  ossBox("api", "REST API\nJWT · Passport · 15 module"),
  ossBox("ai", "AI Assistant v1\nHIỂU→LÀM→TRẢ · RAG 63 tỉnh"),
  ossBox("rag", "RAG v2 Agent\ntool-calling + vector"),
]);

// --- Tầng 3: Lưu trữ + Dịch vụ bên thứ ba (provider xếp ngay dưới consumer) ---
// Thứ tự tầng 2: ws · api · ai · rag → xếp tầng 3 sao cho consumer ở ngay trên:
//   fb/smtp/sepay (←api) · db (hub, ←tất cả) · gemini (←ai,rag) · openai (←rag)
const tier3 = frame("t3", "3 · Lưu trữ & Dịch vụ bên thứ ba", { dir: "row", gap: 36, align: "top" }, [
  icon("fb", "firestore", "Firebase Storage\n(ảnh upload)"),
  icon("smtp", "email", "SMTP\nOTP email"),
  ossBox("sepay", "SePay\nthanh toán · ví"),
  icon("db", "postgres", "PostgreSQL 16\n+ vector store (jsonb)"),
  icon("gemini", "gemini_logo", "Google Gemini\nLLM + embedding"),
  icon("openai", "openai", "OpenAI\n(tùy chọn)"),
]);

const root = frame("root", "", { dir: "col", gap: 70, align: "center", header: 0, pad: 10, fill: "none", stroke: "none" }, [
  endpoint("user", "Khách & Thành viên"),
  tier1, tier2, tier3,
]);
renderTree(d, root, [40, 90]);

// --- Luồng dữ liệu (chủ yếu đi xuống → ít cắt nhau) ---
d.link("user", "web", "dùng");
d.link("user", "mobile", "dùng");
d.link("web", "api", "REST /api", { flow: true });
d.link("web", "ws", "WebSocket");
d.link("mobile", "api", "REST /api");
// api là hub → fan-out xuống tầng lưu trữ/dịch vụ
d.link("api", "fb", "upload ảnh");
d.link("api", "smtp", "gửi OTP");
d.link("api", "sepay", "tạo QR nạp");
d.link("api", "db", "TypeORM", { flow: true });
d.link("sepay", "api", "webhook", { dash: true });
d.link("ws", "db", "lưu tin nhắn");
// tầng AI
d.link("ai", "db", "RAG kiến thức");
d.link("ai", "gemini", "LLM");
d.link("rag", "db", "vector cosine");
d.link("rag", "gemini", "embed + chat");
d.link("rag", "openai", "tùy chọn");

const res = d.validate();
console.log("VALIDATE:", JSON.stringify({ ok: res.ok, errors: res.errors, warnings: res.warnings, advice: res.audit?.advice }, null, 2));
writeFileSync(new URL("./tripmate-architecture.drawio", import.meta.url), d.mxfile("TripMate — Kiến trúc hệ thống"));
console.log("→ Đã ghi tripmate-architecture.drawio");
