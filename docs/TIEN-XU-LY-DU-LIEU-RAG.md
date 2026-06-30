# Tiền xử lý dữ liệu cho RAG (RAG v2)

> Tài liệu mô tả **toàn bộ khâu tiền xử lý dữ liệu** của chatbot RAG v2 — từ tài liệu thô trong `documemtRAG/` đến khi thành vector lưu trong vector store, sẵn sàng truy hồi.
>
> Cập nhật: 2026-06-28. Nguồn sự thật:
> - `backend/src/rag-ingest.script.ts` — entry point lệnh `npm run rag:ingest`
> - `backend/src/modules/ragv2/ragv2.service.ts` → `ingest()` — điều phối nạp/re-index
> - `backend/src/modules/ragv2/lib/chunker.ts` — tách văn bản thành chunk
> - `backend/src/modules/ragv2/lib/gemini-embeddings.ts` — sinh vector embedding
> - `backend/src/modules/ragv2/lib/lexical.ts` — tokenize + chuẩn hoá cho BM25
> - `backend/src/modules/ragv2/entities/knowledge-chunk.entity.ts` — lược đồ lưu trữ

---

## 0. Tóm tắt nhanh (TL;DR)

Tiền xử lý dữ liệu RAG v2 chia làm **2 nhánh**, vì hệ thống truy hồi từ **2 nguồn**:

1. **Nhánh tài liệu phi cấu trúc** (`documemtRAG/*.txt|md`) — phải tiền xử lý OFFLINE qua lệnh `npm run rag:ingest`:
   `đọc file → chuẩn hoá → chunk theo câu (có overlap) → embedding (Gemini/OpenAI) → lưu vector vào bảng rag_knowledge_chunks`.
2. **Nhánh dữ liệu có cấu trúc** (bảng `trips/places/guides/posts` trong DB) — **KHÔNG cần ingest trước**. Tiền xử lý diễn ra ONLINE ngay lúc truy vấn: chuẩn hoá câu hỏi → tokenize → so khớp `ILIKE` + token. Xem [§6](#6-tiền-xử-lý-nhánh-dữ-liệu-có-cấu-trúc-db).

Ngoài ra còn một lớp tiền xử lý **tại thời điểm truy vấn** áp cho cả câu hỏi người dùng: tokenize, bỏ stopword, chuẩn hoá chữ thường để phục vụ BM25 và DB search. Xem [§5](#5-tiền-xử-lý-tại-thời-điểm-truy-vấn-query-time).

---

## 1. Pipeline tổng thể (nhánh tài liệu)

```
documemtRAG/*.txt|md
   │  fs.readFileSync (utf8)
   ▼
[1] ĐỌC & LỌC FILE          ──► chỉ nhận .txt / .md (regex /\.(txt|md)$/i)
   ▼
[2] CHUẨN HOÁ VĂN BẢN        ──► \r\n → \n, trim, gộp dòng mềm trong đoạn
   ▼
[3] TÁCH CÂU (sentence split) ──► tôn trọng số thứ tự "6." & số "1.500"
   ▼
[4] GÓI CÂU THÀNH CHUNK       ──► maxChars 900, minChars 350, overlap 160 (theo câu trọn)
   ▼
[5] EMBEDDING THEO BATCH      ──► Gemini/OpenAI, taskType=RETRIEVAL_DOCUMENT
   ▼
[6] RE-INDEX & LƯU            ──► xoá chunk cũ cùng docName → save (batch 50)
   ▼
rag_knowledge_chunks (id, doc_name, chunk_index, content, char_count, embedding jsonb, ...)
```

Điều phối toàn bộ ở `RagV2Service.ingest()` (`ragv2.service.ts:278`). Lệnh chạy:

```bash
cd backend && npm run rag:ingest      # cần GEMINI_API_KEY (hoặc OPENAI_API_KEY nếu RAGV2_LLM_PROVIDER=openai)
```

Hoặc bấm nút "Nạp tài liệu" trên trang `/chatbot-v2` (gọi `POST /rag-v2/ingest`).

---

## 2. Bước 1–2: Đọc & chuẩn hoá văn bản

### Đọc file
- Thư mục nguồn: `RAGV2_DOCS_DIR` (env). Mặc định `../documemtRAG` tính từ `process.cwd()` của backend (`ragv2.service.ts:152`).
- Chỉ nhận đuôi `.txt` / `.md`: `fs.readdirSync(dir).filter(f => /\.(txt|md)$/i.test(f))`.
- Hiện có **5 tài liệu nguồn**: `CaoBang.txt`, `LaoCai.txt`, `PhuQuoc.txt`, `Vungtau.txt`, `HuongDanSuDung_LuuYDuLich.txt` (4 file kiến thức tỉnh/điểm đến + 1 file hướng dẫn sử dụng & lưu ý du lịch).
- `ingest(only?)`: nếu truyền danh sách tên file thì chỉ re-index các file đó (re-index từng phần).

### Chuẩn hoá (trong `chunkText`, `chunker.ts:74`)
```ts
const text = raw.replace(/\r\n/g, '\n').trim();
```
1. **Chuẩn hoá xuống dòng**: `\r\n` (Windows) → `\n` để regex tách đoạn/câu hoạt động ổn định trên mọi OS.
2. **Cắt khoảng trắng thừa** đầu/cuối tài liệu.
3. **Tách theo đoạn**: `text.split(/\n\s*\n+/)` — ranh giới đoạn là 1+ dòng trống.
4. **Gộp dòng mềm trong đoạn**: `block.replace(/\s*\n\s*/g, ' ')` — các dòng bị xuống dòng "mềm" (wrap) trong cùng một đoạn được nối lại thành một dòng dài, để bước tách câu không bị cắt sai giữa câu.

> Lưu ý: **KHÔNG bỏ dấu tiếng Việt** ở khâu này. Văn bản gốc giữ nguyên dấu để embedding nắm đúng ngữ nghĩa, và để hiển thị nguyên văn cho người dùng. (Việc bỏ dấu câu / hạ chữ thường chỉ xảy ra ở khâu tokenize cho BM25 — xem [§5](#5-tiền-xử-lý-tại-thời-điểm-truy-vấn-query-time).)

---

## 3. Bước 3–4: Chunking theo câu trọn vẹn (sentence-aware)

File: `backend/src/modules/ragv2/lib/chunker.ts`.

### Vì sao phải chunk?
Tài liệu dài (8–15 KB/file) không thể embed nguyên khối: vector sẽ "loãng", và lúc truy hồi không định vị được đoạn liên quan. Chunk nhỏ → mỗi vector mang một ý cô đọng → truy hồi trúng hơn.

### Tham số mặc định (`DEFAULTS`, `chunker.ts:30`)
| Tham số | Giá trị | Ý nghĩa |
|---|---|---|
| `maxChars` | **900** | Kích thước tối đa mỗi chunk (ký tự) |
| `minChars` | **350** | Đuôi ngắn hơn ngưỡng này sẽ gộp vào chunk trước (tránh chunk vụn) |
| `overlapChars` | **160** | Số ký tự gối đầu giữa 2 chunk (làm tròn LÊN theo câu trọn) |

### Chiến lược (sentence-aware + overlap theo câu)
1. **Tách câu** bằng regex `SENTENCE_SPLIT = /(?<=[^\d\s][.!?…])\s+/u`. Lookbehind đòi hỏi ký tự **trước** dấu kết câu **không phải chữ số**, nên:
   - `"6. Di tích..."` (số thứ tự đầu mục) → **KHÔNG** bị tách nhầm thành câu mới.
   - `"1.500.000"` / `"3,5 km"` (số) → **KHÔNG** bị cắt giữa số.
2. **Gói câu vào chunk**: lần lượt nối câu vào chunk hiện tại tới khi sắp vượt `maxChars` thì "chốt" chunk và mở chunk mới.
3. **Câu siêu dài** (`s.length >= maxChars`): để câu đó đứng riêng thành một chunk — vẫn là câu trọn, không cắt giữa câu.
4. **Overlap theo câu** (`sentenceOverlap`, `chunker.ts:56`): chunk sau luôn **bắt đầu từ đầu một câu**, gồm vài câu cuối của chunk trước sao cho tổng độ dài ≤ `overlapChars` (giữ ít nhất 1 câu). Overlap giúp giữ ngữ cảnh bắc cầu giữa 2 chunk, tránh mất thông tin ở ranh giới.
5. **Gộp đuôi ngắn**: nếu chunk cuối < `minChars` thì nối vào chunk liền trước.

Kết quả mỗi chunk: `{ index, content, charCount }`. Mỗi chunk **bắt đầu và kết thúc ở ranh giới câu**.

### Ví dụ trực quan
```
Đoạn gốc:  [Câu A][Câu B][Câu C][Câu D][Câu E]  (tổng > 900 ký tự)

Chunk 0:   [Câu A][Câu B][Câu C]
Chunk 1:          [Câu C][Câu D][Câu E]   ← Câu C lặp lại = overlap (giữ mạch ngữ cảnh)
             └─ bắt đầu từ đầu câu, không cắt giữa câu ─┘
```

---

## 4. Bước 5–6: Embedding & lưu trữ vector

### Sinh embedding
File: `gemini-embeddings.ts` (mặc định) / `openai-embeddings.ts` (khi `RAGV2_LLM_PROVIDER=openai`).

- **Provider trừu tượng**: `RagEmbeddings` (token DI), chọn implementation qua env `RAGV2_LLM_PROVIDER`. Đổi provider không phải sửa pipeline ingest.
- **Model mặc định**: `gemini-embedding-001` (env `RAGV2_EMBEDDING_MODEL`). OpenAI: `text-embedding-3-small`.
- **taskType = `RETRIEVAL_DOCUMENT`** khi index tài liệu (vs `RETRIEVAL_QUERY` khi embed câu hỏi) — gợi ý Gemini tối ưu vector cho đúng vai trò, cải thiện độ khớp truy hồi.
- **Embed theo batch** (`embedBatch`, `ragv2.service.ts:305`): gửi danh sách `content` của các chunk.
  - Bản Gemini: gọi tuần tự `embedContent` cho từng chunk (API key mới không hỗ trợ `batchEmbedContents` đồng bộ), có **giãn cách** `RAGV2_EMBED_GAP_MS` (mặc định 1200ms) giữa các lần gọi để không vượt rate limit free tier.
  - **Retry + exponential backoff** với lỗi 429/5xx: chờ 2s → 4s → 8s → 16s → 32s (tối đa `RAGV2_EMBED_RETRIES`, mặc định 5 lần). Nhờ vậy ingest vẫn chạy được trên free tier.

> ⚠️ **Số chiều embedding khác nhau giữa provider** (Gemini vs OpenAI 1536). Đổi `RAGV2_LLM_PROVIDER` **bắt buộc chạy lại `npm run rag:ingest`**, nếu không cosine sẽ lệch chiều.

### Lưu trữ (vector store)
Entity `KnowledgeChunk` → bảng `rag_knowledge_chunks` (`knowledge-chunk.entity.ts`):

| Cột | Kiểu | Ý nghĩa |
|---|---|---|
| `id` | uuid | Khoá chính |
| `doc_name` | varchar(255), **indexed** | Tên file nguồn |
| `chunk_index` | int | Thứ tự chunk trong tài liệu (0-based) |
| `content` | text | Nội dung chunk (nguyên văn) |
| `char_count` | int | Số ký tự (thống kê) |
| `embedding_model` | varchar(100) | Model đã dùng (để biết khi đổi provider) |
| `embedding` | **jsonb** | Vector `number[]` |
| `created_at` | timestamptz | Thời điểm index |

- **Lưu vector dạng `jsonb`** thay vì kiểu `vector` của pgvector → **không cần cài extension**, chạy ngay trên Postgres hiện có (phù hợp quy mô đồ án). Đổi lại, cosine tính brute-force trong Node, không có ANN index.
- **Tạo bảng an toàn**: `ensureSchema()` (`ragv2.service.ts:208`) dùng `CREATE TABLE IF NOT EXISTS` + index `idx_rag_chunks_doc`, chạy được bất kể `DB_SYNCHRONIZE` bật/tắt, không đụng schema module khác.

### Re-index idempotent
`ingest()` xử lý từng file: **xoá toàn bộ chunk cũ cùng `docName`** rồi `save()` chunk mới (batch 50). Chạy lại nhiều lần cho cùng tài liệu → kết quả ổn định, không nhân bản. Trả `IngestResult { documents[{docName, chunks, chars}], totalChunks, embeddingModel }`.

---

## 5. Tiền xử lý tại thời điểm truy vấn (query-time)

Ngoài tiền xử lý tài liệu offline, có một lớp tiền xử lý áp **lúc người dùng hỏi**, dùng cho BM25 (sparse) và truy hồi từ DB.

File: `backend/src/modules/ragv2/lib/lexical.ts`.

### Tokenize tiếng Việt (`tokenize`, `lexical.ts:29`)
```ts
text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')   // bỏ dấu câu, giữ chữ + số mọi ngôn ngữ
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOPWORDS.has(t));
```
1. **Hạ chữ thường**.
2. **Bỏ dấu câu / ký tự đặc biệt**, giữ chữ và số (Unicode-aware `\p{L}\p{N}`).
3. **Tách theo khoảng trắng**.
4. **Lọc token ngắn** (< 2 ký tự) **và stopword**.

> **Giữ nguyên dấu tiếng Việt** (không bỏ dấu): `"núi"` ≠ `"nui"` → khớp chính xác hơn cho tài liệu tiếng Việt có dấu.

### Stopword (`STOPWORDS`, `lexical.ts:14`)
Danh sách ~70 từ dừng tiếng Việt + Anh phổ biến (`và, là, của, có, cho, các, một, được, the, a, is, to, of...`). Loại bỏ để các token mang nghĩa (địa danh, đặc sản, danh từ riêng) nổi lên, tăng tín hiệu cho BM25.

### Áp dụng
- **Câu hỏi người dùng** được tokenize qua chính `tokenize()` này trong `bm25Scores()` (`lexical.ts:77`).
- **Toàn bộ chunk** cũng được tokenize thành `LexicalDoc { id, tokens, length }` để chấm BM25 (so khớp từ khoá, bổ trợ cho cosine — xem hybrid search trong tài liệu cơ sở lý thuyết).

---

## 6. Tiền xử lý nhánh dữ liệu có cấu trúc (DB)

Nguồn `trips/places/guides/posts` **không qua ingest/embedding**. Tiền xử lý của nhánh này nằm ở khâu **chuẩn bị từ khoá tìm kiếm** trước khi query SQL:

- `searchTokens()` (`lib/retrievers/retriever.interface.ts`) tách câu hỏi/keyword thành token để dựng điều kiện `ILIKE` + so token trên các cột text của entity.
- Mỗi retriever lọc theo trạng thái hợp lệ: Trip `status=published`, Guide `status=approved`, Post `visibility=public`.
- **Chế độ `browse`**: khi không có từ khoá lọc (ý định liệt kê chung) → bỏ điều kiện khớp text, trả top-N theo `rating`.

Tức là dữ liệu DB đã "sạch và có cấu trúc" sẵn, nên tiền xử lý chỉ là **chuẩn hoá câu hỏi → token → khớp cột**, diễn ra realtime mỗi truy vấn, **0 token LLM** ở bước này.

---

## 7. Bảng tham số & biến môi trường liên quan tiền xử lý

| Env | Mặc định | Tác dụng |
|---|---|---|
| `RAGV2_DOCS_DIR` | `../documemtRAG` | Thư mục tài liệu nguồn |
| `RAGV2_LLM_PROVIDER` | `gemini` | Chọn provider embedding/chat (`gemini` \| `openai`) |
| `RAGV2_EMBEDDING_MODEL` | `gemini-embedding-001` | Model embedding |
| `RAGV2_EMBED_GAP_MS` | `1200` | Giãn cách giữa 2 lần gọi embed (chống rate limit) |
| `RAGV2_EMBED_RETRIES` | `5` | Số lần retry khi 429/5xx |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | — | Khoá API tương ứng provider |
| `GEMINI_BASE_URL` | endpoint Google | Đổi sang proxy bên thứ 3 (phải gồm `/v1beta`) |

Tham số chunk (`maxChars` 900 / `minChars` 350 / `overlapChars` 160) hiện **hardcode** trong `chunker.ts:30` (chưa expose qua env). Muốn chỉnh thì sửa `DEFAULTS` hoặc truyền `ChunkOptions` khi gọi `chunkText`.

---

## 8. Bản đồ lý thuyết → code (tiền xử lý)

| Khái niệm | Vị trí code |
|---|---|
| Đọc & lọc file nguồn | `ragv2.service.ts:286` (`ingest`) |
| Chuẩn hoá văn bản | `chunker.ts:74` (`chunkText`) |
| Tách câu (sentence split) | `chunker.ts:41` (`SENTENCE_SPLIT`), `chunker.ts:44` (`splitToSentences`) |
| Chunking + overlap theo câu | `chunker.ts:72` (`chunkText`), `chunker.ts:56` (`sentenceOverlap`) |
| Embedding tài liệu | `gemini-embeddings.ts:42` (`embed`), `:98` (`embedBatch`) |
| Re-index idempotent | `ragv2.service.ts:310-322` |
| Lược đồ vector store | `knowledge-chunk.entity.ts` |
| Tokenize + stopword (query-time) | `lexical.ts:29` (`tokenize`), `lexical.ts:14` (`STOPWORDS`) |
| Tiền xử lý DB (token search) | `lib/retrievers/*.retriever.ts`, `retriever.interface.ts` (`searchTokens`) |

---

> Tài liệu liên quan: [`CO-SO-LY-THUYET-CHATBOT.md`](./CO-SO-LY-THUYET-CHATBOT.md) (§11 Chunking, §4 Embedding, §7 BM25), [`CHATBOT.md`](./CHATBOT.md) (kiến trúc pipeline & agent).
