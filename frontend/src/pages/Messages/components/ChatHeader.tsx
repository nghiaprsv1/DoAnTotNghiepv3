import { useEffect, useRef, useState } from 'react'
import { Avatar } from '@components/ui/Avatar'
import { Icon } from '@components/ui/Icon'
import type { Conversation } from '@types/message'

interface Props {
  conversation: Conversation
  onBack?: () => void
  /** Toggle the search input above the message list. */
  onToggleSearch?: () => void
  searchActive?: boolean
  /** Open the members panel (group conversations only). */
  onOpenMembers?: () => void
  /** Delete the whole conversation (clears the thread with this person). */
  onDeleteConversation?: () => void
}

export function ChatHeader({
  conversation,
  onBack,
  onToggleSearch,
  searchActive,
  onOpenMembers,
  onDeleteConversation,
}: Props) {
  const isGroup = conversation.kind === 'group'
  const name = isGroup ? (conversation.groupName ?? 'Nhóm chat') : conversation.peer.name
  const avatar = isGroup
    ? (conversation.groupAvatar ?? conversation.peer.avatar)
    : conversation.peer.avatar

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Close the overflow menu on outside click.
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  return (
    <header className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/15 bg-surface-container-lowest">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="md:hidden p-2 -ml-2 rounded-full hover:bg-surface-container-low text-on-surface"
          aria-label="Quay lại"
        >
          <Icon name="arrow_back" />
        </button>
      )}

      <div className="relative">
        <Avatar src={avatar} alt={name} size="md" />
        {isGroup ? (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full editorial-gradient text-on-primary flex items-center justify-center border-2 border-surface-container-lowest">
            <Icon name="groups" size={11} />
          </span>
        ) : (
          conversation.peer.online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-surface-container-lowest" />
          )
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-headline font-extrabold text-on-surface truncate flex items-center gap-1">
          {name}
        </p>
        <p className="text-xs text-on-surface-variant/80">
          {isGroup ? (
            <>
              <Icon name="groups" size={12} className="inline mr-0.5 -mt-0.5" />
              {conversation.participants?.length ?? 0} thành viên
              {conversation.participants?.some((p) => p.online) && (
                <span className="text-green-600 font-semibold ml-1">
                  · {conversation.participants.filter((p) => p.online).length} đang hoạt động
                </span>
              )}
            </>
          ) : conversation.peer.online ? (
            <span className="text-green-600 font-semibold">● Đang hoạt động</span>
          ) : (
            <>Hoạt động {conversation.peer.lastSeen ?? 'gần đây'}</>
          )}
        </p>
      </div>

      <div className="flex items-center gap-1 text-on-surface-variant">
        <button
          type="button"
          aria-label="Tìm trong cuộc trò chuyện"
          aria-pressed={searchActive}
          onClick={onToggleSearch}
          className={
            'w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center transition active:scale-95 ' +
            (searchActive ? 'text-primary bg-primary/10' : '')
          }
        >
          <Icon name="search" />
        </button>
        {isGroup && (
          <button
            type="button"
            aria-label="Thành viên nhóm"
            onClick={onOpenMembers}
            className="w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center transition active:scale-95"
          >
            <Icon name="groups" />
          </button>
        )}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label={isGroup ? 'Thông tin nhóm' : 'Tuỳ chọn'}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className={
              'w-10 h-10 rounded-full hover:bg-surface-container-low flex items-center justify-center transition active:scale-95 ' +
              (menuOpen ? 'text-primary bg-primary/10' : '')
            }
          >
            <Icon name="more_vert" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1 w-56 bg-surface-container-lowest rounded-2xl shadow-editorial-lg border border-outline-variant/15 overflow-hidden z-50 py-1"
            >
              {onDeleteConversation && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onDeleteConversation()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-error hover:bg-error/10 transition"
                >
                  <Icon name="delete" size={18} />
                  {isGroup ? 'Xoá cuộc trò chuyện' : 'Xoá toàn bộ tin nhắn'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
