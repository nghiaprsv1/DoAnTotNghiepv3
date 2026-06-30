import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { RagEmbeddings } from './lib/rag-llm.interface';
import { RagChat } from './lib/rag-llm.interface';
import { chunkText } from './lib/chunker';
import { cosineSimilarity } from './lib/cosine';
import { bm25Scores, tokenize, type LexicalDoc } from './lib/lexical';
import { reciprocalRankFusion } from './lib/fusion';
import { extractDates, reconcileDates } from './lib/date-vi';
import {
  type RagRetriever,
  type RagSource,
  type RetrievedCard,
  type RetrieverFilters,
} from './lib/retrievers/retriever.interface';
import { TripRetriever } from './lib/retrievers/trip.retriever';
import { PlaceRetriever } from './lib/retrievers/place.retriever';
import { GuideRetriever } from './lib/retrievers/guide.retriever';
import { PostRetriever } from './lib/retrievers/post.retriever';
import { runRagAgent } from './ragv2.agent';
import { type DocHit, type DocSearchDetail, type ToolDeps } from './lib/rag-tools';

/** Kết quả Router: nguồn cần truy + bộ lọc bóc từ câu hỏi. */
interface RouteResult {
  search: string;
  keywords: string[];
  via: 'llm' | 'fallback' | 'disabled';
  sources: RagSource[];
  filters: RetrieverFilters;
  /** User muốn TẠO lộ trình mới (không phải tìm chuyến có sẵn). */
  wantsItinerary: boolean;
}

const ALL_SOURCES: RagSource[] = ['doc', 'trip', 'place', 'guide', 'post'];

/** Một chunk được truy hồi kèm điểm tương đồng (để hiển thị pipeline). */
export interface RetrievedChunk {
  docName: string;
  chunkIndex: number;
  content: string;
  charCount: number;
  score: number;
}

/** Trace từng bước pipeline RAG — FE dùng để vẽ "phương pháp thực thi". */
export interface RagTrace {
  steps: RagStep[];
  sources: { docName: string; chunkIndex: number }[];
  totalMs: number;
}

export interface RagStep {
  key:
    | 'query_rewrite'
    | 'db_retrieval'
    | 'embed_query'
    | 'hybrid_search'
    | 'rerank'
    | 'build_context'
    | 'generate'
    // Agent (tool-calling) — vòng ReAct: khởi tạo, gọi công cụ, chốt câu trả lời.
    | 'agent_start'
    | 'agent_tool'
    | 'agent_final';
  title: string;
  ms: number;
  detail: Record<string, unknown>;
}

/** Thẻ kết quả DB trả về FE (rút gọn từ RetrievedCard, bỏ context nội bộ). */
export interface RagResultCard {
  source: RagSource;
  id: string;
  title: string;
  subtitle: string;
  image?: string;
  detailPath: string;
}

/**
 * Lộ trình do v2 sinh (RAG-grounded). Cùng shape với AiTripSuggestion của v1 để
 * tái dùng endpoint POST /ai/create-trip khi materialize thành Trip thật.
 */
export interface RagItinerarySuggestion {
  title: string;
  destination: string;
  durationDays: number;
  /** Ngày khởi hành (ISO yyyy-mm-dd) — bóc từ câu user hoặc suy từ start+days. */
  startDate?: string;
  /** Ngày kết thúc (ISO yyyy-mm-dd). */
  endDate?: string;
  summary: string;
  categoryKey?: string;
  tags?: string[];
  estimatedBudget?: number;
  maxMembers?: number;
  itinerary?: {
    dayNumber: number;
    title: string;
    activities?: { time: string; title: string; description?: string }[];
  }[];
}

export interface RagAskResult {
  answer: string;
  cards: RagResultCard[];
  /** Lộ trình v2 dựng (chỉ khi user yêu cầu tạo lộ trình). FE hiện + nút Tạo chuyến. */
  suggestion?: RagItinerarySuggestion;
  trace: RagTrace;
}

export interface IngestResult {
  documents: { docName: string; chunks: number; chars: number }[];
  totalChunks: number;
  embeddingModel: string;
}

@Injectable()
export class RagV2Service {
  private readonly logger = new Logger(RagV2Service.name);
  private schemaReady = false;

  constructor(
    @InjectRepository(KnowledgeChunk)
    private readonly chunks: Repository<KnowledgeChunk>,
    private readonly dataSource: DataSource,
    private readonly embeddings: RagEmbeddings,
    private readonly chat: RagChat,
    private readonly config: ConfigService,
    private readonly tripRetriever: TripRetriever,
    private readonly placeRetriever: PlaceRetriever,
    private readonly guideRetriever: GuideRetriever,
    private readonly postRetriever: PostRetriever,
  ) {}

  /** Map nguồn → retriever DB (doc xử lý riêng bằng vector pipeline). */
  private dbRetrievers(): Record<Exclude<RagSource, 'doc'>, RagRetriever> {
    return {
      trip: this.tripRetriever,
      place: this.placeRetriever,
      guide: this.guideRetriever,
      post: this.postRetriever,
    };
  }

  /** Thư mục chứa tài liệu nguồn RAG (cấu hình qua RAGV2_DOCS_DIR). */
  private docsDir(): string {
    const configured = this.config.get<string>('RAGV2_DOCS_DIR');
    if (configured) return configured;
    // backend/ chạy ở process.cwd(); tài liệu nằm ở thư mục gốc dự án.
    return path.resolve(process.cwd(), '..', 'documemtRAG');
  }

  private topK(): number {
    return Number(this.config.get<string>('RAGV2_TOP_K')) || 4;
  }

  /** Số ứng viên giữ lại sau hybrid search để đưa vào rerank (rộng hơn topK). */
  private candidateK(): number {
    return Number(this.config.get<string>('RAGV2_CANDIDATE_K')) || 12;
  }

  /** Bật/tắt viết lại câu hỏi (query rewriting). Mặc định bật. */
  private rewriteEnabled(): boolean {
    return this.config.get<string>('RAGV2_QUERY_REWRITE') !== 'false';
  }

  /** Bật/tắt rerank bằng LLM. Mặc định bật (có fallback điểm RRF nếu lỗi). */
  private rerankEnabled(): boolean {
    return this.config.get<string>('RAGV2_RERANK') !== 'false';
  }

  /** Ngưỡng điểm rerank (0–10) để 1 chunk được coi là đủ liên quan. */
  private rerankMinScore(): number {
    const v = Number(this.config.get<string>('RAGV2_RERANK_MIN_SCORE'));
    return Number.isFinite(v) ? v : 4;
  }

  /** Bật/tắt truy hồi từ DB (trips/places/guides/posts). Mặc định bật. */
  private dbRetrievalEnabled(): boolean {
    return this.config.get<string>('RAGV2_DB_RETRIEVAL') !== 'false';
  }

  /** Số thẻ tối đa lấy mỗi nguồn DB. */
  private dbLimit(): number {
    return Number(this.config.get<string>('RAGV2_DB_LIMIT')) || 4;
  }

  /** Bật kiến trúc AGENT (tool-calling) thay cho pipeline cố định. Mặc định bật. */
  private agentEnabled(): boolean {
    return this.config.get<string>('RAGV2_AGENT') !== 'false';
  }

  /** Trần số vòng ReAct của agent (chống lặp vô hạn / tốn quota). */
  private agentMaxSteps(): number {
    return Number(this.config.get<string>('RAGV2_AGENT_MAX_STEPS')) || 5;
  }

  /**
   * Tạo bảng nếu chưa có (CREATE TABLE IF NOT EXISTS) — để chạy được bất kể
   * DB_SYNCHRONIZE bật hay tắt, không ảnh hưởng schema của các module khác.
   */
  private async ensureSchema(): Promise<void> {
    if (this.schemaReady) return;
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS rag_knowledge_chunks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_name varchar(255) NOT NULL,
        chunk_index int NOT NULL,
        content text NOT NULL,
        char_count int NOT NULL DEFAULT 0,
        embedding_model varchar(100) NOT NULL DEFAULT '',
        embedding jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    await this.dataSource.query(
      `CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc ON rag_knowledge_chunks (doc_name);`,
    );
    this.schemaReady = true;
  }

  /** Tình trạng vector store: số chunk, tài liệu đã index, sẵn sàng chưa. */
  async status(): Promise<{
    ready: boolean;
    provider: string;
    geminiConfigured: boolean;
    embeddingModel: string;
    chatModel: string;
    totalChunks: number;
    documents: { docName: string; chunks: number }[];
    availableFiles: string[];
  }> {
    await this.ensureSchema();
    const rows = await this.chunks
      .createQueryBuilder('c')
      .select('c.doc_name', 'docName')
      .addSelect('COUNT(*)', 'chunks')
      .groupBy('c.doc_name')
      .getRawMany<{ docName: string; chunks: string }>();
    const documents = rows.map((r) => ({ docName: r.docName, chunks: Number(r.chunks) }));
    const totalChunks = documents.reduce((s, d) => s + d.chunks, 0);

    let availableFiles: string[] = [];
    try {
      availableFiles = fs
        .readdirSync(this.docsDir())
        .filter((f) => /\.(txt|md)$/i.test(f));
    } catch {
      availableFiles = [];
    }

    return {
      ready: this.embeddings.isReady() && totalChunks > 0,
      // provider hiện hành (gemini | openai). geminiConfigured giữ tên cũ cho FE
      // (nghĩa: "LLM đã cấu hình khoá chưa") — true khi provider đang dùng có key.
      provider: this.embeddings.providerName,
      geminiConfigured: this.embeddings.isReady(),
      embeddingModel: this.embeddings.model,
      chatModel: this.chat.model,
      totalChunks,
      documents,
      availableFiles,
    };
  }

  /**
   * NẠP / RE-INDEX tài liệu: đọc file trong docsDir → chunk → embed (batch) →
   * xoá chunk cũ của tài liệu đó → lưu chunk mới. Idempotent theo tên tài liệu.
   *
   * @param only nếu truyền, chỉ index các file có tên trong danh sách này.
   */
  async ingest(only?: string[]): Promise<IngestResult> {
    if (!this.embeddings.isReady()) {
      throw new Error(
        `Chưa cấu hình khoá API cho provider "${this.embeddings.providerName}" — không thể tạo embedding.`,
      );
    }
    await this.ensureSchema();

    const dir = this.docsDir();
    let files: string[];
    try {
      files = fs.readdirSync(dir).filter((f) => /\.(txt|md)$/i.test(f));
    } catch (e) {
      throw new Error(`Không đọc được thư mục tài liệu: ${dir} (${(e as Error).message})`);
    }
    if (only?.length) files = files.filter((f) => only.includes(f));
    if (files.length === 0) {
      throw new Error(`Không có tài liệu .txt/.md nào trong ${dir}`);
    }

    const documents: IngestResult['documents'] = [];
    for (const file of files) {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      const parts = chunkText(raw);
      if (parts.length === 0) continue;

      // Embed theo batch để giảm số lần gọi mạng.
      const vectors = await this.embeddings.embedBatch(
        parts.map((p) => p.content),
        'RETRIEVAL_DOCUMENT',
      );

      // Re-index: xoá chunk cũ của tài liệu rồi lưu mới (transaction nhỏ).
      await this.chunks.delete({ docName: file });
      const entities = parts.map((p, i) =>
        this.chunks.create({
          docName: file,
          chunkIndex: p.index,
          content: p.content,
          charCount: p.charCount,
          embeddingModel: this.embeddings.model,
          embedding: vectors[i],
        }),
      );
      await this.chunks.save(entities, { chunk: 50 });

      documents.push({
        docName: file,
        chunks: parts.length,
        chars: parts.reduce((s, p) => s + p.charCount, 0),
      });
      this.logger.log(`Đã index "${file}": ${parts.length} chunk.`);
    }

    return {
      documents,
      totalChunks: documents.reduce((s, d) => s + d.chunks, 0),
      embeddingModel: this.embeddings.model,
    };
  }

  /**
   * Pipeline RAG NÂNG CẤP, trả về câu trả lời + TRACE từng bước để FE hiển thị
   * "phương pháp thực thi". So với RAG thuần (chỉ cosine top-K), pipeline này
   * lọc kỹ hơn để GIẢM RÁC đưa vào LLM → tiết kiệm token + tăng độ chính xác:
   *   1. query_rewrite  — LLM viết lại câu hỏi gọn + tách keywords (fallback: bỏ stopword).
   *   2. embed_query    — embed câu đã viết lại → vector.
   *   3. hybrid_search  — DENSE (cosine) + SPARSE (BM25) → hợp nhất RRF → N ứng viên.
   *   4. rerank         — LLM chấm điểm liên quan 0–10 từng ứng viên → lọc top-K tinh
   *                       (fallback: giữ thứ tự RRF nếu LLM lỗi).
   *   5. build_context  — ghép ngữ cảnh CHỈ từ top-K sau rerank.
   *   6. generate       — LLM sinh câu trả lời CHỈ từ ngữ cảnh đó.
   */
  async ask(
    question: string,
    draft?: RagItinerarySuggestion | null,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<RagAskResult> {
    const q = question.trim();
    if (!q) throw new Error('Câu hỏi rỗng.');
    if (!this.embeddings.isReady()) {
      throw new Error(
        `Chưa cấu hình khoá API cho provider "${this.embeddings.providerName}" — RAG v2 cần khoá LLM.`,
      );
    }
    await this.ensureSchema();

    // KIẾN TRÚC AGENT (tool-calling): LLM tự điều phối gọi tool. Bật mặc định.
    // draft + history đưa VÀO agent → LLM tự quyết: trả lời / tạo mới / chỉnh sửa,
    // và tự phát hiện câu mới đổi chủ đề (không "dính" lộ trình cũ).
    if (this.agentEnabled()) {
      return this.askWithAgent(q, draft, history);
    }

    // PIPELINE CŨ (RAGV2_AGENT=false): vẫn ép revise khi có draft (logic cũ giữ nguyên).
    if (draft && draft.title) {
      return this.reviseItineraryFlow(q, draft);
    }

    const t0 = Date.now();
    const steps: RagStep[] = [];

    // ── BƯỚC 1: Router + viết lại câu hỏi (1 lần gọi LLM, gộp định tuyến) ──
    const r0 = Date.now();
    const route = await this.routeAndRewrite(q);
    let useDoc = route.sources.includes('doc');
    steps.push({
      key: 'query_rewrite',
      title: 'Định tuyến & viết lại câu hỏi (router + rewrite)',
      ms: Date.now() - r0,
      detail: {
        enabled: this.rewriteEnabled(),
        via: route.via,
        original: q,
        rewritten: route.search,
        keywords: route.keywords,
        sources: route.sources,
        filters: {
          destination: route.filters.destination ?? null,
          category: route.filters.category ?? null,
          maxBudget: route.filters.maxBudget ?? null,
          days: route.filters.days ?? null,
        },
      },
    });
    const searchText = route.search;
    const lexicalText = `${route.search} ${route.keywords.join(' ')}`.trim();

    // ── BƯỚC 2: Truy hồi DB (Modular RAG — Search modules: trips/places/guides/posts) ──
    // Chạy các retriever DB mà Router chọn. Toàn bộ là query SQL thuần (0 token).
    const db0 = Date.now();
    const cards = await this.retrieveFromDb(route);
    const cardsBySource: Record<string, number> = {};
    for (const c of cards) cardsBySource[c.source] = (cardsBySource[c.source] ?? 0) + 1;
    steps.push({
      key: 'db_retrieval',
      title: 'Truy hồi cơ sở dữ liệu (multi-source)',
      ms: Date.now() - db0,
      detail: {
        enabled: this.dbRetrievalEnabled(),
        routedSources: route.sources,
        perSource: cardsBySource,
        total: cards.length,
        results: cards.map((c) => ({
          source: c.source,
          title: c.title,
          subtitle: c.subtitle,
          detailPath: c.detailPath,
        })),
      },
    });

    // FALLBACK: Router bỏ 'doc' nhưng DB không có kết quả → quay lại tra tài liệu
    // để không bỏ sót (vd "địa điểm ở Phú Quốc" có trong PhuQuoc.txt mà DB chưa seed).
    if (!useDoc && cards.length === 0) {
      useDoc = true;
      this.logger.log('DB rỗng → fallback sang truy hồi tài liệu (doc).');
    }

    // ── BƯỚC 3-5: Pipeline TÀI LIỆU (chạy khi Router chọn 'doc' HOẶC DB rỗng) ──
    let top: RetrievedChunk[] = [];
    if (useDoc) {
    // ── BƯỚC 2: Embed câu (đã viết lại) ──
    const e0 = Date.now();
    const queryVec = await this.embeddings.embed(searchText, 'RETRIEVAL_QUERY');
    steps.push({
      key: 'embed_query',
      title: 'Vector hoá câu hỏi (embedding)',
      ms: Date.now() - e0,
      detail: {
        model: this.embeddings.model,
        dimensions: queryVec.length,
        embeddedText: searchText,
        preview: queryVec.slice(0, 8).map((n) => Number(n.toFixed(4))),
      },
    });

    // ── BƯỚC 3: Hybrid search (DENSE cosine + SPARSE BM25 → RRF) ──
    const s0 = Date.now();
    const all = await this.chunks.find();

    // DENSE: cosine toàn bộ chunk.
    const denseScored = all.map((c) => ({
      chunk: c,
      score: cosineSimilarity(queryVec, c.embedding ?? []),
    }));
    const denseRanked = [...denseScored].sort((a, b) => b.score - a.score);
    const denseRanking = denseRanked.map((d) => d.chunk.id);

    // SPARSE: BM25 trên keyword.
    const lexDocs: LexicalDoc[] = all.map((c) => {
      const tokens = tokenize(c.content);
      return { id: c.id, tokens, length: tokens.length };
    });
    const bm25 = bm25Scores(lexicalText, lexDocs);
    const sparseRanked = [...all]
      .map((c) => ({ id: c.id, score: bm25.get(c.id) ?? 0 }))
      .sort((a, b) => b.score - a.score);
    const sparseRanking = sparseRanked.filter((s) => s.score > 0).map((s) => s.id);

    // HỢP NHẤT bằng Reciprocal Rank Fusion (không cộng điểm khác thang).
    const fused = reciprocalRankFusion({
      dense: denseRanking,
      sparse: sparseRanking,
    });
    const candidateK = this.candidateK();
    const byId = new Map(all.map((c) => [c.id, c]));
    const denseScoreById = new Map(denseScored.map((d) => [d.chunk.id, d.score]));

    // Ứng viên = top theo RRF, kèm đủ điểm thành phần để trace minh bạch.
    const candidates = fused.slice(0, candidateK).map((f) => {
      const c = byId.get(f.id)!;
      return {
        chunk: c,
        rrf: f.rrf,
        denseScore: denseScoreById.get(f.id) ?? 0,
        sparseScore: bm25.get(f.id) ?? 0,
        denseRank: f.ranks.dense,
        sparseRank: f.ranks.sparse,
      };
    });
    steps.push({
      key: 'hybrid_search',
      title: 'Tìm kiếm lai (hybrid: vector + từ khoá → RRF)',
      ms: Date.now() - s0,
      detail: {
        method: 'dense cosine + sparse BM25, hợp nhất bằng Reciprocal Rank Fusion',
        candidates: all.length,
        denseTop: denseRanking.length,
        sparseTop: sparseRanking.length,
        candidateK,
        results: candidates.map((r) => ({
          docName: r.chunk.docName,
          chunkIndex: r.chunk.chunkIndex,
          score: Number(r.rrf.toFixed(4)),
          denseScore: Number(r.denseScore.toFixed(4)),
          sparseScore: Number(r.sparseScore.toFixed(4)),
          denseRank: r.denseRank ?? null,
          sparseRank: r.sparseRank ?? null,
          preview: r.chunk.content.slice(0, 160),
          content: r.chunk.content,
        })),
      },
    });

    // ── BƯỚC 4: Rerank (LLM chấm điểm liên quan, lọc top-K tinh) ──
    const rr0 = Date.now();
    const topK = this.topK();
    const reranked = await this.rerankCandidates(q, candidates, topK);
    steps.push({
      key: 'rerank',
      title: 'Xếp hạng lại & lọc (reranking)',
      ms: Date.now() - rr0,
      detail: {
        enabled: this.rerankEnabled(),
        via: reranked.via,
        minScore: this.rerankMinScore(),
        before: candidates.length,
        after: reranked.top.length,
        topK,
        results: reranked.top.map((r) => ({
          docName: r.chunk.docName,
          chunkIndex: r.chunk.chunkIndex,
          score: Number((r.relevance ?? 0).toFixed(2)),
          denseScore: Number(r.denseScore.toFixed(4)),
          preview: r.chunk.content.slice(0, 160),
          content: r.chunk.content,
          reason: r.reason ?? '',
        })),
      },
    });

    top = reranked.top.map((r) => ({
      docName: r.chunk.docName,
      chunkIndex: r.chunk.chunkIndex,
      content: r.chunk.content,
      charCount: r.chunk.charCount,
      score: r.denseScore, // giữ điểm dense cho ngưỡng grounded bên dưới
    }));
    } // hết if (useDoc)

    // ── BƯỚC 5: Ghép ngữ cảnh (gộp đoạn tài liệu + dữ liệu DB thật) ──
    const c0 = Date.now();
    const docContext = top
      .map((r) => `[Tài liệu: ${r.docName} — đoạn #${r.chunkIndex}]\n${r.content}`)
      .join('\n\n');
    // Tóm tắt entity DB (chuyến/địa điểm/HDV/bài viết) đưa vào ngữ cảnh để LLM
    // giới thiệu DỮ LIỆU THẬT, không bịa. Card hiển thị riêng ở FE.
    const dbContext = cards.length
      ? 'DỮ LIỆU THẬT TRONG HỆ THỐNG (giới thiệu cho người dùng, không bịa thêm):\n' +
        cards.map((c, i) => `${i + 1}. ${c.context}`).join('\n')
      : '';
    const context = [docContext, dbContext].filter(Boolean).join('\n\n');
    steps.push({
      key: 'build_context',
      title: 'Xây dựng ngữ cảnh (context)',
      ms: Date.now() - c0,
      detail: {
        chunksUsed: top.length,
        dbItems: cards.length,
        contextChars: context.length,
        sources: [
          ...top.map((r) => `${r.docName} #${r.chunkIndex}`),
          ...cards.map((c) => `${c.source}:${c.title}`),
        ],
        contextText: context,
      },
    });

    // ── BƯỚC 6: Sinh câu trả lời ──
    const g0 = Date.now();
    let answer: string;
    let mode: 'generated' | 'no_context' | 'extractive_fallback' = 'generated';
    let generateNote: string | undefined;
    let sentSystem = '';
    let sentPrompt = '';
    // Mặc định thẻ hiển thị = mọi kết quả truy hồi; nếu LLM chọn được thì lọc lại.
    let selectedCards = cards;
    let suggestion: RagItinerarySuggestion | undefined;
    // Có ngữ cảnh để trả lời khi: tài liệu đủ liên quan (cosine ≥ 0.3) HOẶC tìm
    // được dữ liệu thật trong DB (chuyến/địa điểm/HDV/bài viết).
    const docGrounded = top.length > 0 && (top[0]?.score ?? 0) >= 0.3;
    const grounded = docGrounded || cards.length > 0;

    if (route.wantsItinerary) {
      // TẠO LỘ TRÌNH MỚI: LLM dựng itinerary từ ngữ cảnh (tài liệu tỉnh + địa
      // điểm DB), CHỈ dùng địa danh có thật trong context. Khác hẳn việc tìm
      // chuyến có sẵn — đây là sinh nội dung mới có căn cứ (RAG-grounded).
      const built = await this.generateItinerary(q, context).catch((err) => {
        this.logger.warn(`Sinh lộ trình lỗi: ${(err as Error).message}`);
        return null;
      });
      sentSystem = '(xem bước sinh lộ trình)';
      sentPrompt = context;
      if (built) {
        suggestion = built;
        mode = 'generated';
        answer =
          `Mình đã dựng lộ trình "${built.title}" (${built.destination}, ${built.durationDays} ngày) ` +
          `dựa trên thông tin thật về điểm đến. Bạn xem chi tiết bên dưới, có thể yêu cầu mình chỉnh, ` +
          `rồi bấm "Tạo chuyến" để lưu thành chuyến đi của bạn nhé!`;
      } else {
        mode = grounded ? 'generated' : 'no_context';
        answer =
          'Mình chưa dựng được lộ trình lúc này (có thể thiếu thông tin về điểm đến trong dữ liệu, ' +
          'hoặc hết quota). Bạn thử nêu rõ điểm đến và số ngày, hoặc hỏi lại sau nhé.';
      }
    } else if (!grounded) {
      // Không có gì để bám → trả lời an toàn, không bịa.
      mode = 'no_context';
      answer =
        'Mình chưa tìm thấy thông tin liên quan trong tài liệu hay dữ liệu hệ thống. ' +
        'Bạn thử hỏi về một điểm đến, chuyến đi, hoặc cách dùng website TripMate nhé.';
    } else if (cards.length > 0) {
      // Có dữ liệu DB → LLM vừa viết câu trả lời, vừa CHỌN thẻ liên quan nhất
      // (trả số thứ tự). Nhờ vậy câu trả lời và thẻ hiển thị luôn khớp nhau.
      const system = `Bạn là trợ lý du lịch TripMate, trả lời bằng tiếng Việt, xưng "mình".
NGỮ CẢNH gồm: (tuỳ chọn) đoạn tài liệu, và "DỮ LIỆU THẬT TRONG HỆ THỐNG" là danh sách
mục được ĐÁNH SỐ. Hãy CHỌN những mục thực sự phù hợp câu hỏi và giới thiệu ngắn gọn.
TRẢ VỀ DUY NHẤT JSON:
{"answer": "câu trả lời tiếng Việt, giới thiệu các mục đã chọn, mời bấm thẻ bên dưới để xem chi tiết",
 "selected": [số thứ tự các mục phù hợp, theo đúng số trong ngữ cảnh]}
QUY TẮC: CHỈ dùng thông tin trong ngữ cảnh, không bịa. Nếu nhiều mục cùng hợp, chọn hết.
Nếu không mục nào hợp, "selected": []. Khi trích tài liệu, ghi tên tệp trong ngoặc.`;
      const prompt = `NGỮ CẢNH:\n${context}\n\nCÂU HỎI: ${q}\n\nTrả lời + chọn mục:`;
      sentSystem = system;
      sentPrompt = prompt;
      try {
        const parsed = await this.chat.completeJson<{ answer?: string; selected?: number[] }>({
          system,
          prompt,
          temperature: 0.3,
          maxTokens: 1024,
        });
        if (!parsed?.answer) throw new Error('Gemini trả về rỗng');
        answer = parsed.answer;
        // Lọc thẻ theo số LLM chọn (1-based). Lựa chọn rỗng/lỗi → giữ nguyên.
        const picked = Array.isArray(parsed.selected)
          ? parsed.selected
              .map((n) => cards[Number(n) - 1])
              .filter((c): c is (typeof cards)[number] => Boolean(c))
          : [];
        if (picked.length > 0) selectedCards = picked;
      } catch (err) {
        mode = 'extractive_fallback';
        generateNote = `Bỏ qua bước sinh do lỗi: ${(err as Error).message.slice(0, 120)}`;
        this.logger.warn(`Generate fallback: ${(err as Error).message}`);
        const cardPart = cards
          .slice(0, 4)
          .map((c) => `• ${c.title} — ${c.subtitle}`)
          .join('\n');
        answer =
          `⚠️ Không gọi được mô hình sinh câu trả lời (có thể hết quota Gemini). ` +
          `Dưới đây là kết quả mình truy hồi được:\n\n${cardPart}`;
      }
    } else {
      // Chỉ có tài liệu (không có dữ liệu DB) → sinh trả lời thuần từ ngữ cảnh.
      const system = `Bạn là trợ lý hỏi-đáp dựa trên tài liệu (RAG) của TripMate, trả lời bằng tiếng Việt.
QUY TẮC:
- CHỈ trả lời dựa trên "NGỮ CẢNH" bên dưới. TUYỆT ĐỐI không bịa thông tin ngoài ngữ cảnh.
- Nếu ngữ cảnh không đủ, nói rõ là chưa có thông tin. Trả lời ngắn gọn, đi thẳng vào ý.
- Khi trích nguồn, ghi rõ tên tài liệu trong ngoặc, ví dụ (CaoBang.txt).`;
      const prompt = `NGỮ CẢNH:\n${context}\n\nCÂU HỎI: ${q}\n\nTrả lời dựa trên ngữ cảnh trên:`;
      sentSystem = system;
      sentPrompt = prompt;
      try {
        answer = await this.chat.complete({ system, prompt, temperature: 0.3, maxTokens: 1024 });
        if (!answer) throw new Error('Gemini trả về rỗng');
      } catch (err) {
        mode = 'extractive_fallback';
        generateNote = `Bỏ qua bước sinh do lỗi: ${(err as Error).message.slice(0, 120)}`;
        this.logger.warn(`Generate fallback: ${(err as Error).message}`);
        answer =
          `⚠️ Không gọi được mô hình sinh câu trả lời (có thể hết quota Gemini). ` +
          `Dưới đây là đoạn tài liệu liên quan nhất mình truy hồi được:\n\n` +
          top
            .slice(0, 2)
            .map((r) => `📄 ${r.docName} (đoạn #${r.chunkIndex}):\n${r.content}`)
            .join('\n\n');
      }
    }
    steps.push({
      key: 'generate',
      title: route.wantsItinerary ? 'Dựng lộ trình (generation)' : 'Sinh câu trả lời (generation)',
      ms: Date.now() - g0,
      detail: {
        model: this.chat.model,
        mode,
        groundedOnContext: grounded,
        answerChars: answer.length,
        ...(route.wantsItinerary
          ? { itineraryBuilt: !!suggestion, itineraryDays: suggestion?.itinerary?.length ?? 0 }
          : {}),
        ...(cards.length > 0
          ? { cardsRetrieved: cards.length, cardsSelected: selectedCards.length }
          : {}),
        // Phơi NGUYÊN VĂN system + prompt đã gửi cho Gemini — bằng chứng model
        // chỉ nhận đúng ngữ cảnh truy hồi, KHÔNG tự đọc tài liệu gốc.
        sentSystem,
        sentPrompt,
        ...(generateNote ? { note: generateNote } : {}),
      },
    });

    return {
      answer,
      cards: selectedCards.map((c) => ({
        source: c.source,
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        image: c.image,
        detailPath: c.detailPath,
      })),
      suggestion,
      trace: {
        steps,
        sources: top.map((r) => ({ docName: r.docName, chunkIndex: r.chunkIndex })),
        totalMs: Date.now() - t0,
      },
    };
  }

  /* ─────────────────── Helpers cho pipeline nâng cấp ─────────────────── */

  /**
   * KIẾN TRÚC AGENT — chạy vòng ReAct tool-calling rồi đóng gói về RagAskResult.
   * LLM tự quyết gọi tool nào (4 retriever DB + search_documents + create_itinerary
   * + revise_itinerary nếu có draft). Trace gồm agent_start / agent_tool / agent_final.
   */
  private async askWithAgent(
    q: string,
    draft?: RagItinerarySuggestion | null,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<RagAskResult> {
    const t0 = Date.now();

    // ── REWRITE Ở ĐẦU VÀO (1 lần): câu hỏi vừa vào → viết lại + tách keywords +
    // định tuyến. Kết quả dùng cho MỌI lần search_documents trong vòng agent, nên
    // KHÔNG rewrite lại bên trong tool nữa (tránh làm 2 lần). Agent vẫn nhận câu
    // GỐC q để hiểu ngữ cảnh/đổi chủ đề.
    const rw0 = Date.now();
    const route = await this.routeAndRewrite(q).catch(() => null);
    const searchText = route?.search || q;
    const lexicalText = route ? `${route.search} ${route.keywords.join(' ')}`.trim() : q;
    const rewriteStep: RagStep = {
      key: 'query_rewrite',
      title: 'Viết lại câu hỏi & định tuyến (đầu vào)',
      ms: Date.now() - rw0,
      detail: {
        enabled: this.rewriteEnabled(),
        via: route?.via ?? 'fallback',
        original: q,
        rewritten: searchText,
        keywords: route?.keywords ?? [],
        sources: route?.sources ?? [],
      },
    };

    const deps: ToolDeps = {
      retrievers: this.dbRetrievers(),
      // search_documents dùng câu ĐÃ rewrite ở đầu vào (bỏ qua query agent tự soạn)
      // → chỉ còn embed + hybrid + rerank bên trong tool.
      searchDocuments: (_query, topK) => this.searchDocuments(searchText, lexicalText, topK),
      createItinerary: (request, context) =>
        this.generateItinerary(request, context) as Promise<unknown | null>,
      // User đã nêu số ngày chưa → chặn create_itinerary nếu chưa (không tự chọn ngày).
      daysSpecified: this.detectDaysSpecified(q, route),
      // Chỉ gắn khi có draft → agent mới thấy tool revise_itinerary.
      reviseItinerary:
        draft && draft.title
          ? (request) => this.reviseItinerary(request, draft) as Promise<unknown | null>
          : undefined,
      dbLimit: this.dbLimit(),
      docTopK: this.topK(),
    };

    const result = await runRagAgent({
      question: q,
      chat: this.chat,
      deps,
      maxSteps: this.agentMaxSteps(),
      draft,
      history,
      // Router phát hiện ý định TẠO lộ trình → báo agent ưu tiên create_itinerary
      // (thay vì chỉ search_trips chuyến có sẵn). Vẫn để agent tự gom dữ liệu thật.
      // Fallback detectItineraryIntent(q) phòng khi router LLM lỗi (route null).
      wantsItinerary: route?.wantsItinerary ?? this.detectItineraryIntent(q),
      // Có số ngày → agent được dựng; chưa có → agent phải HỎI user số ngày.
      daysSpecified: this.detectDaysSpecified(q, route),
      logger: this.logger,
    });

    return {
      answer: result.answer,
      cards: result.cards.map((c) => ({
        source: c.source,
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        image: c.image,
        detailPath: c.detailPath,
      })),
      suggestion: result.suggestion,
      // Trace: step rewrite đầu vào đặt TRƯỚC các step của agent.
      trace: { steps: [rewriteStep, ...result.steps], sources: [], totalMs: Date.now() - t0 },
    };
  }

  /**
   * Tra tài liệu vector cho tool search_documents — nhận sẵn câu ĐÃ rewrite ở đầu
   * vào (searchText + lexicalText), KHÔNG tự rewrite nữa. Pipeline còn lại:
   *   ① embed (searchText)  → ② hybrid: DENSE cosine + SPARSE BM25 → RRF
   *   → ③ rerank LLM (chấm 0–10, lọc top-K).
   * Trả KÈM `detail` để /chatbot-v2 hiển thị rõ embedding + ranking (không hộp đen).
   */
  private async searchDocuments(
    searchText: string,
    lexicalText: string,
    topK: number,
  ): Promise<{ hits: DocHit[]; detail: DocSearchDetail }> {
    // ① Embed câu đã rewrite.
    const queryVec = await this.embeddings.embed(searchText, 'RETRIEVAL_QUERY');
    const all = await this.chunks.find();
    const emptyDetail: DocSearchDetail = {
      embedModel: this.embeddings.model,
      dimensions: queryVec.length,
      totalChunks: all.length,
      candidateK: this.candidateK(),
      rerankVia: 'disabled',
      candidates: [],
    };
    if (all.length === 0) return { hits: [], detail: emptyDetail };

    // ② Hybrid: DENSE cosine + SPARSE BM25 → RRF.
    const denseScored = all.map((c) => ({
      chunk: c,
      score: cosineSimilarity(queryVec, c.embedding ?? []),
    }));
    const denseRanking = [...denseScored].sort((a, b) => b.score - a.score).map((d) => d.chunk.id);

    const lexDocs: LexicalDoc[] = all.map((c) => {
      const tokens = tokenize(c.content);
      return { id: c.id, tokens, length: tokens.length };
    });
    const bm25 = bm25Scores(lexicalText, lexDocs);
    const sparseRanking = [...all]
      .map((c) => ({ id: c.id, score: bm25.get(c.id) ?? 0 }))
      .sort((a, b) => b.score - a.score)
      .filter((s) => s.score > 0)
      .map((s) => s.id);

    const fused = reciprocalRankFusion({ dense: denseRanking, sparse: sparseRanking });
    const byId = new Map(all.map((c) => [c.id, c]));
    const denseScoreById = new Map(denseScored.map((d) => [d.chunk.id, d.score]));

    // candidateK ứng viên (rộng hơn topK) đưa vào rerank.
    const candidates: RerankInput[] = fused.slice(0, this.candidateK()).map((f) => ({
      chunk: byId.get(f.id)!,
      rrf: f.rrf,
      denseScore: denseScoreById.get(f.id) ?? 0,
      sparseScore: bm25.get(f.id) ?? 0,
      denseRank: f.ranks.dense,
      sparseRank: f.ranks.sparse,
    }));

    // ③ Rerank bằng LLM (chấm 0–10, lọc top-K). Fallback: giữ thứ tự RRF.
    const reranked = await this.rerankCandidates(searchText, candidates, topK);
    const keptIds = new Set(reranked.top.map((r) => r.chunk.id));
    const relById = new Map(reranked.top.map((r) => [r.chunk.id, r.relevance]));

    const hits: DocHit[] = reranked.top.map((r) => ({
      docName: r.chunk.docName,
      chunkIndex: r.chunk.chunkIndex,
      content: r.chunk.content,
      score: r.denseScore,
    }));

    // Chi tiết pipeline để FE hiển thị: mọi ứng viên + điểm thành phần + kết quả lọc.
    const detail: DocSearchDetail = {
      embedModel: this.embeddings.model,
      dimensions: queryVec.length,
      totalChunks: all.length,
      candidateK: this.candidateK(),
      rerankVia: reranked.via,
      candidates: candidates.map((c) => ({
        docName: c.chunk.docName,
        chunkIndex: c.chunk.chunkIndex,
        preview: c.chunk.content.slice(0, 100),
        dense: c.denseScore,
        sparse: c.sparseScore,
        rrf: c.rrf,
        denseRank: c.denseRank ?? null,
        sparseRank: c.sparseRank ?? null,
        relevance: relById.get(c.chunk.id),
        kept: keptIds.has(c.chunk.id),
      })),
    };

    return { hits, detail };
  }

  /**
   * BƯỚC 1 — Router + viết lại câu hỏi (gộp 1 lần gọi LLM để tiết kiệm quota).
   * Gemini trả: câu truy vấn gọn + keywords + NGUỒN cần truy (doc/trip/place/
   * guide/post) + filter (điểm đến/loại hình/ngân sách/số ngày).
   * Fallback (tắt rewrite / LLM lỗi): câu gốc + token + đoán nguồn bằng keyword.
   */
  private async routeAndRewrite(q: string): Promise<RouteResult> {
    const fallbackKeywords = [...new Set(tokenize(q))].slice(0, 8);
    const heuristic = this.heuristicRoute(q);
    const wantsItinerary = this.detectItineraryIntent(q);
    const baseFilters: RetrieverFilters = {
      search: q,
      keywords: fallbackKeywords,
      ...heuristic.filters,
    };
    // Tạo lộ trình: cần tài liệu (tỉnh) + địa điểm làm căn cứ để LLM dựng, KHÔNG
    // đi tìm chuyến có sẵn. Ép sources = doc + place.
    const itinerarySources: RagSource[] = ['doc', 'place'];
    if (!this.rewriteEnabled()) {
      return {
        search: q,
        keywords: fallbackKeywords,
        via: 'disabled',
        sources: wantsItinerary ? itinerarySources : heuristic.sources,
        filters: baseFilters,
        wantsItinerary,
      };
    }
    try {
      const system = `Bạn là bộ ĐỊNH TUYẾN + tối ưu truy vấn cho chatbot du lịch TripMate (tiếng Việt).
Phân tích câu hỏi và TRẢ VỀ DUY NHẤT JSON:
{
  "search": "câu truy vấn gọn, rõ từ khoá, bỏ từ thừa",
  "keywords": ["3-8 từ khoá quan trọng: danh từ, tên riêng, địa danh"],
  "sources": ["nguồn cần tra, chọn 1 hoặc nhiều trong: doc, trip, place, guide, post"],
  "destination": "tên tỉnh/thành/địa danh nếu có",
  "category": "loại hình nếu rõ: beach|mountain|food|culture|city|island|adventure|nature|historical",
  "maxBudget": số VND nếu user nêu trần ngân sách (vd 3 triệu → 3000000),
  "days": số ngày nếu user nêu
}
QUY TẮC chọn "sources":
- "trip": tìm CHUYẾN ĐI/tour/lịch trình có sẵn.
- "place": hỏi ĐỊA ĐIỂM, điểm tham quan, danh lam.
- "guide": hỏi HƯỚNG DẪN VIÊN, người dẫn tour.
- "post": hỏi BÀI VIẾT, review, kinh nghiệm cộng đồng.
- "doc": KIẾN THỨC/HƯỚNG DẪN chung (cách dùng web, lưu ý du lịch, mùa đẹp, đặc sản…).
Chọn nhiều nguồn nếu câu đa ý. Không chắc thì thêm "doc". Giữ tiếng Việt có dấu. Chỉ trả JSON.`;
      const parsed = await this.chat.completeJson<{
        search?: string;
        keywords?: string[];
        sources?: string[];
        destination?: string;
        category?: string;
        maxBudget?: number;
        days?: number;
      }>({ system, prompt: `Câu hỏi: ${q}`, temperature: 0.2, maxTokens: 384 });
      const search = parsed?.search?.trim();
      if (search) {
        const keywords = (parsed?.keywords ?? [])
          .map((k) => String(k).trim())
          .filter(Boolean)
          .slice(0, 8);
        const sources = this.sanitizeSources(parsed?.sources);
        const filters: RetrieverFilters = {
          search,
          keywords: keywords.length ? keywords : fallbackKeywords,
          destination: parsed?.destination?.trim() || heuristic.filters.destination,
          category: parsed?.category?.trim() || undefined,
          maxBudget:
            typeof parsed?.maxBudget === 'number' && parsed.maxBudget > 0
              ? parsed.maxBudget
              : heuristic.filters.maxBudget,
          days: typeof parsed?.days === 'number' && parsed.days > 0 ? parsed.days : undefined,
          // browse do heuristic phát hiện (LLM không trả field này).
          browse: heuristic.filters.browse,
        };
        // Mặc định tra SONG SONG cả DB + tài liệu (Modular RAG + Fusion). Chỉ
        // liệt kê thuần (browse) mới bỏ 'doc' (khỏi tốn embed/rerank vô ích).
        const llmSources = sources.length ? sources : heuristic.sources;
        const dbOnly = llmSources.filter((s) => s !== 'doc');
        let finalSources: RagSource[];
        if (wantsItinerary) {
          finalSources = itinerarySources; // tạo lộ trình → doc + place
        } else if (filters.browse && dbOnly.length > 0) {
          finalSources = dbOnly; // liệt kê → chỉ DB
        } else {
          // luôn đảm bảo có 'doc' để gộp kiến thức tài liệu vào câu trả lời.
          finalSources = llmSources.includes('doc') ? llmSources : [...llmSources, 'doc'];
        }
        return {
          search,
          keywords: filters.keywords,
          via: 'llm',
          sources: finalSources,
          filters,
          wantsItinerary,
        };
      }
    } catch (err) {
      this.logger.warn(`Router/rewrite lỗi, dùng fallback: ${(err as Error).message}`);
    }
    return {
      search: q,
      keywords: fallbackKeywords,
      via: 'fallback',
      sources: wantsItinerary ? itinerarySources : heuristic.sources,
      filters: baseFilters,
      wantsItinerary,
    };
  }

  /** Lọc/chuẩn hoá mảng sources do LLM trả về (bỏ giá trị lạ). */
  private sanitizeSources(raw?: string[]): RagSource[] {
    if (!Array.isArray(raw)) return [];
    const valid = raw
      .map((s) => String(s).toLowerCase().trim())
      .filter((s): s is RagSource => (ALL_SOURCES as string[]).includes(s));
    return [...new Set(valid)];
  }

  /**
   * Phát hiện ý định TẠO lộ trình mới: động từ tạo/lập/lên/dựng/gợi ý/giúp + danh
   * từ lộ trình/lịch trình/kế hoạch/itinerary. Phân biệt với "tìm lịch trình có
   * sẵn" — chỉ coi là tạo khi có động từ kiến tạo đi kèm.
   */
  private detectItineraryIntent(q: string): boolean {
    const s = q.toLowerCase();
    return /(tạo|lập|lên|dựng|xây|thiết kế|gợi ý|đề xuất|giúp.*lên|lên.*giúp|làm.*cho)\s*.{0,16}(lộ trình|lịch trình|kế hoạch|hành trình|itinerary|chuyến\s*(đi|du lịch)|tour)/.test(
      s,
    );
  }

  /**
   * User đã nêu rõ SỐ NGÀY (hoặc ngày khởi hành) cho lộ trình chưa? Dùng để quyết
   * định agent được dựng lộ trình ngay hay phải HỎI user số ngày trước. Nhận diện:
   *   - "N ngày" / "N đêm" / "N ngày M đêm"
   *   - khoảng/mốc ngày: extractDates(q) bóc được ≥1 ngày (dd/mm, "ngày D tháng M")
   *   - Router LLM bóc được filters.days > 0
   */
  private detectDaysSpecified(q: string, route: RouteResult | null): boolean {
    if (route?.filters?.days && route.filters.days > 0) return true;
    const s = q.toLowerCase();
    if (/\b\d{1,2}\s*(ngày|đêm|day)/.test(s)) return true;
    if (extractDates(q).length > 0) return true;
    return false;
  }

  /**
   * Sinh lộ trình mới (RAG-grounded): LLM dựng itinerary JSON CHỈ từ ngữ cảnh đã
   * truy hồi (tài liệu tỉnh + địa điểm DB). Trả shape tương thích AiTripSuggestion
   * của v1 để FE materialize qua POST /ai/create-trip. Null nếu lỗi/parse hỏng.
   */
  private async generateItinerary(
    q: string,
    context: string,
  ): Promise<RagItinerarySuggestion | null> {
    const today = new Date().toISOString().slice(0, 10);
    const system = `Bạn là chuyên gia lập lộ trình du lịch Việt Nam cho TripMate.
Dựng lộ trình từ YÊU CẦU của người dùng, CHỈ dùng địa danh/đặc sản có trong "NGỮ CẢNH"
bên dưới (tài liệu + dữ liệu hệ thống). TUYỆT ĐỐI KHÔNG bịa địa danh ngoài ngữ cảnh.
TRẢ VỀ DUY NHẤT JSON đúng schema (không markdown):
{
  "title": "tên lộ trình hấp dẫn",
  "destination": "tên tỉnh/thành",
  "durationDays": số ngày (1-14),
  "summary": "3-5 câu giới thiệu",
  "itinerary": [{ "dayNumber": 1, "title": "...", "activities": [{ "time": "08:00", "title": "...", "description": "..." }] }],
  "tags": ["3-6 từ khoá"],
  "categoryKey": "một trong: beach, mountain, food, culture, city, island, adventure",
  "estimatedBudget": số VND ước tính/người,
  "maxMembers": số (4-12)
}
Hôm nay: ${today}. Viết tiếng Việt, mỗi ngày 2-4 hoạt động thực tế.`;
    const prompt = `NGỮ CẢNH (thông tin thật để dựng lộ trình):\n${context}\n\nYÊU CẦU: ${q}\n\nDựng lộ trình JSON:`;
    const built = await this.chat.completeJson<RagItinerarySuggestion>({
      system,
      prompt,
      temperature: 0.4,
      maxTokens: 2048,
    });
    if (!built || !built.title || !built.destination) return null;
    if (!built.durationDays || built.durationDays < 1) {
      built.durationDays = built.itinerary?.length ?? 3;
    }
    // Bóc ngày khởi hành/kết thúc từ câu user (nếu có) rồi chuẩn hoá với số ngày.
    const dates = extractDates(q);
    if (dates[0]) built.startDate = dates[0];
    if (dates[1]) built.endDate = dates[1];
    Object.assign(built, reconcileDates(built));
    return built;
  }

  /**
   * Luồng CHỈNH SỬA lộ trình nháp: dựng lại JSON từ draft + yêu cầu user (1 call
   * LLM, không truy hồi lại). Trả về trace gọn 1 bước để FE vẫn hiển thị nhất quán.
   */
  private async reviseItineraryFlow(
    q: string,
    draft: RagItinerarySuggestion,
  ): Promise<RagAskResult> {
    const t0 = Date.now();
    const revised = await this.reviseItinerary(q, draft).catch((err) => {
      this.logger.warn(`Chỉnh lộ trình lỗi: ${(err as Error).message}`);
      return null;
    });
    const ok = !!revised;
    const suggestion = revised ?? draft;
    const answer = ok
      ? `Mình đã cập nhật lộ trình "${suggestion.title}" theo yêu cầu. Bạn xem lại nhé — ưng thì bấm "Tạo chuyến".`
      : 'Mình chưa chỉnh được lộ trình lúc này. Bạn nói rõ muốn đổi gì (ngày nào, địa điểm nào) nhé.';
    return {
      answer,
      cards: [],
      suggestion,
      trace: {
        steps: [
          {
            key: 'generate',
            title: 'Chỉnh sửa lộ trình (revise)',
            ms: Date.now() - t0,
            detail: {
              model: this.chat.model,
              mode: ok ? 'generated' : 'extractive_fallback',
              itineraryBuilt: ok,
              itineraryDays: suggestion.itinerary?.length ?? 0,
              request: q,
            },
          },
        ],
        sources: [],
        totalMs: Date.now() - t0,
      },
    };
  }

  /** Nhờ LLM viết lại lộ trình theo yêu cầu chỉnh sửa, giữ nguyên schema. */
  private async reviseItinerary(
    q: string,
    draft: RagItinerarySuggestion,
  ): Promise<RagItinerarySuggestion | null> {
    const system = `Bạn chỉnh sửa lộ trình du lịch theo yêu cầu. GIỮ nguyên cấu trúc, chỉ áp dụng
thay đổi user yêu cầu (đổi/thêm/bớt ngày, đổi địa điểm, đổi ngân sách…). KHÔNG bịa địa danh xa lạ.
TRẢ VỀ DUY NHẤT JSON đúng schema cũ (không markdown):
{"title","destination","durationDays","summary","itinerary":[{"dayNumber","title","activities":[{"time","title","description"}]}],"tags","categoryKey","estimatedBudget","maxMembers"}
Giữ tiếng Việt.`;
    const prompt = `Lộ trình hiện tại (JSON):
${JSON.stringify({
      title: draft.title,
      destination: draft.destination,
      durationDays: draft.durationDays,
      summary: draft.summary,
      itinerary: draft.itinerary,
      tags: draft.tags,
      categoryKey: draft.categoryKey,
      estimatedBudget: draft.estimatedBudget,
      maxMembers: draft.maxMembers,
    })}

Yêu cầu chỉnh sửa: ${q}`;
    const updated = await this.chat.completeJson<RagItinerarySuggestion>({
      system,
      prompt,
      temperature: 0.4,
      maxTokens: 2048,
    });
    if (!updated || !updated.title) return null;
    if (!updated.durationDays || updated.durationDays < 1) {
      updated.durationDays = updated.itinerary?.length ?? draft.durationDays;
    }
    // Ngày: ưu tiên ngày user nêu trong yêu cầu chỉnh; nếu không thì giữ ngày cũ.
    const dates = extractDates(q);
    updated.startDate = dates[0] ?? draft.startDate;
    updated.endDate = dates[1] ?? (dates[0] ? undefined : draft.endDate);
    Object.assign(updated, reconcileDates(updated));
    return updated;
  }

  /**
   * Định tuyến dự phòng bằng luật (không cần LLM): đoán nguồn + bóc ngân sách thô.
   * Luôn kèm 'doc' để không bỏ sót tri thức chung.
   */
  private heuristicRoute(q: string): {
    sources: RagSource[];
    filters: Partial<RetrieverFilters>;
  } {
    const s = q.toLowerCase();
    const sources = new Set<RagSource>();
    if (/(chuyến|tour|lịch trình|đi .* ngày)/.test(s)) sources.add('trip');
    if (/(địa điểm|điểm đến|tham quan|danh lam|chỗ nào|nơi nào|cảnh)/.test(s)) sources.add('place');
    if (/(hướng dẫn viên|hdv|dẫn tour|guide)/.test(s)) sources.add('guide');
    if (/(bài viết|review|đánh giá|chia sẻ|kinh nghiệm|blog)/.test(s)) sources.add('post');

    const filters: Partial<RetrieverFilters> = {};
    // Ý định LIỆT KÊ/DUYỆT chung (không có địa danh cụ thể): "liệt kê", "tất cả",
    // "có những … nào", "danh sách", "cho xem". Bật browse để retriever trả top
    // theo rating thay vì đòi khớp từ khoá.
    const browse =
      /(liệt kê|danh sách|tất cả|có những|có các|có bao nhiêu|cho (mình |tôi )?xem|liệt|gồm những)/.test(
        s,
      );
    if (browse) filters.browse = true;

    // Liệt kê mà đã rõ nguồn DB → KHÔNG cần tài liệu (tiết kiệm embed/rerank).
    if (!(browse && sources.size > 0)) sources.add('doc');

    const mil = s.match(/(\d+(?:[.,]\d+)?)\s*(?:triệu|tr)\b/);
    if (mil) filters.maxBudget = Math.round(parseFloat(mil[1].replace(',', '.')) * 1_000_000);
    return { sources: [...sources], filters };
  }

  /**
   * BƯỚC 2 — Chạy các retriever DB mà Router chọn (Modular RAG: nhiều Search
   * module). Mỗi nguồn query song song, gộp kết quả. Toàn bộ là SQL thuần (0 token).
   */
  private async retrieveFromDb(route: RouteResult): Promise<RetrievedCard[]> {
    if (!this.dbRetrievalEnabled()) return [];
    const limit = this.dbLimit();
    const map = this.dbRetrievers();
    const picked = route.sources.filter((s): s is Exclude<RagSource, 'doc'> => s !== 'doc');
    if (picked.length === 0) return [];

    const batches = await Promise.all(
      picked.map((s) =>
        map[s].retrieve(route.filters, limit).catch((err) => {
          this.logger.warn(`Retriever ${s} lỗi: ${(err as Error).message}`);
          return [] as RetrievedCard[];
        }),
      ),
    );
    return batches.flat();
  }

  /**
   * BƯỚC 4 — Rerank ứng viên bằng LLM (chấm điểm liên quan 0–10), lọc còn top-K.
   * Đây là điểm mấu chốt GIẢM RÁC: nhiều chunk lọt hybrid nhờ trùng từ khoá nhưng
   * không thực sự trả lời được câu hỏi — rerank loại chúng trước khi tốn token sinh.
   * Fallback (tắt rerank / LLM lỗi): giữ nguyên thứ tự RRF, cắt top-K.
   */
  private async rerankCandidates(
    question: string,
    candidates: RerankInput[],
    topK: number,
  ): Promise<{ top: RerankOutput[]; via: 'llm' | 'fallback' | 'disabled' }> {
    const byRrf = (): RerankOutput[] =>
      candidates.slice(0, topK).map((c) => ({ ...c, relevance: undefined, reason: undefined }));

    if (!this.rerankEnabled() || candidates.length === 0) {
      return { top: byRrf(), via: candidates.length === 0 ? 'fallback' : 'disabled' };
    }

    try {
      // Đánh số ứng viên để LLM tham chiếu bằng index (ngắn gọn, ít token).
      const list = candidates
        .map(
          (c, i) =>
            `[${i}] (${c.chunk.docName} #${c.chunk.chunkIndex}) ${c.chunk.content.slice(0, 400)}`,
        )
        .join('\n\n');
      const system = `Bạn là bộ xếp hạng độ liên quan cho RAG. Cho CÂU HỎI và danh sách ĐOẠN
được đánh số. Chấm mỗi đoạn điểm liên quan 0-10 (10 = trả lời trực tiếp câu hỏi,
0 = không liên quan). TRẢ VỀ DUY NHẤT JSON:
{"ranked":[{"index":<số>,"score":<0-10>,"reason":"lý do ngắn"}]}
Chỉ chấm theo nội dung đoạn, không bịa. Sắp theo score giảm dần.`;
      const parsed = await this.chat.completeJson<{
        ranked?: { index?: number; score?: number; reason?: string }[];
      }>({
        system,
        prompt: `CÂU HỎI: ${question}\n\nCÁC ĐOẠN:\n${list}`,
        temperature: 0.1,
        maxTokens: 1024,
      });

      const ranked = parsed?.ranked;
      if (Array.isArray(ranked) && ranked.length) {
        const minScore = this.rerankMinScore();
        const scored = ranked
          .filter((r) => typeof r.index === 'number' && candidates[r.index!])
          .map((r) => ({
            ...candidates[r.index!],
            relevance: Number(r.score) || 0,
            reason: r.reason?.toString().slice(0, 160),
          }))
          .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0));
        // Lọc theo ngưỡng; nếu lọc sạch (toàn điểm thấp) thì giữ top-K cao nhất
        // để vẫn có ngữ cảnh thay vì rỗng.
        const passed = scored.filter((s) => (s.relevance ?? 0) >= minScore);
        const top = (passed.length ? passed : scored).slice(0, topK);
        if (top.length) return { top, via: 'llm' };
      }
    } catch (err) {
      this.logger.warn(`Rerank lỗi, dùng fallback RRF: ${(err as Error).message}`);
    }
    return { top: byRrf(), via: 'fallback' };
  }
}

/** Ứng viên đưa vào rerank (từ hybrid search). */
interface RerankInput {
  chunk: KnowledgeChunk;
  rrf: number;
  denseScore: number;
  sparseScore: number;
  denseRank?: number;
  sparseRank?: number;
}

/** Ứng viên sau rerank, kèm điểm liên quan của LLM (nếu có). */
interface RerankOutput extends RerankInput {
  relevance?: number;
  reason?: string;
}
