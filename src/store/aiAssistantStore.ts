import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Trip } from '@types/trip'
import type { AiIntent, AiTripSuggestion } from '@services/aiAssistantService'

export type AIRole = 'user' | 'assistant'

export interface AIMessage {
  id: string
  role: AIRole
  content: string
  /** Optional trip suggestions from the catalogue. */
  trips?: Trip[]
  /** Conversation intent the BE/Gemini decided this turn ended up in. */
  intent?: AiIntent
  /** When the bot drafted a brand-new itinerary, attach it here. */
  suggestion?: AiTripSuggestion
  /** Once the user clicks "Tạo chuyến luôn" successfully, store the new trip. */
  createdTripId?: string
  createdTripTitle?: string
  createdAt: number
  /** Pending state for assistant typing */
  pending?: boolean
}

interface AIAssistantStore {
  /** Show the floating bubble at all. User can disable from menu. */
  enabled: boolean
  /** Panel open/closed */
  isOpen: boolean
  messages: AIMessage[]

  setEnabled: (enabled: boolean) => void
  open: () => void
  close: () => void
  toggle: () => void
  addMessage: (msg: AIMessage) => void
  updateMessage: (id: string, patch: Partial<AIMessage>) => void
  clearMessages: () => void
}

const WELCOME: AIMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Xin chào 👋 Mình là trợ lý du lịch AI. Hỏi mình về bất kỳ địa điểm nào — nếu hệ thống có chuyến phù hợp mình sẽ liệt kê, không có thì mình sẽ gợi ý lộ trình mới và tạo trực tiếp cho bạn nếu muốn.',
  createdAt: Date.now(),
}

export const useAIAssistantStore = create<AIAssistantStore>()(
  persist(
    (set) => ({
      enabled: true,
      isOpen: false,
      messages: [WELCOME],

      setEnabled: (enabled) => set({ enabled, isOpen: enabled ? false : false }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),

      addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
      updateMessage: (id, patch) =>
        set((s) => ({
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      clearMessages: () => set({ messages: [WELCOME] }),
    }),
    {
      name: 'travelsocial-ai-assistant',
      partialize: (s) => ({ enabled: s.enabled, messages: s.messages }),
    }
  )
)
