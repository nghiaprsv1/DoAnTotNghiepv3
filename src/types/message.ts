// Messaging domain types

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read'

export interface ChatUser {
  id: string
  name: string
  avatar: string
  /** Currently online */
  online?: boolean
  /** Last seen (relative string for now) */
  lastSeen?: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  /** Plain text body. Future: rich content */
  content: string
  createdAt: string // ISO or relative ('10:24', 'Yesterday')
  status?: MessageStatus
  /** Optional image attachment URL */
  attachment?: string
}

/** Type of a conversation. */
export type ConversationKind = 'direct' | 'group'

export interface Conversation {
  id: string
  kind: ConversationKind
  /** Direct chats use peer; group chats can also keep a representative peer for fallback. */
  peer: ChatUser
  /** Group only: title shown in header. */
  groupName?: string
  /** Group only: cover/avatar. */
  groupAvatar?: string
  /** All participants (group only — may be empty for direct). */
  participants?: ChatUser[]
  lastMessage: string
  /** Display-friendly timestamp ('2m', '10:24', 'Yesterday') */
  lastMessageAt: string
  unreadCount: number
  /** Last message was sent by current user */
  lastFromMe?: boolean
  /** Pinned to top */
  pinned?: boolean
  /** Peer is currently typing */
  typing?: boolean
}
