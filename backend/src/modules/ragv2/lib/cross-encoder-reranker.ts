import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RagReranker, RerankScore } from './rag-reranker.interface';

/**
 * CROSS-ENCODER reranker chạy LOCAL bằng @xenova/transformers (ONNX runtime,
 * thuần JS — không cần Python). Đây là reranker "đúng nghĩa" trong IR: mô hình
 * phân loại cặp (câu hỏi, đoạn) bằng cross-attention → 1 logit liên quan.
 *
 * Model mặc định: `Xenova/bge-reranker-base` — bản ONNX của BAAI/bge-reranker-base,
 * ĐA NGÔN NGỮ (hỗ trợ tiếng Việt tốt), kích thước vừa phải. Đổi qua env
 * `RAGV2_RERANK_MODEL`.
 *
 * Tải model: lần đầu gọi sẽ tự tải weight ONNX về cache (thư mục
 * `backend/models/transformers` mặc định, đổi qua `RAGV2_RERANK_CACHE_DIR`).
 * Việc tải nằm trong 1 promise singleton → chỉ tải 1 lần, các request sau dùng
 * lại. Lỗi tải / thiếu mạng → `rerank()` ném lỗi, RagV2Service tự fallback RRF.
 *
 * Điểm: lấy logit của model, qua sigmoid → [0,1], nhân 10 → thang 0–10 đồng nhất
 * với ngưỡng `RAGV2_RERANK_MIN_SCORE` cũ (mặc định 4) để không phải đổi cấu hình.
 */
@Injectable()
export class CrossEncoderReranker extends RagReranker {
  readonly providerName = 'cross-encoder';
  private readonly logger = new Logger(CrossEncoderReranker.name);

  /** Promise tải model dùng chung (singleton) — chỉ khởi tạo 1 lần. */
  private pipelinePromise: Promise<CrossEncoderModel> | null = null;
  /** Cờ đánh dấu đã từng tải lỗi để không spam log/retry vô hạn trong 1 vòng đời. */
  private loadFailed = false;

  constructor(private readonly config: ConfigService) {
    super();
  }

  get model(): string {
    return this.config.get<string>('RAGV2_RERANK_MODEL') || 'Xenova/bge-reranker-base';
  }

  /** Reranker local luôn "có thể sẵn sàng" (model tải lazy). Chỉ false nếu đã tải lỗi. */
  isReady(): boolean {
    return !this.loadFailed;
  }

  /**
   * Nạp model 1 lần (lazy). Cấu hình env cho @xenova/transformers: cache weight
   * vào thư mục dự án, cho phép tải từ Hugging Face Hub.
   */
  private async loadModel(): Promise<CrossEncoderModel> {
    if (this.pipelinePromise) return this.pipelinePromise;

    this.pipelinePromise = (async () => {
      // import động: thư viện ESM, dùng require động để chạy trong CommonJS Nest.
      const tf: TransformersModule = await dynamicImport('@xenova/transformers');
      const { AutoTokenizer, AutoModelForSequenceClassification, env } = tf;

      // Cache weight ONNX trong dự án (không phụ thuộc thư mục home người chạy).
      const cacheDir =
        this.config.get<string>('RAGV2_RERANK_CACHE_DIR') || 'models/transformers';
      env.cacheDir = cacheDir;
      env.allowLocalModels = true;
      // Cho phép tải remote (HF Hub) khi cache chưa có. Đặt RAGV2_RERANK_OFFLINE=true
      // nếu đã tải sẵn và muốn chặn mọi truy cập mạng.
      env.allowRemoteModels = this.config.get<string>('RAGV2_RERANK_OFFLINE') !== 'true';

      const modelId = this.model;
      this.logger.log(`Đang nạp cross-encoder "${modelId}" (cache: ${cacheDir})…`);
      const t0 = Date.now();
      const tokenizer = await AutoTokenizer.from_pretrained(modelId);
      const seqModel = await AutoModelForSequenceClassification.from_pretrained(modelId, {
        quantized: this.config.get<string>('RAGV2_RERANK_QUANTIZED') !== 'false',
      });
      this.logger.log(`Cross-encoder sẵn sàng sau ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      return { tokenizer, model: seqModel, tf };
    })().catch((err) => {
      this.loadFailed = true;
      this.pipelinePromise = null; // cho phép thử lại ở lần ingest/khởi động sau
      throw err;
    });

    return this.pipelinePromise;
  }

  /**
   * Chấm điểm liên quan cho từng đoạn so với câu hỏi. Chạy theo lô nhỏ để không
   * ngốn RAM khi có nhiều ứng viên. Trả điểm 0–10 theo đúng index đầu vào.
   */
  async rerank(query: string, texts: string[]): Promise<RerankScore[]> {
    if (texts.length === 0) return [];
    const { tokenizer, model, tf } = await this.loadModel();

    const batchSize = Number(this.config.get<string>('RAGV2_RERANK_BATCH')) || 8;
    const maxLen = Number(this.config.get<string>('RAGV2_RERANK_MAX_LEN')) || 512;
    const out: RerankScore[] = [];

    for (let start = 0; start < texts.length; start += batchSize) {
      const slice = texts.slice(start, start + batchSize);
      // Cross-encoder: token hoá CẶP (query, text) — query lặp cho cả lô.
      const inputs = tokenizer(Array(slice.length).fill(query), {
        text_pair: slice,
        padding: true,
        truncation: true,
        max_length: maxLen,
      });
      const output = await model(inputs);
      // logits shape [batch, numLabels]. bge-reranker: 1 label → điểm liên quan thô.
      const logits = output.logits;
      const data = logits.data as Float32Array | number[];
      const dims = logits.dims as number[];
      const numLabels = dims[dims.length - 1] ?? 1;

      for (let i = 0; i < slice.length; i++) {
        // Lấy logit liên quan: 1 label → ô đó; nhiều label → ô cuối (positive class).
        const raw = Number(data[i * numLabels + (numLabels - 1)]);
        const prob = sigmoid(raw); // → [0,1]
        out.push({ index: start + i, score: round2(prob * 10) }); // → thang 0–10
      }
      void tf; // giữ tham chiếu module (tránh tree-shake) — không tác dụng phụ.
    }

    return out;
  }
}

/** Sigmoid: logit thực → xác suất [0,1]. */
function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * import() động không bị TypeScript hạ cấp thành require() — cần thiết vì
 * @xenova/transformers là ESM-only, không require() trực tiếp được trong CJS.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<any>;

/* ───────────────── kiểu tối thiểu cho @xenova/transformers ───────────────── */

interface TransformersModule {
  AutoTokenizer: { from_pretrained(id: string): Promise<TokenizerFn> };
  AutoModelForSequenceClassification: {
    from_pretrained(id: string, opts?: { quantized?: boolean }): Promise<SeqModelFn>;
  };
  env: {
    cacheDir: string;
    allowLocalModels: boolean;
    allowRemoteModels: boolean;
  };
}

type TokenizerFn = (
  text: string[],
  opts: {
    text_pair: string[];
    padding: boolean;
    truncation: boolean;
    max_length: number;
  },
) => Record<string, unknown>;

type SeqModelFn = (
  inputs: Record<string, unknown>,
) => Promise<{ logits: { data: Float32Array | number[]; dims: number[] } }>;

interface CrossEncoderModel {
  tokenizer: TokenizerFn;
  model: SeqModelFn;
  tf: TransformersModule;
}
