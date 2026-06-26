import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { LoadingState } from '@components/common/LoadingState'
import { usePostLikers } from '@hooks/usePosts'
import { useOpenDirectChat } from '@hooks/useMessages'
import { userProfilePath } from '@constants/routes'
import { cn } from '@utils/cn'

interface Props {
  postId: string
  open: boolean
  onClose: () => void
}

/**
 * Bottom-sheet style modal listing every user who liked a post. Anyone who can
 * see the post can see this list. Clicking a row navigates to the user's
 * profile; the chat icon opens (or creates) a direct conversation.
 */
export function LikersModal({ postId, open, onClose }: Props) {
  const navigate = useNavigate()
  const openDirect = useOpenDirectChat()
  const { data, isLoading } = usePostLikers(open ? postId : undefined)
  const likers = data?.data ?? []

  const handleOpenDirect = async (peerId: string) => {
    try {
      onClose()
      await openDirect(peerId)
    } catch {
      navigate('/messages')
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="likers-modal-title"
        className="relative w-full md:max-w-md bg-surface-container-lowest rounded-t-3xl md:rounded-3xl shadow-editorial-lg overflow-hidden flex flex-col max-h-[80vh]"
      >
        <header className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/15">
          <h2
            id="likers-modal-title"
            className="font-headline font-extrabold text-lg text-on-surface"
          >
            <Icon name="favorite" size={18} className="text-primary fill mr-2 align-middle" />
            {data?.total ?? 0} lượt thích
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-5">
              <LoadingState count={5} />
            </div>
          ) : likers.length === 0 ? (
            <div className="text-center text-sm text-on-surface-variant py-10">
              Chưa có ai thích bài viết này.
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/10">
              {likers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-surface-container-low transition"
                >
                  <Link
                    to={userProfilePath(u.id)}
                    onClick={onClose}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <Avatar src={u.avatar ?? ''} alt={u.name} size="sm" />
                    <div className="min-w-0">
                      <p className="font-headline font-bold text-sm text-on-surface truncate">
                        {u.name}
                        {u.isMe && (
                          <span className="ml-1 text-[10px] font-bold text-primary uppercase tracking-wider">
                            · Bạn
                          </span>
                        )}
                      </p>
                      {u.handle && (
                        <p className="text-xs text-on-surface-variant truncate">@{u.handle}</p>
                      )}
                    </div>
                  </Link>

                  {!u.isMe && (
                    <button
                      type="button"
                      onClick={() => handleOpenDirect(u.id)}
                      className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center transition',
                        'bg-surface-container-low text-on-surface-variant hover:text-primary hover:bg-surface-container',
                      )}
                      aria-label="Nhắn tin"
                      title="Nhắn tin"
                    >
                      <Icon name="chat" size={18} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
