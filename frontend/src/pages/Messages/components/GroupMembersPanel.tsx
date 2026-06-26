import { useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { useOpenDirectChat } from '@hooks/useMessages'
import { userProfilePath } from '@constants/routes'
import type { Conversation } from '@types/message'

interface Props {
  conversation: Conversation
  /** ID of the current user — used to mark "Bạn" and skip the "DM" button on self. */
  currentUserId: string
  onClose: () => void
}

/**
 * Side drawer listing every member of a group conversation. Clicking a row
 * opens the user's profile; the chat icon opens (or creates) a direct
 * conversation and navigates to it.
 */
export function GroupMembersPanel({ conversation, currentUserId, onClose }: Props) {
  const navigate = useNavigate()
  const openDirect = useOpenDirectChat()
  const members = conversation.participants ?? []

  const handleOpenDirect = async (peerId: string) => {
    try {
      onClose()
      await openDirect(peerId)
    } catch {
      // Already closed; nothing else to do.
    }
  }

  return (
    <aside className="w-full md:w-80 bg-surface-container-lowest border-l border-outline-variant/15 flex flex-col">
      <header className="px-5 py-4 border-b border-outline-variant/15 flex items-center justify-between">
        <div>
          <p className="font-headline font-extrabold text-on-surface">Thành viên</p>
          <p className="text-xs text-on-surface-variant">{members.length} người</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          className="w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
        >
          <Icon name="close" />
        </button>
      </header>

      <ul className="flex-1 overflow-y-auto divide-y divide-outline-variant/10">
        {[...members]
          // Admins (creator/leader) bubble to the top.
          .sort((a, b) => Number(!!b.isAdmin) - Number(!!a.isAdmin))
          .map((m) => {
          const isMe = m.id === currentUserId
          return (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low transition">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(userProfilePath(m.id))
                }}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <Avatar src={m.avatar} alt={m.name} size="sm" />
                <div className="min-w-0">
                  <p className="font-headline font-bold text-sm text-on-surface truncate flex items-center gap-1">
                    <span className="truncate">{m.name}</span>
                    {isMe && (
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wider flex-shrink-0">
                        · Bạn
                      </span>
                    )}
                    {m.isAdmin && (
                      <span
                        className="ml-1 px-1.5 py-0.5 rounded-full editorial-gradient text-on-primary text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
                        title="Chủ chuyến / Quản trị nhóm"
                      >
                        Chủ chuyến
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">
                    {m.handle ? `@${m.handle}` : 'Xem hồ sơ'}
                  </p>
                </div>
              </button>

              {!isMe && (
                <button
                  type="button"
                  onClick={() => handleOpenDirect(m.id)}
                  aria-label="Nhắn tin riêng"
                  title="Nhắn tin riêng"
                  className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container hover:text-primary text-on-surface-variant flex items-center justify-center transition"
                >
                  <Icon name="chat" size={18} />
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
