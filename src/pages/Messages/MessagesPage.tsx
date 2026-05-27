import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import {
  CURRENT_USER_ID,
  mockChatUsers,
  mockConversations,
  mockMessagesByConversation,
} from '@constants/mockMessages'
import { messageThreadPath } from '@constants/routes'
import { ConversationList } from './components/ConversationList'
import { ChatHeader } from './components/ChatHeader'
import { MessageBubble } from './components/MessageBubble'
import { MessageComposer } from './components/MessageComposer'
import { EmptyThread } from './components/EmptyThread'
import type { ChatMessage, Conversation } from '@types/message'

export function MessagesPage() {
  const navigate = useNavigate()
  const { id: routeId } = useParams<{ id: string }>()
  const [query, setQuery] = useState('')

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mockConversations
    return mockConversations.filter((c) => {
      const name = c.kind === 'group' ? (c.groupName ?? '') : c.peer.name
      return (
        name.toLowerCase().includes(q) || c.lastMessage.toLowerCase().includes(q)
      )
    })
  }, [query])

  const activeConversation = useMemo(
    () => mockConversations.find((c) => c.id === routeId),
    [routeId]
  )

  const [draft, setDraft] = useState<Record<string, ChatMessage[]>>({})

  const messages: ChatMessage[] = activeConversation
    ? [
        ...(mockMessagesByConversation[activeConversation.id] ?? []),
        ...(draft[activeConversation.id] ?? []),
      ]
    : []

  const handleSend = (text: string) => {
    if (!activeConversation || !text.trim()) return
    const msg: ChatMessage = {
      id: `local-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: CURRENT_USER_ID,
      content: text.trim(),
      createdAt: new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      status: 'sent',
    }
    setDraft((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] ?? []), msg],
    }))
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div className="grid md:grid-cols-[360px_1fr] gap-6 h-[calc(100vh-10rem)] min-h-[560px]">
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
          <ConversationList
            conversations={filteredConversations}
            activeId={routeId}
            onSelect={(id) => navigate(messageThreadPath(id))}
          />
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
              />
              <ThreadBody messages={messages} conversation={activeConversation} />
              <MessageComposer onSend={handleSend} />
            </>
          ) : (
            <EmptyThread />
          )}
        </section>
      </div>
    </div>
  )
}

function ThreadBody({
  messages,
  conversation,
}: {
  messages: ChatMessage[]
  conversation: Conversation
}) {
  const isGroup = conversation.kind === 'group'

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/40">
      {messages.length === 0 && (
        <p className="text-center text-sm text-on-surface-variant/60 mt-10">
          Hãy bắt đầu cuộc trò chuyện 👋
        </p>
      )}
      {messages.map((m, i) => {
        const fromMe = m.senderId === CURRENT_USER_ID
        const sender = mockChatUsers[m.senderId]
        const prev = messages[i - 1]
        const showSenderHeader =
          isGroup && !fromMe && (!prev || prev.senderId !== m.senderId)
        const avatarSrc = sender?.avatar ?? conversation.peer.avatar

        return (
          <div key={m.id} className={`flex items-end gap-2 ${fromMe ? 'justify-end' : ''}`}>
            {!fromMe && (
              <Avatar
                src={avatarSrc}
                alt=""
                size="xs"
                className={`mb-1 hidden sm:block ${
                  showSenderHeader || !isGroup ? '' : 'invisible'
                }`}
              />
            )}
            <div className={fromMe ? '' : 'flex flex-col'}>
              {showSenderHeader && (
                <span className="text-[11px] font-bold text-on-surface-variant ml-3 mb-0.5">
                  {sender?.name ?? 'Thành viên'}
                </span>
              )}
              <MessageBubble message={m} fromMe={fromMe} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
