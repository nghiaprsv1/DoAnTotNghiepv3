# Sơ đồ kiến trúc TripMate

Thư mục này chứa sơ đồ kiến trúc hệ thống, dựng bằng [drawio-ai-kit](https://github.com/sparklabx/drawio-ai-kit) (layout engine — không hardcode toạ độ).

## File

| File | Mô tả |
|---|---|
| `tripmate-architecture.drawio` | Sơ đồ kiến trúc hệ thống — mở bằng [draw.io](https://app.diagrams.net) hoặc extension **Draw.io Integration** trong VS Code |
| `tripmate-architecture.build.mjs` | Script sinh ra file kiến trúc (nguồn sự thật, sửa ở đây rồi build lại) |
| `tripmate-usecase.drawio` | Sơ đồ **Use Case** tổng quát toàn hệ thống (UML) |
| `tripmate-usecase.build.mjs` | Script sinh sơ đồ use case (layout tự động theo số use case/gói) |
| `tripmate-usecase-web.build.mjs` | Script sinh **trang web** `docs/so-do-usecase.html` — sơ đồ use case SVG (tự layout) + bảng chi tiết 28 use case ánh xạ tới endpoint REST thật (đọc từ 15 controller NestJS) |
| `tripmate-chatbubble.drawio` | Sơ đồ **kiến trúc bong bóng chat AI** (AIChatBubble ⇄ RAG v2 Agent) |
| `tripmate-chatbubble.build.mjs` | Script sinh sơ đồ bong bóng chat |

## Cách mở

- **VS Code:** cài extension *Draw.io Integration* (hediet.vscode-drawio) → mở thẳng file `.drawio`.
- **Web:** lên https://app.diagrams.net → File → Open → chọn `.drawio`.

## Build lại sau khi sửa

```bash
node docs/diagrams/tripmate-architecture.build.mjs   # sơ đồ kiến trúc
node docs/diagrams/tripmate-usecase.build.mjs         # sơ đồ use case
node docs/diagrams/tripmate-usecase-web.build.mjs     # trang web use case (so-do-usecase.html)
node docs/diagrams/tripmate-chatbubble.build.mjs      # sơ đồ bong bóng chat AI
```

Script kiến trúc tự validate (kiểm tra icon thật, hình học) rồi ghi đè file `.drawio`. Cần drawio-ai-kit đã cài ở `C:\Users\Asus\drawio-ai-kit` (đường dẫn import tuyệt đối trong script). Script use case không phụ thuộc kit (dùng shape UML gốc của draw.io), chạy độc lập.

## Nội dung — Kiến trúc (`tripmate-architecture`, 3 tầng top-down)

1. **Client** — Web App (React 18 + Vite, host Vercel/CDN) · Mobile (Capacitor/Android)
2. **Backend · Render** — NestJS 10 + TypeORM: REST API (JWT/Passport, 15 module) · Socket.IO Gateway (chat realtime) · AI Assistant v1 (RAG 63 tỉnh) · RAG v2 Agent (tool-calling + vector)
3. **Lưu trữ & Dịch vụ ngoài** — PostgreSQL 16 (+ vector store jsonb) · Firebase Storage · SMTP (OTP) · SePay (thanh toán) · Google Gemini (LLM+embedding) · OpenAI (tùy chọn)

> Xuất PNG/SVG cần cài draw.io Desktop CLI; hiện chưa có nên deliverable mặc định là file `.drawio`.

## Nội dung — Use Case (`tripmate-usecase`)

**3 tác nhân** (generalization: Hướng dẫn viên kế thừa Du khách):
- **Du khách (Traveler)** — tài khoản & xác thực, theo dõi người dùng, tìm/xem chuyến đi · địa điểm · HDV · bảng tin, chat trợ lý AI + tạo chuyến từ AI, quản lý/tham gia chuyến + chat nhóm, mạng xã hội, lưu nội dung, đánh giá, nạp ví, đặt HDV, đăng ký làm HDV, nhắn tin, thông báo
- **Hướng dẫn viên (Guide)** — kế thừa toàn bộ của Du khách, thêm: quản lý lịch & booking, ví & rút tiền
- **Quản trị viên (Admin)** — quản lý người dùng/HDV, kiểm duyệt nội dung, duyệt rút tiền, thống kê & doanh thu

28 use case nhóm trong 9 gói: Tài khoản & Xác thực · Khám phá · Trợ lý AI · Chuyến đi · Mạng xã hội · Thanh toán · Hướng dẫn viên · Tin nhắn & Thông báo · Quản trị.

> Use case gộp ở mức tổng quát (vd "Quản lý chuyến đi" = tạo/sửa/xoá). Cần sơ đồ chi tiết từng module thì tách riêng sau.

## Nội dung — Bong bóng chat AI (`tripmate-chatbubble`)

Luồng đầy đủ của trợ lý AI nổi (`AIChatBubble`), đọc từ code thật, 6 tầng top-down:

1. **Frontend UI** — `AIChatBubble.tsx`: FAB nổi → Panel (Header/menu · Body danh sách tin nhắn `MessageRow`/`ResultCard`/`SuggestionCard` · Composer + quick prompts)
2. **FE State & Service** — `aiAssistantStore` (Zustand persist) · `aiAssistantService.ask(query, history, draft)` · `axiosInstance` (Bearer + timeout 120s)
3. **Backend NestJS** — `RagV2Controller` `POST /rag-v2/ask` → `RagV2Service.ask()` → `runRagAgent` (vòng ReAct ≤5 vòng)
4. **LLM điều phối** — `RagChat.chatWithTools()` (function calling) → Google Gemini (mặc định, `thinkingBudget=0`) / OpenAI (tùy chọn), chọn theo `RAGV2_LLM_PROVIDER`
5. **6 công cụ agent tự gọi** (`rag-tools.ts`) — `search_trips/places/guides/posts` · `search_documents` (embed → DENSE cosine + BM25 → RRF) · `create/revise_itinerary`
6. **PostgreSQL 16** — `rag_knowledge_chunks` (vector jsonb) · các entity domain Trip/Place/GuideProfile/Post (retriever đọc trực tiếp)

> Đây là vòng **agentic (ReAct)**: agent ⇄ LLM ⇄ tools có phản hồi 2 chiều nên sơ đồ có một số đường giao nhau — phản ánh đúng bản chất tool-calling, không phải lỗi layout. Bong bóng KHÔNG hiển thị trace (chỉ trang `/chatbot-v2` mới hiện).
