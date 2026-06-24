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
}

export interface RagStep {
  key: 'embed_query' | 'vector_search' | 'build_context' | 'generate'
  title: string
  ms: number
  detail: Record<string, unknown>
}

export interface RagTrace {
  steps: RagStep[]
  sources: { docName: string; chunkIndex: number }[]
  totalMs: number
}

export interface RagAskResult {
  answer: string
  trace: RagTrace
}

export interface RagStatus {
  ready: boolean
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

  ask: async (question: string): Promise<RagAskResult> => {
    const res = await axiosInstance.post<ApiResponse<RagAskResult>>(
      '/rag-v2/ask',
      { question },
      { timeout: 120000 },
    )
    return unwrap(res)
  },
}
