import type { ChatTurn } from '../ai.service';

/**
 * Trừu tượng hoá nhà cung cấp LLM. Service không biết bên dưới là model local
 * (node-llama-cpp), Gemini, hay template — chỉ gọi qua interface này.
 *
 * Mục tiêu: không khoá cứng vào Gemini. Đổi provider qua env LLM_PROVIDER.
 */
export interface LlmProvider {
  /** Tên provider (để log / health-check). */
  readonly name: string;

  /** Provider đã sẵn sàng phục vụ chưa (model load xong, key hợp lệ...). */
  isReady(): boolean;

  /**
   * Sinh văn bản tự do từ system prompt + lịch sử + prompt mới.
   * Trả về chuỗi text thuần.
   */
  complete(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string>;

  /**
   * Sinh JSON theo schema mong đợi. Provider tự ép định dạng JSON (grammar /
   * responseMimeType / hậu xử lý). Trả về object đã parse, hoặc null nếu thất bại.
   */
  generateJson<T = unknown>(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<T | null>;
}

/** Token để inject provider qua DI. */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
