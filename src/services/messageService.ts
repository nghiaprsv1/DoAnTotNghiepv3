import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'
import type { ChatMessage, Conversation } from '@types/message'

interface BackendMember {
  userId: string
  user?: { id: string; name: string; avatar?: string; handle?: string }
  lastReadAt?: string
  isAdmin?: boolean
}

/**
 * Backend Conversation entity. Note the field names: `kind` (not `type`),
 * `lastMessage` is a flat preview string (denormalized in service.send), and
 * group conversations may carry a `tripId` linking to the source trip.
 */
interface BackendConversation {
  id: string
  kind: 'direct' | 'group'
  groupName?: string
  groupAvatar?: string
  tripId?: string | null
  members: BackendMember[]
  lastMessage?: string | null
  lastMessageAt?: string | null
  unreadCount?: number
}

interface BackendMessage {
  id: string
  conversationId: string
  senderId: string
  sender?: { id: string; name: string; avatar?: string }
  content: string
  attachment?: string
  createdAt: string
}

const adaptConversation = (b: BackendConversation, currentUserId?: string): Conversation => {
  // For DMs, the "peer" is the other member; for groups we keep the same
  // helper but the UI should rely on groupName/groupAvatar/participants.
  const peerMember =
    b.members.find((m) => m.userId !== currentUserId) ?? b.members[0]
  const peer = {
    id: peerMember?.userId ?? '',
    name: peerMember?.user?.name ?? 'Người dùng',
    avatar: peerMember?.user?.avatar ?? '',
  }
  return {
    id: b.id,
    kind: b.kind,
    peer,
    groupName: b.groupName,
    groupAvatar: b.groupAvatar,
    tripId: b.tripId ?? undefined,
    participants: b.members.map((m) => ({
      id: m.userId,
      name: m.user?.name ?? 'Thành viên',
      avatar: m.user?.avatar ?? '',
      handle: m.user?.handle,
      isAdmin: m.isAdmin,
    })),
    lastMessage: b.lastMessage ?? '',
    lastMessageAt: b.lastMessageAt
      ? new Date(b.lastMessageAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : '',
    unreadCount: b.unreadCount ?? 0,
    lastFromMe: false,
  }
}

const adaptMessage = (b: BackendMessage): ChatMessage => ({
  id: b.id,
  conversationId: b.conversationId,
  senderId: b.senderId,
  content: b.content,
  attachment: b.attachment,
  createdAt: new Date(b.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }),
  status: 'sent',
})

export const messageService = {
  conversations: async (currentUserId?: string): Promise<Conversation[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendConversation[]>>(
      '/messages/conversations',
    )
    return unwrap(res).map((c) => adaptConversation(c, currentUserId))
  },

  history: async (conversationId: string): Promise<ChatMessage[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendMessage[]>>(
      `/messages/${conversationId}/messages`,
    )
    return unwrap(res).map(adaptMessage)
  },

  send: async (
    conversationId: string,
    content: string,
    attachment?: string,
  ): Promise<ChatMessage> => {
    const res = await axiosInstance.post<ApiResponse<BackendMessage>>(
      `/messages/${conversationId}/messages`,
      { content, attachment },
    )
    return adaptMessage(unwrap(res))
  },

  direct: async (
    peerId: string,
    content: string,
    attachment?: string,
  ): Promise<ChatMessage> => {
    const res = await axiosInstance.post<ApiResponse<BackendMessage>>('/messages/direct', {
      peerId,
      content,
      attachment,
    })
    return adaptMessage(unwrap(res))
  },

  /**
   * Get-or-create the direct conversation with a peer + initial history.
   * Used by the "open chat" buttons in LikersModal / GroupMembersPanel.
   */
  directConversation: async (
    peerId: string,
  ): Promise<Conversation> => {
    const res = await axiosInstance.get<
      ApiResponse<{ conversation: BackendConversation; messages: BackendMessage[] }>
    >(`/messages/direct/${peerId}`)
    return adaptConversation(unwrap(res).conversation)
  },
}
