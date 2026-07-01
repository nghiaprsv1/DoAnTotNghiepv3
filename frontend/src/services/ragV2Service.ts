import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'

/**
 * Service cho chatbot RAG v2 (thử nghiệm) — gọi endpoint /rag-v2/*.
 * ĐỘC LẬP với aiAssistantService; không đụng tính năng AI hiện tại.
 */

export interface RagRetrievedResult {
  docName: string
  chunkIndex: number
  score: number
  preview: string
  content: string
  /** Điểm thành phần (chỉ có ở bước hybrid_search / rerank). */
  denseScore?: number
  sparseScore?: number
  denseRank?: number | null
  sparseRank?: number | null
  reason?: string
}

export interface RagStep {
  key:
    | 'query_rewrite'
    | 'db_retrieval'
    | 'embed_query'
    | 'hybrid_search'
    | 'rerank'
    | 'build_context'
    | 'generate'
    // Agent (tool-calling) — vòng ReAct: khởi tạo, gọi công cụ, chốt câu trả lời.
    | 'agent_start'
    | 'agent_tool'
    | 'agent_final'
  title: string
  ms: number
  detail: Record<string, unknown>
}

/** Chi tiết pipeline search_documents (embedding + cosine + BM25 → RRF + rerank). */
export interface DocSearchDetail {
  embedModel: string
  dimensions: number
  totalChunks: number
  candidateK: number
  rerankVia: 'cross-encoder' | 'llm' | 'fallback' | 'disabled'
  rerankModel?: string
  candidates: {
    docName: string
    chunkIndex: number
    preview: string
    dense: number
    sparse: number
    rrf: number
    denseRank?: number | null
    sparseRank?: number | null
    relevance?: number
    kept: boolean
  }[]
}

/** Thẻ kết quả truy hồi từ DB (chuyến/địa điểm/HDV/bài viết) — bấm được. */
export interface RagCard {
  source: 'doc' | 'trip' | 'place' | 'guide' | 'post'
  id: string
  title: string
  subtitle: string
  image?: string
  detailPath: string
}

export interface RagTrace {
  steps: RagStep[]
  sources: { docName: string; chunkIndex: number }[]
  totalMs: number
}

/** Lộ trình v2 dựng (RAG-grounded). Cùng shape AiTripSuggestion để tạo Trip thật. */
export interface RagItinerary {
  title: string
  destination: string
  durationDays: number
  startDate?: string
  endDate?: string
  summary: string
  categoryKey?: string
  tags?: string[]
  estimatedBudget?: number
  maxMembers?: number
  itinerary?: {
    dayNumber: number
    title: string
    activities?: { time: string; title: string; description?: string }[]
  }[]
}

export interface RagAskResult {
  answer: string
  cards: RagCard[]
  suggestion?: RagItinerary
  trace: RagTrace
}

export interface RagStatus {
  ready: boolean
  /** Provider LLM đang dùng cho RAG v2 (gemini | openai). */
  provider?: string
  geminiConfigured: boolean
  embeddingModel: string
  chatModel: string
  totalChunks: number
  documents: { docName: string; chunks: number }[]
  availableFiles: string[]
}

export interface RagIngestResult {
  documents: { docName: string; chunks: number; chars: number }[]
  totalChunks: number
  embeddingModel: string
}

export const ragV2Service = {
  status: async (): Promise<RagStatus> => {
    const res = await axiosInstance.get<ApiResponse<RagStatus>>('/rag-v2/status')
    return unwrap(res)
  },

  ingest: async (files?: string[]): Promise<RagIngestResult> => {
    const res = await axiosInstance.post<ApiResponse<RagIngestResult>>(
      '/rag-v2/ingest',
      { files },
      { timeout: 120000 },
    )
    return unwrap(res)
  },

  ask: async (
    question: string,
    draft?: RagItinerary | null,
    history?: { role: 'user' | 'assistant'; content: string }[],
  ): Promise<RagAskResult> => {
    const res = await axiosInstance.post<ApiResponse<RagAskResult>>(
      '/rag-v2/ask',
      { question, draft: draft ?? undefined, history: history?.length ? history : undefined },
      { timeout: 120000 },
    )
    return unwrap(res)
  },

  /**
   * Materialize lộ trình v2 thành Trip thật. TÁI DÙNG endpoint /ai/create-trip
   * của v1 (cùng shape suggestion). Cần đăng nhập (creator = người tạo).
   */
  createTrip: async (suggestion: RagItinerary): Promise<{ id: string }> => {
    const res = await axiosInstance.post<ApiResponse<{ id: string }>>(
      '/ai/create-trip',
      suggestion,
      { timeout: 60000 },
    )
    return unwrap(res)
  },
}
