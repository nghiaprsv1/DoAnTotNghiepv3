import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeChunk } from './entities/knowledge-chunk.entity';
import { GeminiEmbeddings } from './lib/gemini-embeddings';
import { GeminiChat } from './lib/gemini-chat';
import { chunkText } from './lib/chunker';
import { cosineSimilarity } from './lib/cosine';

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
  key: 'embed_query' | 'vector_search' | 'build_context' | 'generate';
  title: string;
  ms: number;
  detail: Record<string, unknown>;
}

export interface RagAskResult {
  answer: string;
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
    private readonly embeddings: GeminiEmbeddings,
    private readonly chat: GeminiChat,
    private readonly config: ConfigService,
  ) {}

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
      throw new Error('Chưa cấu hình GEMINI_API_KEY — không thể tạo embedding.');
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
   * Pipeline RAG đầy đủ, trả về câu trả lời + TRACE từng bước để FE hiển thị
   * "phương pháp thực thi":
   *   1. embed_query   — Gemini embed câu hỏi → vector.
   *   2. vector_search — cosine với toàn bộ chunk → top-K kèm điểm số.
   *   3. build_context — ghép nội dung các chunk thành ngữ cảnh.
   *   4. generate      — Gemini sinh câu trả lời CHỈ từ ngữ cảnh đó.
   */
  async ask(question: string): Promise<RagAskResult> {
    const q = question.trim();
    if (!q) throw new Error('Câu hỏi rỗng.');
    if (!this.embeddings.isReady()) {
      throw new Error('Chưa cấu hình GEMINI_API_KEY — RAG v2 cần khoá Gemini.');
    }
    await this.ensureSchema();

    const t0 = Date.now();
    const steps: RagStep[] = [];

    // ── BƯỚC 1: Embed câu hỏi ──
    const e0 = Date.now();
    const queryVec = await this.embeddings.embed(q, 'RETRIEVAL_QUERY');
    steps.push({
      key: 'embed_query',
      title: 'Vector hoá câu hỏi (embedding)',
      ms: Date.now() - e0,
      detail: {
        model: this.embeddings.model,
        dimensions: queryVec.length,
        // Preview vài chiều đầu để minh hoạ (không đổ cả vector dài).
        preview: queryVec.slice(0, 8).map((n) => Number(n.toFixed(4))),
      },
    });

    // ── BƯỚC 2: Vector search (cosine, brute-force) ──
    const s0 = Date.now();
    const all = await this.chunks.find();
    const ranked: RetrievedChunk[] = all
      .map((c) => ({
        docName: c.docName,
        chunkIndex: c.chunkIndex,
        content: c.content,
        charCount: c.charCount,
        score: cosineSimilarity(queryVec, c.embedding ?? []),
      }))
      .sort((a, b) => b.score - a.score);
    const topK = this.topK();
    const top = ranked.slice(0, topK);
    steps.push({
      key: 'vector_search',
      title: 'Tìm kiếm vector (cosine similarity)',
      ms: Date.now() - s0,
      detail: {
        method: 'brute-force cosine similarity',
        candidates: all.length,
        topK,
        results: top.map((r) => ({
          docName: r.docName,
          chunkIndex: r.chunkIndex,
          score: Number(r.score.toFixed(4)),
          preview: r.content.slice(0, 160),
          content: r.content,
        })),
      },
    });

    // ── BƯỚC 3: Ghép ngữ cảnh ──
    const c0 = Date.now();
    const context = top
      .map(
        (r) =>
          `[Tài liệu: ${r.docName} — đoạn #${r.chunkIndex}]\n${r.content}`,
      )
      .join('\n\n');
    steps.push({
      key: 'build_context',
      title: 'Xây dựng ngữ cảnh (context)',
      ms: Date.now() - c0,
      detail: {
        chunksUsed: top.length,
        contextChars: context.length,
        sources: top.map((r) => `${r.docName} #${r.chunkIndex}`),
        // Phơi NGUYÊN VĂN ngữ cảnh — đây là TẤT CẢ những gì Gemini được nhận.
        // Gemini KHÔNG đọc tài liệu gốc, chỉ thấy đúng đoạn text này.
        contextText: context,
      },
    });

    // ── BƯỚC 4: Sinh câu trả lời ──
    const g0 = Date.now();
    let answer: string;
    let mode: 'generated' | 'no_context' | 'extractive_fallback' = 'generated';
    let generateNote: string | undefined;
    let sentSystem = '';
    let sentPrompt = '';
    const grounded = top.length > 0 && (top[0]?.score ?? 0) >= 0.3;

    if (!grounded) {
      // Không có ngữ cảnh đủ liên quan → trả lời an toàn, không bịa.
      mode = 'no_context';
      answer =
        'Mình chưa tìm thấy thông tin liên quan trong tài liệu đã nạp. ' +
        'Bạn thử hỏi về cách dùng website TripMate hoặc các lưu ý khi đi du lịch nhé.';
    } else {
      const system = `Bạn là trợ lý hỏi-đáp dựa trên tài liệu (RAG) của TripMate, trả lời bằng tiếng Việt.
QUY TẮC:
- CHỈ trả lời dựa trên "NGỮ CẢNH" được cung cấp bên dưới. TUYỆT ĐỐI không bịa thông tin ngoài ngữ cảnh.
- Nếu ngữ cảnh không đủ để trả lời, hãy nói rõ là chưa có thông tin.
- Trả lời ngắn gọn, rõ ràng, đi thẳng vào ý. Khi trích nguồn, GHI RÕ TÊN TÀI LIỆU trong ngoặc, ví dụ (CaoBang.txt) — không dùng nhãn "Nguồn k" trống.`;
      const prompt = `NGỮ CẢNH:\n${context}\n\nCÂU HỎI: ${q}\n\nTrả lời dựa trên ngữ cảnh trên:`;
      sentSystem = system;
      sentPrompt = prompt;
      try {
        answer = await this.chat.complete({ system, prompt, temperature: 0.3, maxTokens: 1024 });
        if (!answer) throw new Error('Gemini trả về rỗng');
      } catch (err) {
        // Chat lỗi (thường 429 hết quota) → KHÔNG để cả pipeline chết. Trả lời
        // trích xuất từ chunk liên quan nhất; phần RAG (embed + retrieve) vẫn đủ.
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
      title: 'Sinh câu trả lời (generation)',
      ms: Date.now() - g0,
      detail: {
        model: this.chat.model,
        mode,
        groundedOnContext: grounded,
        answerChars: answer.length,
        // Phơi NGUYÊN VĂN system + prompt đã gửi cho Gemini — bằng chứng model
        // chỉ nhận đúng ngữ cảnh truy hồi, KHÔNG tự đọc tài liệu gốc.
        sentSystem,
        sentPrompt,
        ...(generateNote ? { note: generateNote } : {}),
      },
    });

    return {
      answer,
      trace: {
        steps,
        sources: top.map((r) => ({ docName: r.docName, chunkIndex: r.chunkIndex })),
        totalMs: Date.now() - t0,
      },
    };
  }
}
