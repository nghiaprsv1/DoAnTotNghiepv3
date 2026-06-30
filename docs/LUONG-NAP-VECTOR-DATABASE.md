# Luồng tiền xử lý & nạp tài liệu vào Vector Database (RAG v2)

> Mô tả **luồng thực thi thật** của lệnh `npm run rag:ingest` — từ file văn bản thô đến các vector lưu trong PostgreSQL. Dùng để trình bày/bảo vệ. Bám sát code: `rag-ingest.script.ts`, `ragv2.service.ts → ingest()`, `lib/chunker.ts`, `lib/gemini-embeddings.ts`, entity `KnowledgeChunk`.

---

## Tóm tắt một câu (để mở đầu khi phát biểu)

> "Hệ thống đọc các file tài liệu du lịch dạng `.txt/.md`, tách mỗi tài liệu thành nhiều đoạn nhỏ theo câu trọn vẹn, đưa từng đoạn qua mô hình embedding của Gemini để biến thành vector số thực, rồi lưu cả nội dung lẫn vector vào bảng `rag_knowledge_chunks` trong PostgreSQL. Đây chính là vector database mà chatbot dùng để truy hồi khi trả lời."

---

## Sơ đồ luồng (dạng chữ)

```
File .txt/.md  →  Đọc thư mục  →  Đọc nội dung  →  Chunk theo câu
   (documemtRAG/)                                        │
                                                         ▼
                              Embedding (Gemini)  ◄──  từng đoạn text
                                     │
                                     ▼
                      Xoá chunk cũ của tài liệu (re-index)
                                     │
                                     ▼
            Lưu (nội dung + vector) → rag_knowledge_chunks (PostgreSQL)
```

---

## Các bước thực thi chi tiết

### Bước 0 — Khởi động & kiểm tra điều kiện
- Lệnh `npm run rag:ingest` chạy `rag-ingest.script.ts`: khởi tạo application context của NestJS rồi gọi `RagV2Service.ingest()`.
- `ingest()` kiểm tra `embeddings.isReady()` — tức đã có `GEMINI_API_KEY` chưa. Thiếu khoá thì dừng ngay (không thể tạo embedding).
- Gọi `ensureSchema()`: chạy `CREATE TABLE IF NOT EXISTS rag_knowledge_chunks (...)` + tạo index trên `doc_name`. Nhờ vậy chạy được bất kể `synchronize` bật hay tắt, không đụng schema các module khác.

### Bước 1 — Đọc danh sách tài liệu nguồn
- Xác định thư mục tài liệu qua `docsDir()`: lấy từ env `RAGV2_DOCS_DIR`, mặc định là `documemtRAG/` ở thư mục gốc dự án.
- `fs.readdirSync(dir)` liệt kê file, **lọc chỉ giữ `.txt` và `.md`**.
- Nếu truyền tham số `only`, chỉ index các file được chỉ định. Không có file hợp lệ → ném lỗi.

### Bước 2 — Đọc nội dung từng tài liệu
- Duyệt từng file, `fs.readFileSync(path, 'utf8')` đọc toàn bộ nội dung dưới dạng UTF-8 (giữ đúng tiếng Việt có dấu).

### Bước 3 — Chunk (tách đoạn) theo câu trọn vẹn — `chunkText()`
Đây là bước **tiền xử lý cốt lõi**. Chiến lược *sentence-aware* (theo câu), tham số mặc định: `maxChars=900`, `minChars=350`, `overlapChars=160`.

1. **Chuẩn hoá**: đổi `\r\n` → `\n`, cắt khoảng trắng thừa.
2. **Tách đoạn**: cắt văn bản theo dòng trống (`\n\s*\n+`); trong mỗi đoạn gộp các dòng xuống dòng mềm thành một dòng để tách câu cho chuẩn.
3. **Tách câu**: dùng regex ranh giới câu (sau `.!?…` rồi tới khoảng trắng). Có lookbehind để **không cắt nhầm** số thứ tự ("6. Di tích") hay số thập phân ("1.500.000").
4. **Gói câu vào chunk**: nối lần lượt các câu cho tới khi gần đầy `maxChars` thì "chốt" một chunk và mở chunk mới.
5. **Overlap theo câu**: phần đầu chunk sau lấy lại vài câu cuối của chunk trước (≤ `overlapChars`) — luôn bắt đầu từ đầu một câu, **không bao giờ cắt giữa câu**. Mục đích: giữ ngữ cảnh liền mạch giữa hai đoạn.
6. **Gộp đuôi ngắn**: đoạn cuối ngắn hơn `minChars` sẽ được gộp vào chunk trước để tránh chunk vụn.
- Kết quả: danh sách `TextChunk { index, content, charCount }` — mỗi chunk bắt đầu và kết thúc ở ranh giới câu.

### Bước 4 — Tạo embedding (vector hoá) — `embedBatch()`
- Gọi `embeddings.embedBatch(parts.map(p => p.content), 'RETRIEVAL_DOCUMENT')` — embed **từng đoạn** đã chunk.
- Bản Gemini (`gemini-embeddings.ts`):
  - Gọi REST API `models/{model}:embedContent` (model mặc định `gemini-embedding-001`, đổi qua `RAGV2_EMBEDDING_MODEL`).
  - `taskType = RETRIEVAL_DOCUMENT` để Gemini tối ưu vector cho mục đích **lưu trữ/truy hồi tài liệu** (khác với lúc embed câu hỏi dùng `RETRIEVAL_QUERY`).
  - Trả về `embedding.values` — mảng số thực (vector).
  - **Retry + backoff** khi gặp 429/5xx (free tier giới hạn chặt): chờ 2s, 4s, 8s, 16s, 32s.
  - Giữa các lần gọi giãn cách `RAGV2_EMBED_GAP_MS` (mặc định 1.2s) để không vượt rate limit.
- Trả về danh sách vector **theo đúng thứ tự** các chunk đầu vào.

> Điểm cần nhấn mạnh: cùng một mô hình embedding được dùng ở **cả hai thời điểm** — lúc nạp tài liệu (bước này) và lúc người dùng hỏi — để hai vector nằm trong cùng không gian, so khớp cosine mới có nghĩa.

### Bước 5 — Re-index (xoá chunk cũ của tài liệu)
- `this.chunks.delete({ docName: file })`: xoá toàn bộ chunk cũ của đúng tài liệu đang xử lý.
- Nhờ vậy `ingest()` **idempotent theo tên tài liệu** — chạy lại nhiều lần không tạo bản trùng, chỉ cập nhật.

### Bước 6 — Lưu vào Vector Database (PostgreSQL)
- Tạo các entity `KnowledgeChunk` từ mỗi cặp (chunk, vector):
  - `docName` — tên tài liệu nguồn.
  - `chunkIndex` — thứ tự chunk trong tài liệu.
  - `content` — nội dung văn bản của chunk.
  - `charCount` — số ký tự (phục vụ thống kê).
  - `embeddingModel` — tên model embedding đã dùng.
  - `embedding` — vector, lưu cột kiểu **`jsonb`** (mảng số).
- `this.chunks.save(entities, { chunk: 50 })`: lưu theo lô 50 bản ghi.

> **Vì sao lưu vector dạng `jsonb` thay vì pgvector?** Để không cần cài extension, chạy ngay trên PostgreSQL sẵn có — phù hợp quy mô đồ án. Việc tính cosine similarity được làm ở tầng ứng dụng (`lib/cosine.ts`). (Phần thiết kế nâng cấp lên pgvector + HNSW đã mô tả trong `docs/THIET-KE-VECTOR-DATABASE.md` nhưng chưa code.)

### Bước 7 — Tổng kết
- `ingest()` trả về `IngestResult { documents[], totalChunks, embeddingModel }`.
- Script in ra mỗi tài liệu: số chunk + số ký tự, và tổng số chunk đã nạp.

---

## Truy hồi sau khi đã nạp (để trả lời câu "rồi dùng vector này thế nào")

Khi người dùng hỏi, hệ thống:
1. Embed **câu hỏi** bằng cùng model nhưng `taskType = RETRIEVAL_QUERY`.
2. Tính **cosine similarity** giữa vector câu hỏi và toàn bộ vector chunk trong `rag_knowledge_chunks`.
3. Kết hợp với **BM25** (sparse) → hợp nhất bằng **RRF** → **rerank** bằng LLM → lấy top-K đoạn liên quan nhất làm ngữ cảnh sinh câu trả lời.

(Chi tiết phần truy hồi nằm ở pipeline `search_documents` — đã có sơ đồ riêng.)

---

## Cách phát biểu trước hội đồng (gợi ý 5 câu)

1. "Dữ liệu tri thức du lịch được chuẩn bị dưới dạng các file văn bản trong thư mục `documemtRAG`."
2. "Khi nạp, hệ thống đọc từng file rồi **tách thành các đoạn nhỏ theo câu trọn vẹn**, có gối đầu giữa các đoạn để không mất ngữ cảnh."
3. "Mỗi đoạn được đưa qua **mô hình embedding của Gemini** để biến thành một **vector số thực** đại diện cho ngữ nghĩa của đoạn đó."
4. "Em lưu cả **nội dung gốc và vector** vào bảng `rag_knowledge_chunks` trong PostgreSQL — đây đóng vai trò **vector database** của hệ thống. Quá trình này **idempotent**: nạp lại sẽ thay thế chứ không trùng lặp."
5. "Khi người dùng đặt câu hỏi, câu hỏi cũng được embedding bằng **cùng mô hình**, rồi so khớp **cosine** với các vector đã lưu để tìm ra những đoạn tài liệu liên quan nhất — đó là nền tảng để chatbot trả lời có căn cứ thay vì bịa."

---

## Các tham số cấu hình liên quan (env)

| Biến | Ý nghĩa | Mặc định |
|---|---|---|
| `GEMINI_API_KEY` | Khoá tạo embedding (bắt buộc) | — |
| `RAGV2_EMBEDDING_MODEL` | Model embedding | `gemini-embedding-001` |
| `RAGV2_DOCS_DIR` | Thư mục tài liệu nguồn | `documemtRAG/` |
| `RAGV2_EMBED_GAP_MS` | Giãn cách giữa các lần embed | `1200` ms |
| `RAGV2_EMBED_RETRIES` | Số lần retry khi rate limit | `5` |
| `GEMINI_BASE_URL` | Đổi endpoint Gemini (proxy) | endpoint Google |

Chunk: `maxChars=900`, `minChars=350`, `overlapChars=160` (trong `lib/chunker.ts`).
