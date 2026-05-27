import { Avatar } from '@components/ui/Avatar'
import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'
import type { Conversation } from '@types/message'

interface Props {
  conversations: Conversation[]
  activeId?: string
  onSelect: (id: string) => void
}

const displayName = (c: Conversation) =>
  c.kind === 'group' ? (c.groupName ?? 'Nhóm chat') : c.peer.name
const displayAvatar = (c: Conversation) =>
  c.kind === 'group' ? (c.groupAvatar ?? c.peer.avatar) : c.peer.avatar

export function ConversationList({ conversations, activeId, onSelect }: Props) {
  if (conversations.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-on-surface-variant/60">
        Không tìm thấy cuộc trò chuyện nào.
      </p>
    )
  }

  return (
    <ul className="flex-1 overflow-y-auto px-2 pb-4">
      {conversations.map((c) => {
        const isActive = c.id === activeId
        const isGroup = c.kind === 'group'
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-colors',
                isActive
                  ? 'bg-primary/10'
                  : 'hover:bg-surface-container-low active:bg-surface-container'
              )}
            >
              <div className="relative flex-shrink-0">
                <Avatar src={displayAvatar(c)} alt={displayName(c)} size="md" />
                {isGroup ? (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full editorial-gradient text-on-primary flex items-center justify-center border-2 border-surface-container-lowest">
                    <Icon name="groups" size={11} />
                  </span>
                ) : (
                  c.peer.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-surface-container-lowest" />
                  )
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'truncate font-headline font-bold flex items-center gap-1',
                      isActive ? 'text-primary' : 'text-on-surface'
                    )}
                  >
                    {displayName(c)}
                    {c.pinned && (
                      <span className="text-on-surface-variant/60 text-[10px]">★</span>
                    )}
                    {isGroup && c.participants && (
                      <span className="text-[10px] text-on-surface-variant/70 font-normal">
                        · {c.participants.length}
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] flex-shrink-0',
                      c.unreadCount > 0
                        ? 'text-primary font-bold'
                        : 'text-on-surface-variant/60'
                    )}
                  >
                    {c.lastMessageAt}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 mt-0.5">
                  {c.typing ? (
                    <span className="text-sm text-primary font-semibold truncate">
                      đang soạn tin…
                    </span>
                  ) : (
                    <span
                      className={cn(
                        'text-sm truncate',
                        c.unreadCount > 0 && !c.lastFromMe
                          ? 'text-on-surface font-semibold'
                          : 'text-on-surface-variant/80'
                      )}
                    >
                      {c.lastMessage}
                    </span>
                  )}
                  {c.unreadCount > 0 && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
