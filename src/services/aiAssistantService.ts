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

export interface AskResult {
  answer: string
  intent: AiIntent
  trips: Trip[]
  suggestion?: AiTripSuggestion
}

export const aiAssistantService = {
  ask: async (
    query: string,
    history: ChatTurn[] = [],
    draft?: AiTripSuggestion | null,
  ): Promise<AskResult> => {
    // LLM local sinh lộ trình có thể mất ~20-40s → nới timeout riêng cho AI
    // (timeout global 15s quá ngắn, sẽ cắt request giữa chừng).
    const res = await axiosInstance.post<ApiResponse<AskResult>>(
      '/ai/ask',
      { query, history, draft: draft ?? undefined },
      { timeout: 120000 },
    )
    return unwrap(res)
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
