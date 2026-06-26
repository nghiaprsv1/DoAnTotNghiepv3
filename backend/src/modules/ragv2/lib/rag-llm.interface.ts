/**
 * Trừu tượng hoá 2 năng lực LLM mà RAG v2 cần: EMBEDDING (vector hoá) và CHAT
 * (sinh văn bản / JSON). Nhờ tách interface, pipeline (RagV2Service) KHÔNG còn
 * khoá cứng vào Gemini — có thể đổi sang OpenAI (hoặc provider khác) chỉ bằng env
 * `RAGV2_LLM_PROVIDER`, không sửa logic truy hồi/rerank/sinh.
 *
 * 2 abstract class này đồng thời đóng vai trò DI TOKEN: module dùng factory cung
 * cấp implementation tương ứng (GeminiEmbeddings/OpenAiEmbeddings…), service inject
 * theo token trừu tượng.
 */

/** Loại tác vụ embedding — Gemini dùng để tối ưu; OpenAI bỏ qua (không có khái niệm này). */
export type EmbedTaskType = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY';

/** Năng lực embedding: biến text → vector số thực dùng cho cosine similarity. */
export abstract class RagEmbeddings {
  /** Tên provider (gemini | openai…) — phục vụ trace/status. */
  abstract readonly providerName: string;
  /** Tên model embedding đang dùng (đọc từ env). */
  abstract get model(): string;
  /** Đã cấu hình khoá API chưa. */
  abstract isReady(): boolean;
  /** Embed 1 đoạn text → vector. */
  abstract embed(text: string, taskType?: EmbedTaskType): Promise<number[]>;
  /** Embed nhiều đoạn → danh sách vector theo đúng thứ tự đầu vào. */
  abstract embedBatch(texts: string[], taskType?: EmbedTaskType): Promise<number[][]>;
}

/** Tham số 1 lần gọi sinh văn bản. */
export interface RagChatInput {
  system: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  /** true → ép model trả JSON (dùng cho rewrite/router/rerank/dựng lộ trình). */
  json?: boolean;
}

/** Năng lực sinh văn bản / JSON (generation) cho bước cuối pipeline RAG. */
export abstract class RagChat {
  /** Tên provider (gemini | openai…) — phục vụ trace/status. */
  abstract readonly providerName: string;
  /** Tên model chat đang dùng (đọc từ env). */
  abstract get model(): string;
  /** Đã cấu hình khoá API chưa. */
  abstract isReady(): boolean;
  /** Sinh văn bản từ system + prompt. */
  abstract complete(input: RagChatInput): Promise<string>;
  /** Gọi ở chế độ JSON rồi parse an toàn; trả null khi không parse được. */
  abstract completeJson<T = unknown>(input: RagChatInput): Promise<T | null>;
  /**
   * TOOL-CALLING (function calling) — nền cho kiến trúc AGENT. Gửi lịch sử hội
   * thoại + danh sách tool; model TỰ QUYẾT trả lời thẳng hay gọi tool nào (kèm
   * tham số). Bên gọi chạy tool, nhồi kết quả lại (role 'tool') rồi gọi tiếp →
   * vòng ReAct. Khác complete(): ở đây MODEL điều phối, không phải code.
   */
  abstract chatWithTools(
    messages: AgentMessage[],
    tools: ToolDef[],
    opts?: { temperature?: number; maxTokens?: number },
  ): Promise<ChatToolsResult>;
}

/* ───────────────────────── Tool-calling types ───────────────────────── */

/** Định nghĩa 1 tool (function) đưa cho model — JSON Schema chuẩn OpenAI/Gemini. */
export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema cho tham số (type:'object', properties, required). */
  parameters: Record<string, unknown>;
}

/** 1 lời gọi tool do model sinh ra. */
export interface ToolCall {
  /** ID do provider cấp (OpenAI cần để map kết quả; Gemini tự sinh nếu thiếu). */
  id: string;
  name: string;
  /** Tham số model truyền (đã parse từ JSON; {} nếu lỗi parse). */
  arguments: Record<string, unknown>;
}

/**
 * 1 lượt trong hội thoại agent. role:
 *  - 'user'      — câu hỏi người dùng (content).
 *  - 'assistant' — model trả lời: content (text cuối) HOẶC toolCalls (yêu cầu gọi tool).
 *  - 'tool'      — kết quả 1 tool: content = observation, toolCallId khớp ToolCall.id.
 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'tool';
  content?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
  /** Tên tool (chỉ role 'tool') — Gemini cần để map functionResponse. */
  name?: string;
}

/** Kết quả 1 lần gọi chatWithTools: hoặc model đòi gọi tool, hoặc trả lời cuối. */
export interface ChatToolsResult {
  /** Tool model muốn gọi (rỗng nếu model trả lời thẳng). */
  toolCalls: ToolCall[];
  /** Văn bản model sinh (câu trả lời cuối khi không còn gọi tool). */
  content: string;
  /** Lý do dừng provider trả về (stop | tool_calls | length…) — phục vụ trace. */
  finishReason?: string;
}

/** Bóc JSON đầu tiên trong chuỗi (chống model bọc ```json hoặc thêm chữ thừa). */
export function extractJson<T>(raw: string): T | null {
  if (!raw) return null;
  const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Tìm khối { … } hoặc [ … ] cân bằng đầu tiên.
    const startObj = cleaned.indexOf('{');
    const startArr = cleaned.indexOf('[');
    const start =
      startArr === -1 ? startObj : startObj === -1 ? startArr : Math.min(startObj, startArr);
    if (start === -1) return null;
    const open = cleaned[start];
    const close = open === '{' ? '}' : ']';
    let depth = 0;
    for (let i = start; i < cleaned.length; i++) {
      if (cleaned[i] === open) depth++;
      else if (cleaned[i] === close) {
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
