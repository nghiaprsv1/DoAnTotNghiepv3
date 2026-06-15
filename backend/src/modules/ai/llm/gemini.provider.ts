import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ChatTurn } from '../ai.service';
import type { LlmProvider } from './llm-provider.interface';

/**
 * Adapter Gemini — GIỮ LẠI như một lựa chọn, không còn là mặc định.
 * Chỉ kích hoạt khi LLM_PROVIDER=gemini và có GEMINI_API_KEY.
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const historyTurns = (input.history ?? []).slice(-10).map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    }));

    const body = {
      systemInstruction: { role: 'system', parts: [{ text: input.system }] },
      contents: [...historyTurns, { role: 'user', parts: [{ text: input.prompt }] }],
      generationConfig: {
        ...(input.json ? { responseMimeType: 'application/json' } : {}),
        temperature: input.temperature ?? 0.6,
        maxOutputTokens: input.maxTokens ?? 4096,
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
