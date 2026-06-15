import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { messageService } from '@services/messageService'
import { useCurrentUserStore } from '@store/currentUserStore'
import { useAuthStore } from '@store/authStore'
import { messageThreadPath } from '@constants/routes'

export function useConversations() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUserId = useCurrentUserStore((s) => s.id) ?? undefined
  return useQuery({
    queryKey: ['conversations', currentUserId],
    queryFn: () => messageService.conversations(currentUserId),
    enabled: isAuthenticated,
  })
}

export function useMessageHistory(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversations', conversationId, 'messages'],
    queryFn: () => messageService.history(conversationId as string),
    enabled: Boolean(conversationId),
  })
}

export function useSendMessage(conversationId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ content, attachment }: { content: string; attachment?: string }) =>
      messageService.send(conversationId as string, content, attachment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations', conversationId, 'messages'] })
      qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })
}

/**
 * Open (or create) a direct conversation with `peerId` and navigate to the
 * thread. Refreshes the conversation list cache first so the new thread is
 * present when the route renders — otherwise the chat panel shows
 * `EmptyThread` because the new conversation isn't in the list yet.
 *
 * Centralised here because LikersModal, GroupMembersPanel, and the
 * UserProfile "Nhắn tin" button all need the exact same flow.
 */
export function useOpenDirectChat() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const currentUserId = useCurrentUserStore((s) => s.id) ?? undefined
  return async (peerId: string): Promise<void> => {
    if (!peerId || peerId === currentUserId) return
    const conv = await messageService.directConversation(peerId)
    // Make the new conversation available to the list right away.
    await qc.invalidateQueries({ queryKey: ['conversations'] })
    navigate(messageThreadPath(conv.id))
  }
}
