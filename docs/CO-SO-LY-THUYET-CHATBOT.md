# Cơ sở lý thuyết — Chatbot du lịch TripMate (RAG v2)

> Tài liệu nền cho báo cáo đồ án. Tổng hợp các cơ sở lý thuyết **đúng với phần đã hiện thực** trong module `backend/src/modules/ragv2/`, kèm công thức toán học liên quan.

## Mục lục
1. [LLM & Sinh có điều kiện](#1-llm--sinh-có-điều-kiện)
2. [RAG — Retrieval-Augmented Generation](#2-rag--retrieval-augmented-generation)
3. [Modular RAG đa nguồn](#3-modular-rag-đa-nguồn)
4. [Embedding & biểu diễn vector](#4-embedding--biểu-diễn-vector)
5. [Truy hồi từ vựng (Lexical / DB)](#5-truy-hồi-từ-vựng-lexical--db)
6. [Truy hồi ngữ nghĩa — Cosine](#6-truy-hồi-ngữ-nghĩa--cosine-similarity)
7. [Truy hồi thưa — BM25](#7-truy-hồi-thưa--bm25)
8. [Hybrid Search & RRF](#8-hybrid-search--rrf)
9. [Reranking](#9-reranking)
10. [Query Transformation](#10-query-transformation--viết-lại--định-tuyến)
11. [Chunking](#11-chunking)
12. [Agent & ReAct](#12-agent--react--tự-điều-phối-công-cụ)
13. [Hội thoại đa lượt](#13-quản-lý-hội-thoại-đa-lượt)
14. [Prompt Engineering & Grounding](#14-prompt-engineering--grounding)
15. [Trừu tượng hoá Provider](#15-trừu-tượng-hoá-provider)
16. [Bản đồ lý thuyết → code](#bản-đồ-lý-thuyết--code)
17. [Tài liệu tham khảo](#tài-liệu-tham-khảo)

---

## Bảng thuật ngữ Việt – Anh

Quy ước dịch dùng xuyên suốt (tham chiếu AWS/Google Cloud bản tiếng Việt + cộng đồng kỹ thuật VN):

| Tiếng Việt | Tiếng Anh | Viết tắt |
|---|---|---|
| Mô hình ngôn ngữ lớn | Large Language Model | LLM |
| Sinh tăng cường truy hồi / Tạo tăng cường truy xuất | Retrieval-Augmented Generation | RAG |
| Ảo giác (mô hình bịa thông tin) | Hallucination | — |
| Truy hồi / Truy xuất | Retrieval | — |
| Biểu diễn nhúng (vector hoá văn bản) | Embedding | — |
| Độ tương đồng cô-sin | Cosine similarity | — |
| Truy hồi dày đặc (ngữ nghĩa) | Dense retrieval | — |
| Truy hồi thưa (từ khoá) | Sparse retrieval | — |
| Tìm kiếm lai | Hybrid search | — |
| Hợp nhất hạng nghịch đảo | Reciprocal Rank Fusion | RRF |
| Xếp hạng lại | Reranking | — |
| Phân đoạn tài liệu | Chunking | — |
| Tác tử / Trợ lý tự hành | Agent | — |
| Suy luận – Hành động | Reasoning + Acting | ReAct |
| Gọi hàm / gọi công cụ | Function / Tool calling | — |
| Đặt nền (trả lời dựa trên nguồn thật) | Grounding | — |
| Kho tri thức / Ngữ liệu | Corpus / Knowledge base | — |
| Cửa sổ ngữ cảnh | Context window | — |

---

## 1. LLM & Sinh có điều kiện

Nền tảng là **Mô hình ngôn ngữ lớn (Large Language Model)** — mặc định Google Gemini, tùy chọn OpenAI. LLM mô hình hoá xác suất chuỗi token: sinh token tiếp theo dựa trên toàn bộ ngữ cảnh trước đó.

$$P(w_1, w_2, \dots, w_n) = \prod_{t=1}^{n} P(w_t \mid w_1, \dots, w_{t-1})$$

Vấn đề cốt lõi cần xử lý: **ảo giác (hallucination)** — mô hình sinh thông tin nghe hợp lý nhưng sai/không có thật. Toàn bộ kiến trúc RAG bên dưới sinh ra để **ràng buộc LLM chỉ trả lời từ dữ liệu thật đã truy hồi**.

> Lưu ý kỹ thuật: Gemini 2.5 là *thinking model* — token suy luận (`thoughtsTokenCount`) tính vào `maxOutputTokens`, làm JSON đầu ra bị cắt cụt (`finishReason=MAX_TOKENS`). Khắc phục: đặt `thinkingConfig.thinkingBudget = 0`.

---

## 2. RAG — Retrieval-Augmented Generation

Thay vì để LLM trả lời bằng "trí nhớ tham số" (dễ bịa, không cập nhật), RAG **truy hồi dữ liệu liên quan từ nguồn ngoài rồi nhồi vào ngữ cảnh** cho LLM sinh câu trả lời. Vòng **R–A–G**:

```
Truy vấn q ─► Retrieval (truy hồi) ─► Augmentation (nhồi ngữ cảnh) ─► Generation (LLM sinh)
```

Hình thức hoá: với truy vấn $q$, truy hồi tập tài liệu liên quan $D = \text{Retrieve}(q)$, rồi sinh câu trả lời có điều kiện trên cả $q$ và $D$:

$$\text{answer} = \text{LLM}(q, D), \quad D = \operatorname{top\text{-}k}_{d \in \mathcal{C}} \; \text{score}(q, d)$$

trong đó $\mathcal{C}$ là kho tri thức (corpus). **Điều kiện grounded** trong hệ này: cosine cao nhất $\geq 0.3$ **hoặc** có $\geq 1$ thẻ dữ liệu DB.

Lợi ích: giảm ảo giác, cập nhật tri thức không cần huấn luyện lại, câu trả lời "đặt nền" trên nguồn thật và trích dẫn được.

---

## 3. Modular RAG đa nguồn

Nâng cấp từ RAG cổ điển (chỉ một nguồn vector). Hệ thống định nghĩa nhiều **"Search module"** cùng tuân một giao diện `RagRetriever`, chia làm 2 loại truy hồi:

| Loại truy hồi | Module | Phương pháp | Token LLM |
|---|---|---|---|
| **Structured** (CSDL) | trips · places · guides · posts | SQL `ILIKE` + token matching | 0 |
| **Unstructured / Vector** (tài liệu) | documents | Embedding + Hybrid + Rerank | có |

Nguyên lý: **mỗi nguồn = một class** thực thi cùng hợp đồng `retrieve(filters, limit) → RetrievedCard[]`. Router chỉ chọn module nào chạy; lớp gộp kết quả & sinh câu trả lời không đổi. Thêm nguồn mới = thêm 1 class (tinh thần "lắp ghép LEGO" của Modular RAG), không sửa pipeline.

---

## 4. Embedding & biểu diễn vector

**Text embedding** ánh xạ văn bản $\to$ vector số thực $\mathbf{v} \in \mathbb{R}^d$, sao cho văn bản gần nghĩa thì vector gần nhau. Dùng cho nhánh tài liệu.

$$\text{embed}: \text{text} \longrightarrow \mathbf{v} \in \mathbb{R}^d$$

Lưu ý: số chiều $d$ khác nhau giữa provider (Gemini $d=3072$ vs OpenAI $d=1536$) → **đổi provider phải chạy lại** `npm run rag:ingest` (nếu không cosine lệch chiều).

---

## 5. Truy hồi từ vựng (Lexical / DB)

Dùng cho 4 nguồn DB (places/trips/guides/posts). **Không vector, không embedding** — khớp chuỗi trực tiếp trên CSDL, 0 token LLM.

**Bước 1 — Tokenization tiếng Việt + loại stopword.** Tách câu thành token, bỏ stopword du lịch ("tìm, chuyến, đi, du, lịch, có, nào…"), bỏ token thuần số, giữ token độ dài $\geq 2$ → để cụm địa danh/danh từ nổi lên.

**Bước 2 — Khớp `ILIKE` đa cột** (không phân biệt hoa thường), theo cụm nguyên + từng token:
- Cụm `%phrase%` trên: `name`, `description`, `province.name`, `city`.
- Mỗi token trên: `name`, `province.name`, và kiểm tra mảng `tok = ANY(tags)`.

**Bước 3 — Lọc & xếp hạng.** Lọc `category` nếu có; sắp `ORDER BY rating DESC`, lấy top `limit`. Điểm xếp hạng = **rating** của thực thể (không phải tương đồng ngữ nghĩa).

**Chế độ `browse`** (liệt kê chung "tất cả địa điểm"): bỏ điều kiện khớp text, chỉ lọc category + top theo rating.

---

## 6. Truy hồi ngữ nghĩa — Cosine Similarity

Nhánh tài liệu (DENSE). Đo độ tương đồng giữa vector câu hỏi $\mathbf{q}$ và vector chunk $\mathbf{d}$ bằng **cosine của góc** giữa chúng:

$$\text{cosine}(\mathbf{q}, \mathbf{d}) = \frac{\mathbf{q} \cdot \mathbf{d}}{\lVert \mathbf{q} \rVert \, \lVert \mathbf{d} \rVert} = \frac{\sum_{i=1}^{d} q_i d_i}{\sqrt{\sum_{i=1}^{d} q_i^2} \; \sqrt{\sum_{i=1}^{d} d_i^2}}$$

Giá trị $\in [-1, 1]$ (với embedding thường $\geq 0$); càng gần 1 càng giống nghĩa. Ưu điểm: bắt được **tương đồng ngữ nghĩa** kể cả khi không trùng từ khoá. Ngưỡng grounded của hệ: $0.3$.

**Ví dụ minh hoạ** (rút gọn 3 chiều cho dễ hiểu): câu hỏi $\mathbf{q}=(0.9,\,0.1,\,0.2)$ và chunk $\mathbf{d}=(0.8,\,0.2,\,0.1)$.
- Tích vô hướng: $\mathbf{q}\cdot\mathbf{d} = 0.9{\cdot}0.8 + 0.1{\cdot}0.2 + 0.2{\cdot}0.1 = 0.76$
- Độ dài: $\lVert\mathbf{q}\rVert=\sqrt{0.86}\approx0.927$, $\lVert\mathbf{d}\rVert=\sqrt{0.69}\approx0.831$
- $\text{cosine} = 0.76/(0.927{\times}0.831) \approx \mathbf{0.987}$ → rất liên quan (≥ 0.3 → grounded).

> Trong code thực, vector có 3072 chiều (Gemini); công thức không đổi, chỉ tăng số hạng tổng.

---

## 7. Truy hồi thưa — BM25

Nhánh tài liệu (SPARSE). **BM25 (Best Matching 25)** — hàm xếp hạng dựa trên tần suất từ khoá, cải tiến từ TF-IDF. Bắt khớp **từ khoá chính xác / tên riêng** mà vector hay bỏ sót.

Điểm BM25 của tài liệu $D$ với truy vấn $Q = \{q_1, \dots, q_n\}$:

$$\text{BM25}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \dfrac{|D|}{\text{avgdl}}\right)}$$

trong đó:
- $f(q_i, D)$ — tần suất term $q_i$ trong tài liệu $D$;
- $|D|$ — độ dài tài liệu (số token), $\text{avgdl}$ — độ dài trung bình toàn corpus;
- $k_1$ — tham số bão hoà tần suất (thường $1.2$–$2.0$); $b$ — hệ số chuẩn hoá độ dài (thường $0.75$);
- $\text{IDF}(q_i)$ — nghịch tần suất tài liệu (term hiếm → trọng số cao):

$$\text{IDF}(q_i) = \ln\!\left(\frac{N - n(q_i) + 0.5}{n(q_i) + 0.5} + 1\right)$$

với $N$ = tổng số tài liệu, $n(q_i)$ = số tài liệu chứa $q_i$.

**Trực giác:** điểm BM25 tăng khi term xuất hiện **nhiều lần** trong tài liệu (TF) nhưng **bão hoà** dần (nhờ $k_1$ — xuất hiện lần thứ 10 không quan trọng gấp 10 lần thứ nhất); tăng khi term **hiếm** trong toàn corpus (IDF — "Phú Quốc" mang nhiều thông tin hơn "du lịch"); và **chuẩn hoá theo độ dài** ($b$) để tài liệu dài không bị lợi thế giả tạo. Đây là lý do BM25 bắt tốt **tên riêng/địa danh** — thứ mà vector embedding đôi khi làm mờ.

---

## 8. Hybrid Search & RRF

**Hybrid search** kết hợp DENSE (cosine, hiểu ngữ nghĩa) + SPARSE (BM25, bắt từ khoá hiếm) để bù khuyết điểm cho nhau.

Vấn đề: điểm cosine và điểm BM25 **khác thang**, không cộng trực tiếp được. Giải pháp — **RRF (Reciprocal Rank Fusion)**: hợp nhất dựa trên **thứ hạng** thay vì điểm. Với tài liệu $d$ xuất hiện trong các bảng xếp hạng $r \in R$ tại hạng $\text{rank}_r(d)$:

$$\text{RRF}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}_r(d)}$$

với $k$ = hằng số làm mượt (hệ dùng $k = 60$), $\text{rank}_r(d)$ = vị trí của $d$ trong bảng xếp hạng $r$ (1-based). Tài liệu đứng đầu nhiều bảng → tổng điểm cao. Ưu điểm: không phụ thuộc thang điểm tuyệt đối, ổn định.

**Ví dụ minh hoạ.** Chunk A: hạng 1 theo cosine, hạng 3 theo BM25. Chunk B: hạng 2 cả hai bảng.
- $\text{RRF}(A) = \dfrac{1}{60+1} + \dfrac{1}{60+3} = 0.01639 + 0.01587 = \mathbf{0.03226}$
- $\text{RRF}(B) = \dfrac{1}{60+2} + \dfrac{1}{60+2} = 0.01613 + 0.01613 = \mathbf{0.03226}$

→ A và B gần như ngang nhau: A mạnh ở cosine bù cho yếu ở BM25, B đều cả hai. RRF "thưởng" tài liệu được nhiều phương pháp đồng thuận thay vì để một thang điểm lấn át.

---

## 9. Reranking

Sau hybrid, lấy `candidateK` ứng viên (rộng hơn top-K) → **LLM chấm điểm liên quan** từng đoạn so với câu hỏi, thang $0$–$10$:

$$\text{rel}(q, d) \in [0, 10], \qquad \text{top-K} = \operatorname{top\text{-}k}_{d} \; \text{rel}(q, d) \;\; \text{với}\;\; \text{rel}(q,d) \geq \tau$$

với $\tau$ = ngưỡng tối thiểu (`RAGV2_RERANK_MIN_SCORE`). Mục đích: **giảm rác** — chunk lọt vào nhờ trùng từ khoá nhưng không thật sự trả lời câu hỏi sẽ bị loại trước khi tốn token sinh. Nếu lọc sạch (toàn điểm thấp) → giữ top-K cao nhất để vẫn có ngữ cảnh. **Fallback**: tắt rerank / LLM lỗi → giữ nguyên thứ tự RRF, cắt top-K.

---

## 10. Query Transformation — Viết lại & định tuyến

Trước khi truy hồi, LLM xử lý câu hỏi thô:
- **Rewrite** — viết lại gọn, giàu từ khoá, bỏ từ thừa;
- **Keyword extraction** — tách 3–8 từ khoá quan trọng (danh từ, tên riêng, địa danh);
- **Routing** — chọn nguồn cần tra (`doc/trip/place/guide/post`);
- **Filter extraction** — bóc điểm đến, loại hình, ngân sách trần (VND), số ngày.

$$q_{\text{thô}} \xrightarrow{\text{LLM}} \{\, q_{\text{rewrite}},\; \text{keywords},\; \text{sources},\; \text{filters} \,\}$$

Có **fallback bằng luật heuristic** (tách token + match keyword) khi tắt rewrite hoặc LLM lỗi. Trong luồng agent, bước này chạy **một lần ở đầu vào** (rewrite đầu vào), kết quả dùng cho mọi lần `search_documents`.

---

## 11. Chunking

Tài liệu thô được cắt thành **chunk** trước khi embedding & lưu vào vector store (`rag_knowledge_chunks`). Lý do:
- Cửa sổ ngữ cảnh LLM giới hạn → không nhồi cả tài liệu;
- Truy hồi **đoạn liên quan** thay vì toàn văn → ngữ cảnh tinh, ít nhiễu, tiết kiệm token.

Mỗi chunk lưu kèm `embedding`, `docName`, `chunkIndex`, `content`.

---

## 12. Agent & ReAct — Tự điều phối công cụ

Kiến trúc mặc định (`RAGV2_AGENT=true`). Thay vì pipeline điều phối cứng, **LLM tự quyết** mỗi vòng theo mô hình **ReAct (Reasoning + Acting)**:

```
       ┌──────────────────────────────────────────┐
       ▼                                          │ (lặp ≤ N vòng)
  Reason (suy luận) → Act (gọi tool) → Observe (đọc kết quả)
       │
       └─► đủ dữ liệu → trả lời thẳng (không gọi tool nữa)
```

Nền tảng kỹ thuật: **LLM Function / Tool Calling** — LLM trả về lời gọi hàm có cấu trúc (`tool_calls` gồm tên + tham số JSON); hệ thống chạy executor tương ứng, nhồi kết quả (`observation`, role `tool`) trở lại hội thoại, lặp đến khi LLM trả lời thẳng hoặc chạm trần $N$ vòng (`RAGV2_AGENT_MAX_STEPS = 5`).

**6 công cụ** (`lib/rag-tools.ts`):

| Tool | Phương pháp |
|---|---|
| `search_trips / places / guides / posts` | Lexical DB retrieval (§5) |
| `search_documents` | Vector pipeline: rewrite → embed → hybrid → rerank (§6–10) |
| `create_itinerary` / `revise_itinerary` | LLM sinh JSON lộ trình từ ngữ cảnh thật |

**Tác dụng của agent** trong hệ này:
1. **Định tuyến động** — tự phân biệt "CÁCH DÙNG" (→ `search_documents`) với "TÌM THỰC THỂ" (→ search DB).
2. **Xâu chuỗi đa bước** cho câu phức (vd dựng lộ trình: `search_places` → `search_documents` → `create_itinerary`).
3. **Hiểu hội thoại nhiều lượt** + chống "dính chủ đề".
4. **Tự đánh giá & dừng** — đủ thì trả lời, thiếu thì gọi tiếp, không có thì nói thật.

**Đánh đổi:** linh hoạt cao hơn nhưng **nhiều lần gọi LLM hơn** (mỗi vòng 1 call) → độ trễ/chi phí cao và khó tái lập hơn pipeline cố định. Dự án giữ **cả hai** (`RAGV2_AGENT=true/false`) để so sánh.

---

## 13. Quản lý hội thoại đa lượt

- Truyền **6 lượt gần nhất** thành các lượt user/assistant **riêng biệt**; câu hiện tại gắn nhãn rõ "CÂU HỎI HIỆN TẠI".
- **Chống "dính chủ đề"**: agent tự phân biệt câu tiếp nối ("rẻ hơn được không", "thêm 1 ngày") với chủ đề mới (đổi điểm đến) qua chỉ dẫn system prompt.
- **Stateful draft**: lộ trình đang dựng (`draft`) gửi kèm để bot **chỉnh sửa** thay vì dựng lại từ đầu; chỉ hiện lộ trình khi lượt này thực sự tạo/sửa nó.

---

## 14. Prompt Engineering & Grounding

- **System prompt** định nghĩa vai trò ("trợ lý du lịch TripMate", xưng "mình"), nguyên tắc: **cấm bịa**, phân biệt "cách dùng" vs "tìm dữ liệu", chỉ dùng địa danh/đặc sản có trong dữ liệu thật.
- **Grounding**: câu trả lời chỉ dựa trên ngữ cảnh truy hồi; sau khi sinh, **lọc thẻ theo câu trả lời cuối** (chỉ giữ thẻ mà answer thực sự nhắc tên) để thẻ khớp nội dung, tránh hiển thị kết quả rác.

---

## 15. Trừu tượng hoá Provider

Hai token DI trừu tượng `RagEmbeddings` + `RagChat` (`lib/rag-llm.interface.ts`); **factory** chọn implementation theo env `RAGV2_LLM_PROVIDER` (`gemini` mặc định | `openai`). `RagV2Service` chỉ phụ thuộc interface trừu tượng → đổi provider **không sửa** logic truy hồi/rerank/sinh. Minh hoạ **Strategy pattern** + **nguyên lý đảo ngược phụ thuộc (DIP)**.

---

## Bản đồ lý thuyết → code

| Cơ sở lý thuyết | Hiện thực |
|---|---|
| RAG (orchestration) | `ragv2.service.ts` |
| Modular RAG (đa retriever) | `lib/retrievers/*.retriever.ts` + `retriever.interface.ts` |
| Embedding | `gemini-embeddings.ts` / `openai-embeddings.ts` |
| Cosine | `lib/cosine.ts` |
| BM25 (lexical) | `lib/lexical.ts` |
| RRF (fusion) | `lib/fusion.ts` |
| Reranking | `rerankCandidates()` trong `ragv2.service.ts` |
| Query rewrite + routing | `routeAndRewrite()` |
| Lexical DB retrieval | `searchTokens()` + ILIKE trong các retriever |
| Chunking | `lib/chunker.ts` |
| Agent / ReAct | `ragv2.agent.ts` (`runRagAgent`) |
| Function/Tool calling | `chatWithTools()` + `lib/rag-tools.ts` |
| Provider abstraction | `lib/rag-llm.interface.ts` + factory trong `ragv2.module.ts` |

---

## Tài liệu tham khảo

### Công trình gốc (tiếng Anh)
1. **RAG** — Lewis, P. et al. (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.* NeurIPS.
2. **Modular RAG** — Gao, Y. et al. (2023). *Retrieval-Augmented Generation for Large Language Models: A Survey.* arXiv:2312.10997.
3. **BM25** — Robertson, S. & Walker, S. (1994). *Okapi at TREC-3.* / Robertson & Zaragoza (2009), *The Probabilistic Relevance Framework: BM25 and Beyond.*
4. **TF-IDF** — Spärck Jones, K. (1972). *A statistical interpretation of term specificity and its application in retrieval.*
5. **RRF** — Cormack, G. V., Clarke, C. L. A., & Büttcher, S. (2009). *Reciprocal Rank Fusion outperforms Condorcet and individual rank learning methods.* SIGIR.
6. **ReAct** — Yao, S. et al. (2022). *ReAct: Synergizing Reasoning and Acting in Language Models.* arXiv:2210.03629.
7. **Dense Retrieval (DPR)** — Karpukhin, V. et al. (2020). *Dense Passage Retrieval for Open-Domain Question Answering.* EMNLP.
8. **Cosine similarity / Vector space model** — Salton, G., Wong, A., & Yang, C. S. (1975). *A Vector Space Model for Automatic Indexing.* CACM.
9. **Tool/Function calling** — Schick, T. et al. (2023). *Toolformer: Language Models Can Teach Themselves to Use Tools.* arXiv:2302.04761.

### Tài liệu tiếng Việt (khái niệm, dễ trích cho báo cáo)
10. **AWS — "RAG là gì?"** (bản tiếng Việt): <https://aws.amazon.com/vi/what-is/retrieval-augmented-generation/> — định nghĩa "Tạo tăng cường truy xuất", quy trình truy hồi + đặt nền câu trả lời.
11. **Google Cloud — "Tìm hiểu về RAG"** (hỗ trợ tiếng Việt): <https://cloud.google.com/use-cases/retrieval-augmented-generation> — RAG, embedding, vector search trong hệ sinh thái Google.
12. **Wikipedia tiếng Việt — "Mô hình ngôn ngữ lớn"**: <https://vi.wikipedia.org/wiki/Mô_hình_ngôn_ngữ_lớn> — khái niệm LLM, sinh văn bản, ảo giác.
13. **Cộng đồng Viblo** (viblo.asia) — nhiều bài giải thích RAG, embedding, vector database, AI Agent bằng tiếng Việt; tìm theo từ khoá "RAG", "embedding", "AI Agent ReAct".

> **Lưu ý cho báo cáo:** các thuật ngữ RAG/BM25/RRF/ReAct chưa có bản dịch tiếng Việt thống nhất trong giới học thuật; nên **giữ tên gốc tiếng Anh kèm chú thích tiếng Việt** (theo bảng thuật ngữ ở đầu tài liệu). Công thức nên trích từ công trình gốc (mục 1–9); nguồn tiếng Việt (10–13) dùng để diễn giải khái niệm.

> Các công thức trên viết bằng cú pháp LaTeX (`$...$`, `$$...$$`) — hiển thị đúng trong trình xem Markdown có hỗ trợ MathJax/KaTeX (vd VS Code với extension Markdown+Math, hoặc khi xuất sang Word/PDF qua Pandoc).



