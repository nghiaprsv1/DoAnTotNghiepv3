import { Injectable } from '@nestjs/common';
import type { ChatTurn } from '../ai.service';
import type { LlmProvider } from './llm-provider.interface';

/**
 * Provider dự phòng KHÔNG cần model nào — luôn sẵn sàng, chạy tức thì.
 * Không "hiểu" ngôn ngữ; chỉ dùng khi local/gemini đều hỏng để chatbot không
 * chết. AiService có pipeline template riêng nên provider này chỉ trả rỗng để
 * service tự fallback sang luồng template-DB.
 */
@Injectable()
export class TemplateProvider implements LlmProvider {
  readonly name = 'template';

  isReady(): boolean {
    return true;
  }

  async complete(): Promise<string> {
    return '';
  }

  async generateJson<T = unknown>(): Promise<T | null> {
    return null;
  }

  // Giữ chữ ký tham số để khớp interface (không dùng tới).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _unused(_input: { system: string; history?: ChatTurn[]; prompt: string }) {}
}
