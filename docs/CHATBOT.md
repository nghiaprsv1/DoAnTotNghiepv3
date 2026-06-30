# Tài liệu Chatbot — TripMate / TravelSocial

> Mô tả đầy đủ **cấu trúc, mô hình xử lý từ đầu đến cuối** của hệ thống chatbot AI, và **tất cả các trường hợp câu hỏi** cùng cách hệ thống xử lý từng loại.
>
> Cập nhật: 2026-06-27. Nguồn sự thật: `backend/src/modules/ragv2/*`, `backend/src/modules/ai/*`, `frontend/src/components/common/AIChatBubble/*`, `frontend/src/pages/ChatbotV2/*`.

---

## 0. Tóm tắt nhanh (TL;DR)

- Hệ thống có **2 chatbot độc lập**:
  - **Chatbot v1** (`/api/ai/ask`) — pipeline cố định 3 bước **HIỂU → LÀM → TRẢ** + RAG kho 63 tỉnh. Đa LLM provider (`LLM_PROVIDER`: gemini mặc định / local Qwen / template).
  - **Chatbot v2 RAG** (`/api/rag-v2/ask`) — **kiến trúc AGENT (tool-calling / ReAct)** mặc định bật. LLM tự quyết gọi 6 công cụ. Đa provider (`RAGV2_LLM_PROVIDER`: openai hiện hành / gemini).
- **Bong bóng chat nổi** (`AIChatBubble`, hiện trên mọi trang) **gọi v2** (`/rag-v2/ask`), KHÔNG hiện trace.
- **Trang thử nghiệm** `/chatbot-v2` cũng gọi v2 nhưng **hiện đầy đủ trace** (phương pháp thực thi) + thẻ kết quả.
- Khi cần "Tạo chuyến" từ lộ trình AI gợi ý → cả 2 đều dùng chung endpoint `POST /api/ai/create-trip`.

---

## 1. Bản đồ kiến trúc tổng thể

```
                         NGƯỜI DÙNG
                            │
      ┌─────────────────────┴──────────────────────┐
      │                                             │
┌─────▼─────────────┐                   ┌───────────▼──────────────┐
│ AIChatBubble       │                   │ Trang /chatbot-v2         │
│ (bong bóng nổi)    │                   │ (standalone, có TracePanel)│
│ services/          │                   │ services/ragV2Service.ts   │
│ aiAssistantService │                   │                            │
└─────┬─────────────┘                   └───────────┬──────────────┘
      │ POST /api/rag-v2/ask                         │ POST /api/rag-v2/ask
      │ {question, draft?, history?}                 │ (hiện cả trace)
      └─────────────────────┬───────────────────────┘
                            │
                ┌───────────▼─────────────┐
                │ RagV2Controller          │  @Public (không cần auth)
                │ /api/rag-v2/{status|ingest|ask}
                └───────────┬─────────────┘
                            │
                ┌───────────▼─────────────┐
                │ RagV2Service.ask()       │
                │  ├─ RAGV2_AGENT=true  ──▶ askWithAgent()  ──▶ runRagAgent() [ReAct]
                │  └─ RAGV2_AGENT=false ──▶ pipeline 7 bước cũ (router→retrieve→…→generate)
                └───────────┬─────────────┘
                            │
        ┌───────────────────┼─────────────────────────────┐
        │                   │                             │
┌───────▼──────┐   ┌────────▼─────────┐        ┌──────────▼──────────┐
│ 4 RETRIEVER  │   │ search_documents │        │ create/revise        │
│ DB (SQL)     │   │ (vector + BM25)  │        │ _itinerary (LLM JSON)│
│ trip/place/  │   │ → embedding +    │        │                      │
│ guide/post   │   │   RRF trên chunk │        │                      │
└───────┬──────┘   └────────┬─────────┘        └──────────┬──────────┘
        │                   │                             │
   PostgreSQL          rag_knowledge_chunks          LLM provider
   (bảng thật)         (jsonb embedding)             (OpenAI/Gemini qua proxy)
```

---

## 2. Hai chatbot — phân biệt rõ

| | **Chatbot v1** | **Chatbot v2 (RAG)** |
|---|---|---|
| Module BE | `modules/ai` | `modules/ragv2` |
| Endpoint hỏi | `POST /api/ai/ask` | `POST /api/rag-v2/ask` |
| Mô hình | Pipeline cố định 3 bước HIỂU→LÀM→TRẢ | **Agent ReAct (tool-calling)** mặc định; pipeline 7 bước cũ giữ lại để so sánh |
| Nguồn tri thức | Kho 63 tỉnh (`provinces-kb.ts` → bảng `provinces`) | Tài liệu vector (`documemtRAG/*.txt`) + 4 bảng DB thật (trips/places/guides/posts) |
| Provider env | `LLM_PROVIDER` (gemini/local/template) | `RAGV2_LLM_PROVIDER` (openai/gemini) |
| Bong bóng chat dùng? | KHÔNG (đã chuyển sang v2) | **CÓ** — `AIChatBubble` gọi v2 |
| Hiện trace? | Không | Có (chỉ trang `/chatbot-v2`); bong bóng thì ẩn |
| Tạo chuyến | `POST /api/ai/create-trip` | Dùng chung `POST /api/ai/create-trip` |

> **Lưu ý quan trọng:** bong bóng chat trên toàn site **gọi v2**. v1 vẫn tồn tại ở backend nhưng FE bong bóng không gọi `/ai/ask` nữa. Tài liệu này tập trung chủ yếu vào **v2** (vì đó là cái user thực sự dùng), v1 mô tả ở §9.

---

## 3. Chatbot v2 — Kiến trúc AGENT (ReAct) — mặc định

File chính: `backend/src/modules/ragv2/ragv2.agent.ts` + `ragv2.service.ts:askWithAgent()`.

### 3.1. Vòng lặp ReAct (Reason → Act → Observe)

```
   câu hỏi + history + draft (nếu có)
            │
            ▼
   ┌──────────────────────────────────────────┐
   │ messages = [ ...6 lượt history gần nhất,   │
   │   { SYSTEM_PROMPT + draftContext           │
   │     + "=== CÂU HỎI HIỆN TẠI ===" + q } ]   │
   └──────────────────┬───────────────────────┘
                      │
        ┌─────────────▼──────────────┐   vòng for (round < maxSteps=5)
        │ chat.chatWithTools(messages,│◀──────────────┐
        │   tools, {temp:0.3, mx:1024})│               │
        └─────────────┬──────────────┘               │
                      │                               │
         có tool_calls?│                              │
            ┌──────────┴──────────┐                   │
           CÓ                    KHÔNG                 │
            │                      │                   │
   ┌────────▼────────┐    answer = content            │
   │ executeTool()    │    → BREAK (trả lời cuối)      │
   │ cho từng call:   │                                │
   │  - chạy retriever│                                │
   │    / doc / LLM   │    nhồi observation (role=tool)│
   │  - gom cards     │────────────────────────────────┘
   │  - gom suggestion│
   └─────────────────┘
            │ (chạm trần maxSteps mà chưa có answer)
            ▼
   finalAnswer() — ép LLM chốt 1 câu từ dữ liệu đã có
            │
            ▼
   filterCardsByAnswer() — chỉ giữ thẻ mà câu trả lời thật sự nhắc tên
            │
            ▼
   { answer, cards, suggestion, trace.steps }
```

### 3.2. Số lần gọi LLM (chi phí thực) — vì sao chatbot chậm

Mỗi vòng `chatWithTools` là **1 round-trip LLM TUẦN TỰ** (chờ full response, KHÔNG streaming). Một số tool còn gọi LLM bên trong.

| Loại câu | Chuỗi gọi LLM điển hình | Số round-trip | Đo thực tế |
|---|---|---|---|
| Liệt kê/tìm DB | (1) chọn tool → chạy retriever SQL → (2) viết câu trả lời | **2** | ~6.6s |
| Tra tài liệu | (1) chọn tool → embed + RRF → (2) viết câu trả lời | 2 + 1 embed | ~7–9s |
| Tạo lộ trình | (1) chọn tool tìm → (2) `create_itinerary` (sinh JSON 2048 token) → (3) viết câu | **3–4** | ~31s |

Lý do chậm (chi tiết tại §10): nhiều call LLM nối đuôi + không streaming + proxy bên thứ ba (~1.5s/call) + sinh JSON lộ trình 2048 token một phát.

### 3.3. System prompt điều khiển hành vi agent

Tóm tắt `SYSTEM_PROMPT` (`ragv2.agent.ts:16`):
- Trả lời tiếng Việt, xưng "mình". **Cấm bịa** chuyến/địa điểm/HDV/giá — phải dùng tool lấy dữ liệu thật.
- Phân biệt **"CÁCH DÙNG WEB"** (→ `search_documents`) với **"TÌM THỰC THỂ"** (→ `search_trips/places/guides/posts`).
- Chỉ `browse=true` khi user muốn liệt kê chung; không lạm dụng để tránh kết quả rác.
- Tối đa 1–2 tool cho câu thường; không gọi lại tool với tham số gần giống.
- **Chống "dính chủ đề":** tự phát hiện câu hiện tại là tiếp nối hay chủ đề mới (đổi điểm đến → coi là yêu cầu mới, bỏ lộ trình cũ).

### 3.4. 6 (hoặc 7) công cụ agent có thể gọi

File: `backend/src/modules/ragv2/lib/rag-tools.ts`.

| Tool | Khi nào LLM gọi | Bên trong làm gì | Có gọi thêm LLM? |
|---|---|---|---|
| `search_trips` | "có chuyến nào đi X", "tour dưới Y triệu" | `TripRetriever` — SQL ILIKE + token trên trips (status=published), lọc category/giá, xếp rating | Không (0 token) |
| `search_places` | "chỗ nào đẹp ở X", "địa điểm tham quan" | `PlaceRetriever` — SQL trên places | Không |
| `search_guides` | "HDV ở X", "ai dẫn tour Sapa" | `GuideRetriever` — SQL trên guide_profiles (status=approved) | Không |
| `search_posts` | "review X", "kinh nghiệm", "bài viết về Y" | `PostRetriever` — SQL trên posts (visibility=public) | Không |
| `search_documents` | "cách thuê HDV", "mùa nào đẹp", "đặc sản X", hướng dẫn dùng web | embed câu hỏi → cosine toàn bộ chunk + BM25 → **RRF** → top đoạn (KHÔNG rerank — agent tự đánh giá) | Có (1 embedding) |
| `create_itinerary` | user muốn TẠO/LÊN lộ trình mới | `generateItinerary()` — LLM sinh JSON lộ trình (maxTokens 2048) chỉ từ context | **Có (1 LLM JSON)** |
| `revise_itinerary` | CHỈ khi đang có `draft` — user muốn sửa lộ trình đang hiện | `reviseItinerary()` — LLM viết lại JSON giữ schema | **Có (1 LLM JSON)** |

> `browse=true` (tham số của 4 tool DB): bỏ điều kiện khớp text, trả top-N theo rating. Dùng cho "liệt kê tất cả …".

### 3.5. Lọc thẻ theo câu trả lời (`filterCardsByAnswer`)

Agent gom thẻ từ **mọi** lần gọi tool (kể cả lần browse trả rác). Sau khi có câu trả lời cuối, hệ thống **chỉ giữ thẻ mà câu trả lời thật sự nhắc tên** (so khớp token tên thẻ đã bỏ dấu, cần ≥2 token trùng hoặc ≥ nửa số token). Tránh cảnh "answer nói Phú Quốc nhưng thẻ lại là Hạ Long".

---

## 4. TẤT CẢ CÁC TRƯỜNG HỢP CÂU HỎI & cách hệ thống xử lý

Đây là phần trọng tâm: phân loại mọi kiểu câu user có thể hỏi, tool agent chọn, và kết quả trả về.

### 4.1. Tìm CHUYẾN ĐI có sẵn

- **Ví dụ:** "Có chuyến nào đi Đà Lạt không?", "Tour Sapa dưới 3 triệu", "Chuyến biển 4 ngày"
- **Tool:** `search_trips` (kèm `maxBudget` nếu nêu giá, `category` nếu rõ loại hình)
- **Xử lý:** SQL trên `trips` (status=published) khớp destination/title/tags + lọc giá/category, xếp theo độ khớp cụm rồi rating, lấy top `RAGV2_DB_LIMIT` (=4).
- **Kết quả:** câu trả lời liệt kê + **thẻ trip bấm được** → `/trips/:id`.

### 4.2. Tìm ĐỊA ĐIỂM / điểm tham quan

- **Ví dụ:** "Chỗ nào đẹp ở Hội An?", "Địa điểm tham quan Phú Quốc", "Có gì chơi ở Đà Nẵng"
- **Tool:** `search_places`
- **Xử lý:** SQL trên `places`. Nếu DB chưa có → agent có thể chuyển sang `search_documents` (vài tỉnh có file tài liệu, vd `PhuQuoc.txt`).
- **Kết quả:** thẻ place → `/places/:id`.

### 4.3. Tìm / thuê HƯỚNG DẪN VIÊN (HDV)

- **Ví dụ:** "HDV ở Phú Quốc", "Có ai dẫn tour Hà Giang không?", "HDV nói tiếng Anh"
- **Tool:** `search_guides`
- **Xử lý:** SQL trên `guide_profiles` (status=approved), lọc khu vực/chuyên môn.
- **Kết quả:** thẻ guide → `/guides/:id`.
- **PHÂN BIỆT QUAN TRỌNG:** "**cách** thuê HDV" / "đăng ký làm HDV thế nào" → KHÔNG phải tìm HDV → agent dùng `search_documents` (hướng dẫn dùng web), xem §4.7.

### 4.4. Tìm BÀI VIẾT / review / kinh nghiệm

- **Ví dụ:** "Review Đà Lạt", "Kinh nghiệm đi Sapa", "Bài viết về ẩm thực Huế"
- **Tool:** `search_posts`
- **Xử lý:** SQL trên `posts` (visibility=public).
- **Kết quả:** thẻ post → `/social`.

### 4.5. LIỆT KÊ chung (browse)

- **Ví dụ:** "Liệt kê tất cả địa điểm", "Có những HDV nào?", "Cho xem các chuyến đi"
- **Tool:** tool DB tương ứng với `browse=true`
- **Xử lý:** bỏ điều kiện khớp từ khoá, trả top-N theo rating.
- **Kết quả:** danh sách thẻ xếp theo đánh giá. (Đã rõ nguồn DB → không tra tài liệu, tiết kiệm.)

### 4.6. Hỏi KIẾN THỨC điểm đến (mùa đẹp, đặc sản, mô tả)

- **Ví dụ:** "Sapa mùa nào đẹp?", "Đặc sản Cao Bằng là gì?", "Phú Quốc có gì đặc biệt?"
- **Tool:** `search_documents`
- **Xử lý:** embed câu hỏi → cosine toàn bộ chunk (`rag_knowledge_chunks`) + BM25 → RRF → top đoạn. Tài liệu nguồn: `documemtRAG/*.txt` (CaoBang, LaoCai, PhuQuoc, Vungtau, HuongDanSuDung).
- **Kết quả:** câu trả lời tổng hợp từ đoạn tài liệu (grounded khi cosine ≥ 0.3). Thường không kèm thẻ DB.

### 4.7. Hỏi CÁCH DÙNG WEBSITE (hướng dẫn / quy trình)

- **Ví dụ:** "Cách thuê HDV?", "Làm sao đặt chuyến?", "Cách nạp ví?", "Đăng ký làm HDV thế nào?", "Cách tạo chuyến"
- **Tool:** `search_documents` (file `HuongDanSuDung_LuuYDuLich.txt`)
- **Xử lý:** RAG vector trên tài liệu hướng dẫn — KHÔNG query DB.
- **Lý do tách bạch:** system prompt dạy agent phân biệt "CÁCH/QUY TRÌNH" (hướng dẫn) với "TÌM THỰC THỂ" (dữ liệu DB).

### 4.8. TẠO / LÊN lộ trình mới

- **Ví dụ:** "Gợi ý lộ trình Sapa 3 ngày", "Lên kế hoạch đi Đà Lạt cuối tuần", "Dựng lịch trình phượt Hà Giang"
- **Chuỗi tool:** thường (1) `search_places` + `search_documents` lấy dữ liệu thật → (2) `create_itinerary(request, context)`
- **Xử lý:** `generateItinerary()` gọi LLM sinh JSON `RagItinerarySuggestion` (title, destination, durationDays, summary, itinerary[] theo ngày, tags, categoryKey, estimatedBudget, maxMembers) **chỉ từ context** (cấm bịa địa danh ngoài ngữ cảnh). Bóc ngày khởi hành từ câu user nếu có (`extractDates` + `reconcileDates`).
- **Kết quả:** câu trả lời + **thẻ lộ trình** (`SuggestionCard`/`ItineraryCard`) hiện lịch từng ngày + nút **"Tạo chuyến"**.

### 4.9. CHỈNH SỬA lộ trình đang hiện (có draft)

- **Ví dụ (sau khi đã có lộ trình):** "Thêm 1 ngày", "Đổi ngày 2 sang biển", "Rẻ hơn được không?", "Chốt khởi hành 20/12, 4 người"
- **Điều kiện:** FE gửi kèm `draft` (lộ trình gần nhất chưa tạo chuyến). Agent thấy tool `revise_itinerary`.
- **Tool:** `revise_itinerary(request)`
- **Xử lý:** `reviseItinerary()` gọi LLM viết lại JSON, GIỮ schema cũ, chỉ áp thay đổi. Ngày: ưu tiên ngày user nêu, không thì giữ ngày cũ.
- **Kết quả:** lộ trình cập nhật + lời nhắc "ưng thì bấm Tạo chuyến".
- **Chống dính chủ đề:** nếu user đổi sang điểm đến KHÁC → agent coi là lộ trình MỚI (dùng `create_itinerary`), bỏ draft cũ.

### 4.10. Câu NỐI TIẾP / mơ hồ (dựa history)

- **Ví dụ:** "Còn gì nữa không?", "Ở đó còn chỗ nào chơi?", "Cái đầu tiên giá bao nhiêu?"
- **Xử lý:** 6 lượt history gần nhất được truyền vào messages dưới dạng các lượt user/assistant riêng. Agent tự suy luận ngữ cảnh. System prompt nhấn mạnh "CÂU HỎI HIỆN TẠI" là trọng tâm.

### 4.11. KHÔNG có dữ liệu / ngoài phạm vi

- **Ví dụ:** điểm đến hệ thống chưa có ("đi du lịch Nhật Bản"), câu lạc đề.
- **Xử lý:** tool trả "không tìm thấy" → system prompt cấm thử lại browse linh tinh → agent **nói thật là chưa có dữ liệu**, gợi ý hỏi rõ hơn.
- **Fallback chạm trần:** nếu hết `maxSteps=5` vòng mà chưa chốt → `finalAnswer()` ép LLM viết 1 câu từ dữ liệu đã có; nếu vẫn rỗng → câu mặc định ("Mình chưa tìm thấy thông tin phù hợp…").

### 4.12. Câu hỏi rỗng / lỗi hệ thống

- Câu rỗng → BE ném "Câu hỏi rỗng."
- Chưa cấu hình khoá LLM → ném lỗi rõ ràng.
- Tool lỗi → `executeTool` bắt lỗi, trả observation "Lỗi khi chạy tool …" (không làm sập vòng).
- LLM lỗi/timeout → axios FE timeout 120s; mỗi call có retry backoff (429/5xx).

### 4.13. Bảng tra nhanh: từ khoá → tool

| Từ khoá trong câu | Tool agent thường chọn |
|---|---|
| "chuyến", "tour", "lịch trình có sẵn", "… triệu" | `search_trips` |
| "địa điểm", "chỗ nào", "tham quan", "có gì chơi" | `search_places` |
| "HDV", "hướng dẫn viên", "dẫn tour" | `search_guides` |
| "review", "kinh nghiệm", "bài viết", "chia sẻ" | `search_posts` |
| "liệt kê", "tất cả", "có những … nào" | tool DB + `browse=true` |
| "mùa nào", "đặc sản", "có gì đặc biệt" | `search_documents` |
| "cách", "làm sao", "quy trình", "đăng ký", "nạp ví" | `search_documents` (hướng dẫn web) |
| "gợi ý lộ trình", "lên kế hoạch", "dựng lịch trình" | `create_itinerary` |
| "thêm ngày", "đổi", "rẻ hơn", "chốt ngày" (có draft) | `revise_itinerary` |

<!-- PLACEHOLDER_SECTION_5 -->

---

## 5. Luồng Frontend đầu-cuối

### 5.1. Bong bóng chat (`AIChatBubble.tsx`)

```
User gõ câu hỏi → handleSend()
  ├─ addMessage(user) + addMessage(assistant pending)   [hiện typing dots]
  ├─ history = 8 lượt gần nhất (bỏ welcome + pending)
  ├─ activeDraft = suggestion của assistant gần nhất CHƯA createTrip
  └─ askAssistant(content, history, activeDraft)
        → POST /api/rag-v2/ask {question, history, draft}   [timeout 120s]
        → updateMessage(pendingId, {answer, cards, suggestion})
```

- **Render tin nhắn** (`MessageRow`): bong bóng user (gradient) / assistant (có avatar). `cards[]` → `ResultCard` (bấm sang chi tiết). `suggestion` → `SuggestionCard` (lịch trình + nút Tạo chuyến).
- **Tạo chuyến** (`handleCreateTrip`): nếu chưa đăng nhập → `/login`. Có auth → `POST /api/ai/create-trip` → thêm tin xác nhận + link `/trips/:id`.
- **Store** `aiAssistantStore` (persist `travelsocial-ai-assistant`): `enabled, isOpen, messages`.
- **Trạng thái:** `busy` (đang chờ), `creatingId` (đang tạo chuyến), `closing` (animation đóng). Quick-prompts hiện khi ≤1 tin.

### 5.2. Trang `/chatbot-v2` (standalone, có trace)

- `services/ragV2Service.ts` → `/rag-v2/status|ingest|ask` + `createTrip()`.
- Khác bong bóng: **hiện `TracePanel`** — mọi bước (`agent_start`, `agent_tool`, `agent_final` ở chế độ agent; hoặc `query_rewrite`→`generate` ở pipeline cũ) gồm tool gọi, args, observation nguyên văn, prompt.
- `ResultCards` + `ItineraryCard` giống bong bóng.
- NGOÀI `MainLayout` — không nav, không guard.

### 5.3. Shape dữ liệu FE (`aiAssistantService.ts`)

```ts
AskResult { answer, intent, cards: AiResultCard[], suggestion?: AiTripSuggestion }
AiResultCard { source: 'doc'|'trip'|'place'|'guide'|'post', id, title, subtitle, image?, detailPath }
AiTripSuggestion { title, destination, durationDays, startDate?, endDate?, summary,
  categoryKey?, tags?, coverImage?, estimatedBudget?, maxMembers?,
  inclusions?{accommodation,transport,meals}, itinerary?[{dayNumber,title,activities[]}] }
```
> `intent` được suy ra thô ở FE (agent không phân loại): có suggestion → 'suggest'; có cards → 'inform'; còn lại → 'general'.

---

## 6. API & DTO

| Method | Endpoint | Auth | Body | Trả về |
|---|---|---|---|---|
| GET | `/api/rag-v2/status` | @Public | — | `{ready, provider, embeddingModel, chatModel, totalChunks, documents[], availableFiles[]}` |
| POST | `/api/rag-v2/ingest` | @Public | `{files?: string[]}` | kết quả nạp/index tài liệu |
| POST | `/api/rag-v2/ask` | @Public | `{question, draft?, history?[{role,content}]}` | `{answer, cards[], suggestion?, trace}` |
| POST | `/api/ai/create-trip` | **Auth** | `AiTripSuggestion` | `Trip` thật (creator = người gọi) |

---

## 7. Lưu trữ & dữ liệu

- **Vector store:** bảng `rag_knowledge_chunks` (`id, doc_name, chunk_index, content, char_count, embedding_model, embedding jsonb, created_at`). Tạo qua `ensureSchema()` (CREATE TABLE IF NOT EXISTS, không phụ thuộc synchronize).
- **Tài liệu nguồn:** `documemtRAG/*.txt|md` — hiện 5 file: `CaoBang, LaoCai, PhuQuoc, Vungtau, HuongDanSuDung_LuuYDuLich`.
- **Nạp tài liệu:** `cd backend && npm run rag:ingest` hoặc nút trên `/chatbot-v2` → chunk → embedding → lưu jsonb.
- **DB thật (4 retriever):** đọc trực tiếp `trips`, `places`, `guide_profiles`, `posts` qua repository (forFeature trong `ragv2.module.ts`) — KHÔNG cần ingest.
- ⚠️ **Đổi provider = đổi số chiều embedding** (Gemini 3072 ↔ OpenAI 1536) → BẮT BUỘC chạy lại `rag:ingest`, nếu không cosine lệch chiều.

---

## 8. Cấu hình (env) ảnh hưởng hành vi & tốc độ

| Env | Mặc định | Ý nghĩa |
|---|---|---|
| `RAGV2_LLM_PROVIDER` | `gemini` (hiện set `openai`) | Provider embedding + chat |
| `RAGV2_CHAT_MODEL` | `gpt-4o-mini` (khi openai) | Model sinh câu trả lời |
| `RAGV2_EMBEDDING_MODEL` | `text-embedding-3-small` | Model embedding (1536d) |
| `OPENAI_BASE_URL` | api.openai.com/v1 (hiện `v98store.com/v1`) | Proxy bên thứ ba |
| `RAGV2_AGENT` | `true` | true = agent ReAct; false = pipeline 7 bước cũ |
| `RAGV2_AGENT_MAX_STEPS` | `5` | Trần số vòng ReAct (chống lặp vô hạn) |
| `RAGV2_TOP_K` | `4` | Số đoạn tài liệu cho search_documents |
| `RAGV2_DB_LIMIT` | `4` | Số thẻ tối đa mỗi nguồn DB |
| `RAGV2_QUERY_REWRITE` | `true` | (pipeline cũ) viết lại câu hỏi |
| `RAGV2_RERANK` | `true` | (pipeline cũ) rerank LLM |
| `RAGV2_DB_RETRIEVAL` | `true` | Bật truy hồi DB |
| `RAGV2_CANDIDATE_K` | `12` | (pipeline cũ) ứng viên trước rerank |
| `GEMINI_THINKING_BUDGET` | `0` | Tắt thinking để JSON không bị cắt (model 2.5) |

---

## 9. Chatbot v1 — Pipeline HIỂU → LÀM → TRẢ (tham khảo)

Module `modules/ai`, endpoint `POST /api/ai/ask`. **Bong bóng chat không còn gọi cái này** nhưng vẫn hoạt động ở backend.

```
1. HIỂU   — LLM đọc câu user → ParsedTask {intent, destination, days, budget, prefs}
2. LÀM    — code thuần + query DB tìm trips/places/provinces THẬT khớp task (không LLM, không bịa)
3. TRẢ    — LLM viết câu trả lời / lộ trình tiếng Việt CHỈ từ dữ liệu thật cho sẵn
```

- **Multi-provider** (`LLM_PROVIDER`): `gemini` (mặc định) / `local` (Qwen2.5-3B GGUF self-host) / `template` (không LLM).
- **RAG kho 63 tỉnh:** `data/provinces-kb.ts` → bảng `provinces` (summary, bestSeason, specialties, highlights, knownFor). LLM chỉ được dùng địa danh/đặc sản trong "THÔNG TIN THẬT" này.
- **Hội thoại tạo chuyến (stateful qua `draft`):** parser tiếng Việt `extractFinalizeSlots()` đọc "2 triệu rưỡi", "ngày 20 tháng 12", số người… `finalize` cảnh báo trùng lịch (`findDateConflict`).
- Mỗi bước đều có fallback → chatbot không chết khi LLM lỗi.

> So sánh: v1 điều phối **cứng** (code quyết định thứ tự), v2 để **LLM tự quyết** (agent). v1 dùng để báo cáo đối chiếu; v2 là cái đang phục vụ user thực tế.

---

## 10. Hiệu năng — vì sao chatbot trả lời lâu

Đo thực tế (2026-06-27, provider openai qua proxy v98store):

| Câu | Thời gian |
|---|---|
| Liệt kê đơn giản | ~6.6s |
| Tạo lộ trình | ~31s |
| 1 round-trip LLM thô qua proxy | ~1.3–1.7s |
| 1 round-trip embedding | ~1.75s |

**Nguyên nhân gốc (theo mức tác động):**
1. **Nhiều call LLM TUẦN TỰ, KHÔNG streaming** — mỗi vòng ReAct chờ full response mới chạy tiếp (`openai-chat.ts` đọc `res.json()`, không `stream:true`).
2. **Sinh lộ trình 2048 token một phát** (`generateItinerary` maxTokens 2048) → riêng bước này ~8–15s.
3. **Proxy bên thứ ba chậm** ~1.5s/call (OpenAI trực tiếp ~0.3–0.5s) × 3–4 call nối đuôi.
4. **System prompt (~47 dòng) + 6–7 schema tool gửi lại MỖI vòng** → prefill lặp lại.
5. **`search_documents` nạp TOÀN BỘ chunk vào RAM** (`chunks.find()` + cosine JS), không index pgvector.
6. **Retry backoff tới 20s/60s** khi proxy 429/5xx; `fetch` KHÔNG có timeout.
7. **`MAX_STEPS=5`** → xấu nhất 6 call LLM nối đuôi.

**Hướng tối ưu (chưa áp dụng — cần được duyệt):** bật streaming + SSE; gọi OpenAI trực tiếp thay proxy; giảm maxTokens lộ trình & MAX_STEPS; thêm timeout fetch + giảm retry; index embedding bằng pgvector.

---

## 11. Bản đồ file

```
backend/src/modules/ragv2/
  ragv2.controller.ts          # 3 endpoint @Public (status/ingest/ask)
  ragv2.service.ts             # ask() định tuyến agent↔pipeline; searchDocuments, generateItinerary, reviseItinerary, hybrid search, status
  ragv2.agent.ts               # runRagAgent() — vòng ReAct, system prompt, filterCardsByAnswer
  ragv2.module.ts              # factory chọn provider (RagEmbeddings/RagChat), forFeature các entity
  entities/knowledge-chunk.entity.ts
  lib/
    rag-tools.ts               # 6+1 tool defs + executeTool()
    rag-llm.interface.ts       # RagEmbeddings, RagChat (abstract) + chatWithTools, AgentMessage, ToolDef
    openai-chat.ts             # OpenAiChat — complete/completeJson/chatWithTools
    openai-embeddings.ts       # OpenAiEmbeddings — embed/embedBatch
    gemini-chat.ts             # GeminiChat (provider khác)
    gemini-embeddings.ts
    cosine.ts  lexical.ts(BM25)  fusion.ts(RRF)  chunker.ts  date-vi.ts
    retrievers/
      retriever.interface.ts   # RagRetriever, RetrievedCard, searchTokens
      trip.retriever.ts  place.retriever.ts  guide.retriever.ts  post.retriever.ts

frontend/src/
  components/common/AIChatBubble/AIChatBubble.tsx   # bong bóng nổi (gọi v2)
  services/aiAssistantService.ts                    # ask() → /rag-v2/ask; createTrip() → /ai/create-trip
  services/ragV2Service.ts                          # cho trang /chatbot-v2 (có trace)
  pages/ChatbotV2/ChatbotV2Page.tsx                 # trang standalone + TracePanel
  store/aiAssistantStore.ts                         # enabled/isOpen/messages (persist)
```
