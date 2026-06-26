import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'
import type { Trip } from '@types/trip'

export type AiIntent = 'inform' | 'ask_suggest' | 'suggest' | 'create' | 'general'

export interface AiTripSuggestion {
  title: string
  destination: string
  durationDays: number
  startDate?: string
  endDate?: string
  summary: string
  categoryKey?: string
  tags?: string[]
  coverImage?: string
  estimatedBudget?: number
  maxMembers?: number
  /** Lưu trú / di chuyển / bữa ăn — gói kèm chuyến. */
  inclusions?: { accommodation?: string; transport?: string; meals?: string }
  itinerary?: {
    dayNumber: number
    title: string
    activities?: { time: string; title: string; description?: string }[]
  }[]
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Thẻ kết quả đa nguồn từ agent v2 (chuyến/địa điểm/HDV/bài viết) — bấm sang chi tiết. */
export interface AiResultCard {
  source: 'doc' | 'trip' | 'place' | 'guide' | 'post'
  id: string
  title: string
  subtitle: string
  image?: string
  detailPath: string
}

export interface AskResult {
  answer: string
  intent: AiIntent
  /** Thẻ kết quả đa nguồn (thay cho trips[] cũ — agent v2 trả nhiều loại). */
  cards: AiResultCard[]
  suggestion?: AiTripSuggestion
}

/** Cấu trúc thô từ /rag-v2/ask (có thêm trace — bị bỏ ở FE bong bóng). */
interface RagAskRaw {
  answer: string
  cards?: AiResultCard[]
  suggestion?: AiTripSuggestion
}

export const aiAssistantService = {
  /**
   * Trợ lý bong bóng giờ chạy BACKEND AGENT v2 (/rag-v2/ask): LLM tự điều phối
   * gọi tool. KHÔNG hiển thị "phương pháp thực thi" (trace) — trace bị bỏ ở đây,
   * chỉ trang /chatbot-v2 mới hiện. `history` được gửi lên để agent hiểu câu nối
   * tiếp (vd "thêm 1 ngày"), agent tự phân biệt câu mới đổi chủ đề.
   */
  ask: async (
    query: string,
    history: ChatTurn[] = [],
    draft?: AiTripSuggestion | null,
  ): Promise<AskResult> => {
    // Agent v2 nhiều vòng có thể mất ~15-90s → timeout rộng.
    const res = await axiosInstance.post<ApiResponse<RagAskRaw>>(
      '/rag-v2/ask',
      {
        question: query,
        draft: draft ?? undefined,
        history: history.length ? history : undefined,
      },
      { timeout: 120000 },
    )
    const data = unwrap(res)
    return {
      answer: data.answer,
      // intent giữ để tương thích UI cũ; agent không phân loại nên suy ra thô.
      intent: data.suggestion ? 'suggest' : data.cards?.length ? 'inform' : 'general',
      cards: data.cards ?? [],
      suggestion: data.suggestion,
    }
  },

  /** Materialize a draft into a real Trip. Auth required. */
  createTrip: async (draft: AiTripSuggestion): Promise<Trip> => {
    const res = await axiosInstance.post<ApiResponse<Trip>>('/ai/create-trip', draft, {
      timeout: 60000,
    })
    return unwrap(res)
  },
}

/** Backwards-compatible export for the AI bubble component. */
export const askAssistant = aiAssistantService.ask
