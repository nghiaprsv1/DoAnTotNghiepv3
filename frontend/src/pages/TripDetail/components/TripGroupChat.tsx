import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { LoadingState } from '@components/common/LoadingState'
import { useTripConversation } from '@hooks/useMessages'
import { useAuthStore } from '@store/authStore'
import { useCurrentUserStore } from '@store/currentUserStore'
import { getChatSocket } from '@services/chatSocket'
import { userProfilePath } from '@constants/routes'
import { MessageBubble } from '@pages/Messages/components/MessageBubble'
import { MessageComposer } from '@pages/Messages/components/MessageComposer'
import type { ChatMessage } from '@types/message'

/** Map a raw socket ChatMessage payload into FE shape (same as MessagesPage). */
function toFeMessage(raw: {
  id: string
  conversationId: string
  senderId: string
  content: string
  attachment?: string
  createdAt: string
}): ChatMessage {
  return {
    id: raw.id,
    conversationId: raw.conversationId,
    senderId: raw.senderId,
    content: raw.content,
    attachment: raw.attachment,
    createdAt: new Date(raw.createdAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    status: 'sent',
  }
}

interface Props {
  tripId: string
  /** Only members/owner may load the chat — gate the query + render. */
  canAccess: boolean
}

/**
 * Group chat for a trip, embedded directly in the trip detail page. Reuses the
 * same realtime socket + bubble/composer as the Messages page, but scoped to a
 * single conversation (the one linked to this trip) with a fixed height.
 *
 * Access is enforced twice: the BE returns 403 for non-members, and the parent
 * only renders this when (joined || isOwner). Legacy trips without a group
 * conversation get a friendly empty state instead of an error.
 */
export function TripGroupChat({ tripId, canAccess }: Props) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.tokens?.accessToken)
  const currentUserId = useCurrentUserStore((s) => s.id) ?? ''
  const queryClient = useQueryClient()
  const { data, isLoading, isError, error } = useTripConversation(tripId, canAccess)

  const conversationId = data?.conversation.id
  const [liveMessages, setLiveMessages] = useState<ChatMessage[]>([])
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Seed local message state from the fetched history.
  useEffect(() => {
    if (data?.messages) setLiveMessages(data.messages)
  }, [data?.messages])

  // Realtime: join the trip's room, listen for new messages + typing.
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !conversationId) return
    const sock = getChatSocket(accessToken)
    sock.emit('join_room', { roomId: conversationId })
    const t = setTimeout(() => sock.emit('mark_as_read', { roomId: conversationId }), 200)

    const onNewMessage = (raw: Parameters<typeof toFeMessage>[0]) => {
      if (raw.conversationId !== conversationId) return
      const msg = toFeMessage(raw)
      setLiveMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      )
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
    const onTyping = (p: { roomId: string }) => {
      if (p.roomId === conversationId) setIsTyping(true)
    }
    const onStopTyping = (p: { roomId: string }) => {
      if (p.roomId === conversationId) setIsTyping(false)
    }
    const onMessageDeleted = (p: { messageId: string; conversationId: string }) => {
      if (p.conversationId !== conversationId) return
      setLiveMessages((prev) => prev.filter((m) => m.id !== p.messageId))
    }

    sock.on('new_message', onNewMessage)
    sock.on('typing', onTyping)
    sock.on('stop_typing', onStopTyping)
    sock.on('message_deleted', onMessageDeleted)
    return () => {
      clearTimeout(t)
      sock.off('new_message', onNewMessage)
      sock.off('typing', onTyping)
      sock.off('stop_typing', onStopTyping)
      sock.off('message_deleted', onMessageDeleted)
    }
  }, [isAuthenticated, accessToken, conversationId, queryClient])

  // Auto-clear stale typing indicator after 3s of silence.
  useEffect(() => {
    if (!isTyping) return
    const t = setTimeout(() => setIsTyping(false), 3000)
    return () => clearTimeout(t)
  }, [isTyping, liveMessages.length])

  // Auto-scroll to newest message.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [liveMessages.length, isTyping])

  const participantsById = useMemo(() => {
    const map = new Map<string, { name: string; avatar?: string }>()
    for (const p of data?.conversation.participants ?? []) {
      map.set(p.id, { name: p.name, avatar: p.avatar })
    }
    return map
  }, [data?.conversation.participants])

  const handleSend = (text: string) => {
    if (!conversationId || !text.trim() || !accessToken) return
    const sock = getChatSocket(accessToken)
    sock.emit('send_message', { roomId: conversationId, content: text.trim() })
    sock.emit('stop_typing', { roomId: conversationId })
  }

  const handleTyping = () => {
    if (!conversationId || !accessToken) return
    getChatSocket(accessToken).emit('typing', { roomId: conversationId })
  }

  const handleDeleteMessage = (messageId: string) => {
    if (!accessToken) return
    if (!window.confirm('Xoá tin nhắn này?')) return
    getChatSocket(accessToken).emit('delete_message', { messageId })
  }

  if (!canAccess) return null

  const memberCount = data?.conversation.participants?.length ?? 0

  return (
    <section className="bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden flex flex-col h-[480px]">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-3.5 editorial-gradient text-on-primary">
        <span className="w-9 h-9 rounded-full bg-on-primary/15 ring-1 ring-on-primary/20 flex items-center justify-center">
          <Icon name="forum" className="fill" size={20} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-headline font-extrabold leading-tight">Nhóm chat chuyến đi</p>
          <p className="text-[11px] text-on-primary/85">
            {memberCount > 0 ? `${memberCount} thành viên` : 'Trò chuyện cùng nhóm'}
          </p>
        </div>
      </header>

      {/* Body */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <LoadingState label="Đang tải nhóm chat..." />
        </div>
      ) : isError ? (
        <EmptyChatState
          icon={(error as { response?: { status?: number } })?.response?.status === 404 ? 'group_off' : 'lock'}
          text={
            (error as { response?: { status?: number } })?.response?.status === 404
              ? 'Chuyến đi này chưa có nhóm chat. Nhóm sẽ xuất hiện khi có thành viên tham gia.'
              : 'Bạn cần là thành viên của chuyến đi để xem nhóm chat.'
          }
        />
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-5 space-y-3 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/40"
          >
            {liveMessages.length === 0 && (
              <p className="text-center text-sm text-on-surface-variant/60 mt-8">
                Hãy bắt đầu cuộc trò chuyện với nhóm 👋
              </p>
            )}
            {liveMessages.map((m, i) => {
              const fromMe = m.senderId === currentUserId
              const sender = participantsById.get(m.senderId)
              const prev = liveMessages[i - 1]
              const showSenderHeader = !fromMe && (!prev || prev.senderId !== m.senderId)
              return (
                <div key={m.id} className={`flex items-end gap-2 ${fromMe ? 'justify-end' : ''}`}>
                  {!fromMe && (
                    <Link
                      to={userProfilePath(m.senderId)}
                      title={sender?.name ?? 'Xem hồ sơ'}
                      className={`mb-1 hidden sm:block rounded-full transition hover:ring-2 hover:ring-primary/40 ${
                        showSenderHeader ? '' : 'invisible'
                      }`}
                    >
                      <Avatar src={sender?.avatar ?? ''} alt={sender?.name ?? ''} size="xs" />
                    </Link>
                  )}
                  <div className={fromMe ? '' : 'flex flex-col'}>
                    {showSenderHeader && (
                      <Link
                        to={userProfilePath(m.senderId)}
                        className="text-[11px] font-bold text-on-surface-variant ml-3 mb-0.5 hover:text-primary hover:underline w-fit"
                      >
                        {sender?.name ?? 'Thành viên'}
                      </Link>
                    )}
                    <MessageBubble message={m} fromMe={fromMe} onDelete={handleDeleteMessage} />
                  </div>
                </div>
              )
            })}
            {isTyping && (
              <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                <span className="px-3 py-2 rounded-full bg-surface-container-low inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce" />
                </span>
              </div>
            )}
          </div>
          <MessageComposer onSend={handleSend} onTyping={handleTyping} />
        </>
      )}
    </section>
  )
}

function EmptyChatState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-8 gap-3">
      <span className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center">
        <Icon name={icon} size={26} className="text-on-surface-variant" />
      </span>
      <p className="text-sm text-on-surface-variant max-w-xs">{text}</p>
    </div>
  )
}

