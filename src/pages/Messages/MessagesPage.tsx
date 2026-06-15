import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useConversations, useMessageHistory } from '@hooks/useMessages'
import { useCurrentUserStore } from '@store/currentUserStore'
import { useAuthStore } from '@store/authStore'
import { ROUTES, messageThreadPath, userProfilePath } from '@constants/routes'
import { disconnectChatSocket, getChatSocket } from '@services/chatSocket'
import { ConversationList } from './components/ConversationList'
import { ChatHeader } from './components/ChatHeader'
import { MessageBubble } from './components/MessageBubble'
import { MessageComposer } from './components/MessageComposer'
import { EmptyThread } from './components/EmptyThread'
import { GroupMembersPanel } from './components/GroupMembersPanel'
import type { ChatMessage, Conversation } from '@types/message'

/** Map a backend ChatMessage payload (snake/camel) into FE shape. */
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

export function MessagesPage() {
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const accessToken = useAuthStore((s) => s.tokens?.accessToken)
  const currentUserId = useCurrentUserStore((s) => s.id) ?? ''
  const [query, setQuery] = useState('')
  const [typingPeers, setTypingPeers] = useState<Record<string, number>>({})
  const [showMembers, setShowMembers] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [historySearch, setHistorySearch] = useState('')
  const queryClient = useQueryClient()

  const { data: conversations = [], isLoading: convLoading } = useConversations()
  const { data: messages = [] } = useMessageHistory(routeId)

  // Track the currently-joined room so we can leave when switching threads.
  const joinedRoomRef = useRef<string | null>(null)

  // Establish (or refresh) the realtime socket whenever the user logs in.
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return
    const sock = getChatSocket(accessToken)

    const onNewMessage = (raw: Parameters<typeof toFeMessage>[0]) => {
      const msg = toFeMessage(raw)
      // Append to the active thread cache.
      queryClient.setQueryData<ChatMessage[] | undefined>(
        ['conversations', msg.conversationId, 'messages'],
        (prev) => (prev ? [...prev, msg] : [msg]),
      )
      // Refresh the sidebar so last-message preview updates.
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
    const onTyping = (p: { userId: string; roomId: string }) => {
      setTypingPeers((m) => ({ ...m, [p.roomId]: Date.now() }))
    }
    const onStopTyping = (p: { roomId: string }) => {
      setTypingPeers((m) => {
        const copy = { ...m }
        delete copy[p.roomId]
        return copy
      })
    }
    // Spec Phần 2.2: khi có người tham gia room, làm mới danh sách hội thoại để
    // thành viên mới hiện ngay trong panel thành viên nhóm.
    const onMemberJoined = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }
    // Đối phương đã đọc tới mốc lastReadAt — làm mới sidebar (badge chưa đọc).
    const onReadReceipt = () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] })
    }

    sock.on('new_message', onNewMessage)
    sock.on('typing', onTyping)
    sock.on('stop_typing', onStopTyping)
    sock.on('member_joined', onMemberJoined)
    sock.on('read_receipt', onReadReceipt)

    return () => {
      sock.off('new_message', onNewMessage)
      sock.off('typing', onTyping)
      sock.off('stop_typing', onStopTyping)
      sock.off('member_joined', onMemberJoined)
      sock.off('read_receipt', onReadReceipt)
    }
  }, [isAuthenticated, accessToken, queryClient])

  // Disconnect socket on logout.
  useEffect(() => {
    if (!isAuthenticated) disconnectChatSocket()
  }, [isAuthenticated])

  // Auto-clear stale typing indicators after 3s.
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingPeers((m) => {
        const now = Date.now()
        const next: Record<string, number> = {}
        for (const [k, v] of Object.entries(m)) {
          if (now - v < 3000) next[k] = v
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  // When the route thread changes, join the new room and emit mark_as_read.
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !routeId) return
    const sock = getChatSocket(accessToken)
    sock.emit('join_room', { roomId: routeId })
    joinedRoomRef.current = routeId
    // Mark read after a tick to ensure history settled.
    const t = setTimeout(() => sock.emit('mark_as_read', { roomId: routeId }), 200)
    return () => clearTimeout(t)
  }, [routeId, isAuthenticated, accessToken])

  // Reset transient panel + search state when switching threads.
  useEffect(() => {
    setShowMembers(false)
    setSearchOpen(false)
    setHistorySearch('')
  }, [routeId])

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => {
      const name = c.kind === 'group' ? (c.groupName ?? '') : c.peer.name
      return name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
    })
  }, [query, conversations])

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === routeId),
    [routeId, conversations]
  )

  // Filter the visible thread messages by the in-thread history search.
  const visibleMessages = useMemo(() => {
    const q = historySearch.trim().toLowerCase()
    if (!q) return messages
    return messages.filter((m) => m.content.toLowerCase().includes(q))
  }, [messages, historySearch])

  const handleSend = (text: string) => {
    if (!routeId || !text.trim() || !accessToken) return
    const sock = getChatSocket(accessToken)
    // Server persists + broadcasts back to us via `new_message`. We don't
    // optimistically push here to keep a single source of truth.
    sock.emit('send_message', { roomId: routeId, content: text.trim() })
    sock.emit('stop_typing', { roomId: routeId })
  }

  const handleTyping = () => {
    if (!routeId || !accessToken) return
    getChatSocket(accessToken).emit('typing', { roomId: routeId })
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon="login"
          title="Đăng nhập để nhắn tin"
          description="Bạn cần đăng nhập để xem cuộc trò chuyện với hướng dẫn viên và bạn đồng hành."
          action={{ label: 'Đăng nhập', to: ROUTES.LOGIN }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div
        className={
          showMembers
            ? 'grid md:grid-cols-[320px_1fr_320px] gap-6 h-[calc(100vh-10rem)] min-h-[560px]'
            : 'grid md:grid-cols-[360px_1fr] gap-6 h-[calc(100vh-10rem)] min-h-[560px]'
        }
      >
        {/* Sidebar */}
        <aside
          className={`${
            routeId ? 'hidden md:flex' : 'flex'
          } flex-col bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden`}
        >
          <header className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between mb-4">
              <h1 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">
                Tin nhắn
              </h1>
              <button
                type="button"
                aria-label="Soạn tin mới"
                className="w-10 h-10 rounded-full editorial-gradient text-on-primary flex items-center justify-center shadow-editorial active:scale-95 transition"
              >
                <Icon name="edit" />
              </button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-surface-container-low">
              <Icon name="search" className="text-on-surface-variant text-sm" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm cuộc trò chuyện"
                className="bg-transparent border-none outline-none text-sm flex-1 placeholder:text-on-surface-variant/60"
              />
            </div>
          </header>
          {convLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingState label="Đang tải..." />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 p-6">
              <EmptyState
                icon="forum"
                title="Chưa có cuộc trò chuyện"
                description="Đặt tour với HDV hoặc tham gia chuyến đi để bắt đầu nhắn tin."
              />
            </div>
          ) : (
            <ConversationList
              conversations={filteredConversations}
              activeId={routeId}
              onSelect={(id) => navigate(messageThreadPath(id))}
            />
          )}
        </aside>

        {/* Thread */}
        <section
          className={`${
            routeId ? 'flex' : 'hidden md:flex'
          } flex-col bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden`}
        >
          {activeConversation ? (
            <>
              <ChatHeader
                conversation={activeConversation}
                onBack={() => navigate('/messages')}
                onToggleSearch={() => setSearchOpen((s) => !s)}
                searchActive={searchOpen}
                onOpenMembers={
                  activeConversation.kind === 'group'
                    ? () => setShowMembers((s) => !s)
                    : undefined
                }
              />
              {searchOpen && (
                <div className="px-4 py-2 border-b border-outline-variant/15 bg-surface-container-low/40">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low">
                    <Icon name="search" className="text-on-surface-variant text-sm" />
                    <input
                      autoFocus
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Tìm trong cuộc trò chuyện…"
                      className="bg-transparent border-none outline-none text-sm flex-1 placeholder:text-on-surface-variant/60"
                    />
                    {historySearch && (
                      <button
                        type="button"
                        onClick={() => setHistorySearch('')}
                        aria-label="Xoá tìm kiếm"
                        className="text-on-surface-variant hover:text-primary"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    )}
                  </div>
                  {historySearch && (
                    <p className="text-[10px] text-on-surface-variant mt-1 ml-1 uppercase tracking-widest">
                      {visibleMessages.length} kết quả
                    </p>
                  )}
                </div>
              )}
              <ThreadBody
                messages={visibleMessages}
                conversation={activeConversation}
                currentUserId={currentUserId}
                isPeerTyping={!searchOpen && !!typingPeers[activeConversation.id]}
                highlight={historySearch.trim()}
              />
              <MessageComposer onSend={handleSend} onTyping={handleTyping} />
            </>
          ) : (
            <EmptyThread />
          )}
        </section>

        {/* Members panel — group conversations only. */}
        {showMembers && activeConversation && activeConversation.kind === 'group' && (
          <GroupMembersPanel
            conversation={activeConversation}
            currentUserId={currentUserId}
            onClose={() => setShowMembers(false)}
          />
        )}
      </div>
    </div>
  )
}

function ThreadBody({
  messages,
  conversation,
  currentUserId,
  isPeerTyping,
  highlight,
}: {
  messages: ChatMessage[]
  conversation: Conversation
  currentUserId: string
  isPeerTyping?: boolean
  /** Substring to highlight inside each bubble (when search is active). */
  highlight?: string
}) {
  const isGroup = conversation.kind === 'group'
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, isPeerTyping])

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-8 space-y-4 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/40"
    >
      {messages.length === 0 && (
        <p className="text-center text-sm text-on-surface-variant/60 mt-10">
          Hãy bắt đầu cuộc trò chuyện 👋
        </p>
      )}
      {messages.map((m, i) => {
        const fromMe = m.senderId === currentUserId
        const sender =
          conversation.participants?.find((p) => p.id === m.senderId) ?? conversation.peer
        const prev = messages[i - 1]
        const showSenderHeader = isGroup && !fromMe && (!prev || prev.senderId !== m.senderId)

        return (
          <div key={m.id} className={`flex items-end gap-2 ${fromMe ? 'justify-end' : ''}`}>
            {!fromMe && (
              <Link
                to={userProfilePath(m.senderId)}
                aria-label={`Xem hồ sơ ${sender?.name ?? 'thành viên'}`}
                title={sender?.name ?? 'Xem hồ sơ'}
                className={`mb-1 hidden sm:block transition hover:ring-2 hover:ring-primary/40 rounded-full ${
                  showSenderHeader || !isGroup ? '' : 'invisible'
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
              <MessageBubble message={m} fromMe={fromMe} highlight={highlight} />
            </div>
          </div>
        )
      })}
      {isPeerTyping && (
        <div className="flex items-center gap-2 text-on-surface-variant text-xs">
          <Avatar src={conversation.peer.avatar} alt="" size="xs" />
          <span className="px-3 py-2 rounded-full bg-surface-container-low inline-flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant animate-bounce" />
          </span>
        </div>
      )}
    </div>
  )
}
