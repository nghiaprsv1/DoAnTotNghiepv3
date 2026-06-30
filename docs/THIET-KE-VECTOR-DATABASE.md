# Thiết kế Vector Database (pgvector) — RAG v2

> **Bản thiết kế (design doc).** Mục tiêu: chuyển vector store của chatbot RAG v2 từ `jsonb` + cosine brute-force sang **pgvector** — vector database thật trên chính Postgres, có ANN index (HNSW).
>
> Trạng thái: **THIẾT KẾ — chưa triển khai code.** Cập nhật 2026-06-28.
> Nguồn sự thật hiện tại: `backend/src/modules/ragv2/entities/knowledge-chunk.entity.ts`, `ragv2.service.ts`, `lib/cosine.ts`.

---

## 1. Hiện trạng & vấn đề

### Cách lưu/truy hồi hiện tại
- Vector embedding lưu ở cột **`embedding jsonb`** (mảng `number[]`) trong bảng `rag_knowledge_chunks`.
- Truy hồi dense: **cosine brute-force trong Node** (`lib/cosine.ts`). Cả 2 đường truy hồi đều `await this.chunks.find()` — load **toàn bộ** chunk (kèm vector) vào RAM rồi mới tính:
  - Pipeline 7 bước cũ: `ragv2.service.ts:457`
  - Tool agent `search_documents`: `ragv2.service.ts:832`

### Vấn đề
| Khía cạnh | Hiện tại (jsonb + brute-force) |
|---|---|
| Độ phức tạp | **O(N)** — quét mọi chunk mỗi câu hỏi |
| Băng thông DB↔Node | Kéo **toàn bộ** vector (3072 số float/chunk) qua mạng mỗi lần hỏi |
| Khả năng mở rộng | Tốt khi N nhỏ (~50–70 chunk hiện tại); chậm dần khi N lớn |
| Lập chỉ mục | Không có ANN index |

> Hiện tại vẫn chạy tốt vì corpus nhỏ. Thiết kế này chuẩn bị cho quy mô lớn hơn và để **đo so sánh trong báo cáo** (brute-force vs ANN).

---

## 2. Lựa chọn công nghệ: pgvector

Chọn **pgvector** (extension Postgres) thay vì vector DB ngoài (Qdrant/Pinecone/Milvus):

| Tiêu chí | pgvector | Vector DB ngoài |
|---|---|---|
| Hạ tầng | **Dùng luôn Postgres sẵn có** | Phải dựng/quản lý service riêng |
| Vận hành | Cùng 1 DB, 1 backup, 1 connection | Thêm điểm hỏng, thêm chi phí |
| Phù hợp đồ án | ✅ Tối thiểu thay đổi kiến trúc | Phức tạp hơn mức cần |
| Nâng cấp từ code hiện tại | Tự nhiên (đã có `cosine.ts` tách sạch) | Phải viết client mới |
| Quy mô cực lớn (>10M vector) | Khá | Mạnh hơn |

Với TripMate, pgvector là điểm cân bằng đúng.

---

## 3. Quyết định mấu chốt: SỐ CHIỀU embedding

⚠️ **Ràng buộc bắt buộc xử lý:** model mặc định `gemini-embedding-001` trả **3072 chiều**, nhưng **HNSW của pgvector (kiểu `vector`) chỉ index tối đa 2000 chiều**.

### Phương án A — Giảm chiều về 1536 (ĐỀ XUẤT)
- Gemini hỗ trợ `outputDimensionality = 1536` (embedding theo Matryoshka/MRL — cắt chiều an toàn). Sau khi cắt phải **L2-normalize** lại vector.
- OpenAI `text-embedding-3-small` **vốn đã 1536 chiều**.
- → Cả 2 provider cùng **1536** → **một schema `vector(1536)` duy nhất**; đổi provider không phải đổi kiểu cột (vẫn cần re-ingest như xưa).
- HNSW index hoạt động bình thường (1536 < 2000).

### Phương án B — Giữ 3072 chiều, dùng `halfvec`
- Kiểu `halfvec(3072)` (float16) — HNSW hỗ trợ halfvec tới **4000 chiều**.
- Giữ trọn độ chính xác embedding Gemini; đổi lại storage tăng và lệch chiều với OpenAI (1536).

**Khuyến nghị: Phương án A** — đồng nhất 2 provider, đơn giản, đủ chất lượng cho đồ án.

---

## 4. Thiết kế schema

```sql
-- (1) Bật extension (cần pgvector cài trên server; Render PostgreSQL có sẵn)
CREATE EXTENSION IF NOT EXISTS vector;

-- (2) Cột vector điển hình hoá — giữ song song cột jsonb cũ để rollback/so sánh
ALTER TABLE rag_knowledge_chunks
  ADD COLUMN IF NOT EXISTS embedding_vec vector(1536);

-- (3) ANN index: HNSW + cosine distance
CREATE INDEX IF NOT EXISTS idx_rag_chunks_hnsw
  ON rag_knowledge_chunks
  USING hnsw (embedding_vec vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Ghi chú thiết kế
- **Giữ cột `embedding jsonb` cũ** trong giai đoạn chuyển đổi → rollback dễ + đo so sánh trong báo cáo.
- Cột `vector` + index quản lý bằng **raw SQL trong `ensureSchema()`** (TypeORM 0.3 không hiểu kiểu `vector` → tránh custom-type). Entity `KnowledgeChunk` giữ nguyên, không thêm `@Column` cho cột vector.
- Tham số HNSW: `m=16` (số cạnh/đỉnh), `ef_construction=64` (chất lượng dựng index). Mặc định pgvector, hợp quy mô đồ án.

---

## 5. Thiết kế truy hồi (retrieval)

### 5.1 Dense — thay brute-force bằng SQL có index
```sql
SELECT id, doc_name, chunk_index, content, char_count,
       1 - (embedding_vec <=> $1::vector) AS dense_score
FROM   rag_knowledge_chunks
WHERE  embedding_vec IS NOT NULL
ORDER  BY embedding_vec <=> $1::vector    -- toán tử <=> = cosine distance, dùng HNSW
LIMIT  $2;                                 -- denseK (vd 12)
```
- `<=>` = **cosine distance** trong pgvector → `cosine_similarity = 1 - distance`.
- `ORDER BY ... LIMIT` kích hoạt **HNSW index** → không quét toàn bảng.
- Set `SET LOCAL hnsw.ef_search = $ef` trước truy vấn để cân recall/tốc độ.

### 5.2 Sparse (BM25) — giữ ở Node nhưng nhẹ hơn
```sql
SELECT id, content FROM rag_knowledge_chunks;   -- KHÔNG kéo cột vector → tiết kiệm lớn
```
BM25 (`lib/lexical.ts`) tính trên `content`. Đây là khoản tiết kiệm băng thông lớn nhất.

### 5.3 Fusion — KHÔNG đổi
`reciprocalRankFusion()` (`lib/fusion.ts`) nhận 2 ranking (dense ids + sparse ids) như cũ.

### 5.4 Điểm sửa trong code (giai đoạn triển khai)
- Tách 1 hàm dùng chung `denseSearch(queryVec, k): {id, score}[]`.
- Thay khối brute-force tại `ragv2.service.ts:457` và `:832` bằng `denseSearch()`.
- Rerank, generate, trace: giữ nguyên.

---

## 6. Thiết kế ingest

`ingest()` (`ragv2.service.ts:278`) bổ sung ghi cột vector:
1. Embed chunk như cũ (nhưng `outputDimensionality=1536` + L2-normalize nếu Gemini).
2. Build vector literal: `'[' + v.join(',') + ']'`.
3. `UPDATE rag_knowledge_chunks SET embedding_vec = $1::vector, embedding = $2 WHERE id = $3`.
4. Re-index idempotent theo `docName` giữ nguyên.

---

## 7. Cấu hình & rollback

| Env mới | Mặc định | Ý nghĩa |
|---|---|---|
| `RAGV2_VECTOR_BACKEND` | `jsonb` (đổi `pgvector` sau khi test) | Chọn đường truy hồi dense; giữ cả 2 để so sánh |
| `RAGV2_EMBEDDING_DIM` | `1536` | Số chiều embedding (Gemini `outputDimensionality`) |
| `RAGV2_HNSW_EF_SEARCH` | `40` | `ef_search` khi truy vấn (recall ↔ tốc độ) |
| `RAGV2_HNSW_M` | `16` | Tham số dựng index |
| `RAGV2_HNSW_EF_CONSTRUCTION` | `64` | Tham số dựng index |

**Chiến lược an toàn:** giữ song song 2 backend (`jsonb` brute-force ↔ `pgvector` HNSW) — đúng pattern dự án đã dùng (giữ pipeline 7 bước cũ song song với agent). Cho phép báo cáo **đo định lượng** độ trễ & recall của hai cách.

---

## 8. Công thức liên quan

**Cosine distance ↔ similarity (pgvector `<=>`):**
```
cosine_distance(a,b) = 1 − cos(a,b) = 1 − (a·b)/(‖a‖‖b‖)
cosine_similarity    = 1 − distance
```

**L2-normalize (sau khi cắt chiều Gemini về 1536):**
```
v̂ = v / ‖v‖,   ‖v‖ = √(Σ vᵢ²)
```
Khi mọi vector đã chuẩn hoá độ dài 1, cosine ≡ tích vô hướng — cải thiện ổn định số học của HNSW cosine.

**HNSW (Hierarchical Navigable Small World):** đồ thị nhiều tầng, tìm láng giềng gần đúng theo **O(log N)** thay vì O(N). `m` = số cạnh mỗi đỉnh, `ef_construction`/`ef_search` = độ rộng tìm kiếm lúc dựng/lúc truy vấn (lớn hơn → recall cao hơn, chậm hơn).

---

## 9. Bảng so sánh trước/sau

| | jsonb + brute-force (hiện tại) | pgvector + HNSW (thiết kế) |
|---|---|---|
| Nơi tính cosine | Node (JS) | Postgres (C, có index) |
| Độ phức tạp tìm top-K | O(N) | ~O(log N) |
| Dữ liệu kéo về Node/câu hỏi | Toàn bộ vector | Chỉ id + content (sparse) + top-K (dense) |
| Lập chỉ mục | Không | HNSW |
| Độ chính xác | Exact (100%) | Xấp xỉ (recall cao, chỉnh bằng `ef_search`) |
| Phụ thuộc | Thuần Node | Cần extension pgvector |
| Phù hợp khi | N nhỏ | N lớn dần |

---

## 10. Kế hoạch triển khai (giai đoạn sau)

1. `ensureSchema()`: `CREATE EXTENSION` + `ADD COLUMN embedding_vec` + `CREATE INDEX hnsw` (đều `IF NOT EXISTS`).
2. Embeddings provider: thêm `outputDimensionality=1536` (Gemini) + L2-normalize.
3. `ingest()`: ghi thêm `embedding_vec`.
4. Thêm hàm `denseSearch()` (SQL `<=>`), gắn cờ `RAGV2_VECTOR_BACKEND`.
5. Thay 2 điểm brute-force (`:457`, `:832`).
6. Chạy `npm run rag:ingest` (re-embed 1536) → test `/chatbot-v2`.
7. Cập nhật `CLAUDE.md` + trang web.

> ⚠️ Yêu cầu hạ tầng: server Postgres phải cài được extension `vector`. Kiểm tra trên Render/PostgreSQL trước khi triển khai.
