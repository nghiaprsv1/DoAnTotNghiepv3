import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs';
import type { ChatTurn } from '../ai.service';
import type { LlmProvider } from './llm-provider.interface';

/**
 * LLM chạy local qua node-llama-cpp (không API, không bên thứ 3).
 *
 * node-llama-cpp v3 là ESM-only nên phải nạp bằng dynamic import(). Dưới
 * CommonJS, TypeScript sẽ transpile import() thành require() → hỏng. Dùng
 * `Function('return import(...)')` để giữ nguyên import() động thật sự.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function('m', 'return import(m)') as (
  m: string,
) => Promise<any>;

@Injectable()
export class LocalLlmProvider implements LlmProvider {
  readonly name = 'local';
  private readonly logger = new Logger(LocalLlmProvider.name);

  private model: any = null;
  private context: any = null;
  private LlamaChatSession: any = null;
  private ready = false;
  private loading: Promise<void> | null = null;
  /** Hàng đợi để serialize request — model nhỏ + 4GB VRAM không chạy song song. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly config: ConfigService) {
    // Nạp model nền ngay khi khởi động (không chặn bootstrap).
    void this.ensureLoaded().catch((e) =>
      this.logger.error(`Không nạp được model local: ${(e as Error).message}`),
    );
  }

  isReady(): boolean {
    return this.ready;
  }

  /** Nạp model 1 lần (idempotent). */
  private ensureLoaded(): Promise<void> {
    if (this.ready) return Promise.resolve();
    if (this.loading) return this.loading;
    this.loading = this.loadModel();
    return this.loading;
  }

  private async loadModel(): Promise<void> {
    const file =
      this.config.get<string>('LLM_MODEL_FILE') || 'qwen2.5-3b-instruct-q4_k_m.gguf';
    const modelPath = path.join(process.cwd(), 'models', file);
    if (!fs.existsSync(modelPath)) {
      throw new Error(
        `Model chưa có tại ${modelPath}. Chạy: npm run model:download`,
      );
    }

    const { getLlama, LlamaChatSession } = await dynamicImport('node-llama-cpp');
    this.LlamaChatSession = LlamaChatSession;

    const gpuLayersEnv = this.config.get<string>('LLM_GPU_LAYERS') || 'max';
    const llama = await getLlama();
    this.logger.log(`Đang nạp model local: ${file} (gpuLayers=${gpuLayersEnv})`);
    this.model = await llama.loadModel({
      modelPath,
      gpuLayers: gpuLayersEnv === 'max' ? undefined : Number(gpuLayersEnv) || 0,
    });
    // Context nhỏ để tiết kiệm RAM/VRAM (máy 8GB + 2050 4GB). Cho phép vài
    // sequence để không kẹt khi request nối tiếp nhau.
    this.context = await this.model.createContext({ contextSize: 4096, sequences: 4 });
    this.ready = true;
    this.logger.log('Model local đã sẵn sàng.');
  }

  // PLACEHOLDER_METHODS

  /** Tạo session chat mới + nạp lịch sử dưới dạng prompt nối. */
  private async runChat(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    grammarJson?: boolean;
  }): Promise<string> {
    await this.ensureLoaded();
    if (!this.context) throw new Error('LLM context chưa sẵn sàng');

    // Serialize: nối vào hàng đợi để không có 2 lần prompt chạy đè nhau.
    const run = this.queue.then(() => this.runChatInner(input));
    // Giữ hàng đợi tiếp tục dù lần này lỗi.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async runChatInner(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    grammarJson?: boolean;
  }): Promise<string> {
    // Cấp 1 sequence riêng cho lượt này, giải phóng ngay sau khi xong để
    // tránh "No sequences left" ở request kế tiếp.
    const sequence = this.context.getSequence();
    try {
      const session = new this.LlamaChatSession({
        contextSequence: sequence,
        systemPrompt: input.system,
      });

      // Nhồi lịch sử thẳng vào prompt thay vì setChatHistory — định dạng
      // chat-history của node-llama-cpp khác nhau giữa các version và dễ gây
      // lỗi runtime. Ghép text là cách bền nhất cho model nhỏ.
      let prompt = input.prompt;
      if (input.history?.length) {
        const convo = input.history
          .slice(-6)
          .map((h) => `${h.role === 'assistant' ? 'Trợ lý' : 'Người dùng'}: ${h.content}`)
          .join('\n');
        prompt = `Ngữ cảnh hội thoại trước đó:\n${convo}\n\nYêu cầu mới của người dùng: ${input.prompt}`;
      }

      const maxTokens =
        input.maxTokens ?? (Number(this.config.get('LLM_MAX_TOKENS')) || 2048);

      const answer = await session.prompt(prompt, {
        maxTokens,
        temperature: input.temperature ?? 0.6,
      });
      return typeof answer === 'string' ? answer : String(answer ?? '');
    } finally {
      // Giải phóng sequence để lượt sau còn chỗ.
      try {
        sequence.dispose();
      } catch {
        /* ignore */
      }
    }
  }

  async complete(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    return this.runChat(input);
  }

  async generateJson<T = unknown>(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<T | null> {
    const raw = await this.runChat({ ...input, temperature: input.temperature ?? 0.3 });
    return extractJson<T>(raw);
  }
}

/** Bóc JSON đầu tiên trong chuỗi (chống model bọc ```json hoặc thêm chữ thừa). */
function extractJson<T>(raw: string): T | null {
  if (!raw) return null;
  // Bỏ code fence nếu có.
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  // Thử parse trực tiếp.
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Tìm khối { ... } cân bằng đầu tiên.
    const start = cleaned.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === '{') depth++;
      else if (cleaned[i] === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(cleaned.slice(start, i + 1)) as T;
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}
