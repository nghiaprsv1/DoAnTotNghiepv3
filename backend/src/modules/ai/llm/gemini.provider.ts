import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatTurn } from '../ai.service';
import type { LlmProvider } from './llm-provider.interface';

/**
 * Adapter Gemini — PROVIDER MẶC ĐỊNH cho AI assistant v1.
 * Kích hoạt khi LLM_PROVIDER=gemini (mặc định) và có GEMINI_API_KEY.
 * (Qwen self-host vẫn giữ ở local-llm.provider.ts để chạy luân phiên so sánh.)
 */
@Injectable()
export class GeminiProvider implements LlmProvider {
  readonly name = 'gemini';
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly config: ConfigService) {}

  isReady(): boolean {
    return !!this.config.get<string>('GEMINI_API_KEY');
  }

  private async call(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    json?: boolean;
  }): Promise<string> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Thiếu GEMINI_API_KEY');
    const model = this.config.get<string>('GEMINI_MODEL') || 'gemini-2.0-flash';
    // Base URL có thể đổi sang proxy bên thứ 3 rẻ hơn qua env GEMINI_BASE_URL
    // (vd https://v98store.com/v1beta). Mặc định endpoint chính thức của Google.
    const base = (
      this.config.get<string>('GEMINI_BASE_URL') ||
      'https://generativelanguage.googleapis.com/v1beta'
    ).replace(/\/+$/, '');
    const url = `${base}/models/${model}:generateContent?key=${apiKey}`;

    const historyTurns = (input.history ?? []).slice(-10).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    // Gemini 2.5 là "thinking model": token suy luận (thoughtsTokenCount) TÍNH
    // VÀO maxOutputTokens. Để mặc định, phần JSON lộ trình hay bị cắt cụt
    // (finishReason=MAX_TOKENS) → parse fail → trả null. Tắt thinking (budget 0)
    // để dồn token cho output thật. Chỉ áp dụng cho 2.5 (2.0 không có tham số này).
    const isThinkingModel = /2\.5/.test(model);
    const thinkingBudget = Number(this.config.get<string>('GEMINI_THINKING_BUDGET') ?? 0);

    const body = {
      systemInstruction: { role: 'system', parts: [{ text: input.system }] },
      contents: [...historyTurns, { role: 'user', parts: [{ text: input.prompt }] }],
      generationConfig: {
        ...(input.json ? { responseMimeType: 'application/json' } : {}),
        temperature: input.temperature ?? 0.6,
        maxOutputTokens: input.maxTokens ?? 4096,
        ...(isThinkingModel ? { thinkingConfig: { thinkingBudget } } : {}),
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`Gemini HTTP ${res.status} ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  async complete(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<string> {
    return this.call(input);
  }

  async generateJson<T = unknown>(input: {
    system: string;
    history?: ChatTurn[];
    prompt: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<T | null> {
    const raw = await this.call({ ...input, json: true });
    try {
      return JSON.parse(raw.replace(/```json/gi, '').replace(/```/g, '').trim()) as T;
    } catch {
      this.logger.warn('Gemini JSON parse lỗi');
      return null;
    }
  }
}
