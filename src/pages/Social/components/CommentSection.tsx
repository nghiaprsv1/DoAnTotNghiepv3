import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { cn } from '@utils/cn'
import type { PostComment } from '@types/post'

interface Props {
  comments: PostComment[]
  currentAvatar: string
  /** Top-level submit ⇒ parentId omitted; reply ⇒ parent comment id. */
  onSubmit: (text: string, parentId?: string) => void
  /** Toggle a like on a comment. Parent should mutate the cache optimistically. */
  onToggleLike?: (commentId: string) => void
  /** True while comments are being fetched from the API. */
  loading?: boolean
}

interface Threaded extends PostComment {
  replies: PostComment[]
}

/** Group flat comments into root + replies (max 2 levels — replies of
 *  replies are already collapsed to the same root by the BE). */
function buildThreads(comments: PostComment[]): Threaded[] {
  const byId = new Map<string, Threaded>()
  const roots: Threaded[] = []
  for (const c of comments) {
    if (!c.parentId) {
      const t: Threaded = { ...c, replies: [] }
      byId.set(c.id, t)
      roots.push(t)
    }
  }
  for (const c of comments) {
    if (c.parentId && byId.has(c.parentId)) {
      byId.get(c.parentId)!.replies.push(c)
    }
  }
  return roots
}

export function CommentSection({
  comments,
  currentAvatar,
  onSubmit,
  onToggleLike,
  loading,
}: Props) {
  const [value, setValue] = useState('')
  const [replyingTo, setReplyingTo] = useState<{
    id: string
    name: string
  } | null>(null)
  const [replyValue, setReplyValue] = useState('')

  const threads = useMemo(() => buildThreads(comments), [comments])

  const submitRoot = () => {
    if (!value.trim()) return
    onSubmit(value)
    setValue('')
  }

  const submitReply = () => {
    if (!replyValue.trim() || !replyingTo) return
    onSubmit(replyValue, replyingTo.id)
    setReplyValue('')
    setReplyingTo(null)
  }

  return (
    <div className="px-5 pb-5 pt-2 border-t border-outline-variant/15 space-y-4">
      {/* List */}
      <ul className="space-y-3">
        {loading && (
          <li className="text-center text-sm text-on-surface-variant/70 py-3">
            Đang tải bình luận…
          </li>
        )}
        {!loading && threads.length === 0 && (
          <li className="text-center text-sm text-on-surface-variant/70 py-2">
            Hãy là người đầu tiên bình luận.
          </li>
        )}
        {threads.map((c) => (
          <li key={c.id} className="space-y-2">
            <CommentRow
              comment={c}
              onLike={onToggleLike}
              onReply={() => setReplyingTo({ id: c.id, name: c.authorName })}
            />

            {c.replies.length > 0 && (
              <ul className="ml-10 space-y-2 border-l-2 border-surface-container pl-3">
                {c.replies.map((r) => (
                  <li key={r.id}>
                    <CommentRow
                      comment={r}
                      compact
                      onLike={onToggleLike}
                      onReply={() => setReplyingTo({ id: c.id, name: r.authorName })}
                    />
                  </li>
                ))}
              </ul>
            )}

            {replyingTo?.id === c.id && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  submitReply()
                }}
                className="ml-10 flex items-center gap-2"
              >
                <Avatar src={currentAvatar} size="xs" />
                <div className="flex-1 flex items-center gap-1 bg-surface-container-low rounded-full pl-4 pr-1 py-1">
                  <input
                    type="text"
                    autoFocus
                    value={replyValue}
                    onChange={(e) => setReplyValue(e.target.value)}
                    placeholder={`Trả lời ${replyingTo.name}…`}
                    className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 placeholder:text-on-surface-variant/60"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyValue('')
                    }}
                    aria-label="Huỷ phản hồi"
                    className="w-8 h-8 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center"
                  >
                    <Icon name="close" size={18} />
                  </button>
                  <button
                    type="submit"
                    disabled={!replyValue.trim()}
                    aria-label="Gửi phản hồi"
                    className="w-9 h-9 rounded-full editorial-gradient text-on-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
                  >
                    <Icon name="send" size={18} />
                  </button>
                </div>
              </form>
            )}
          </li>
        ))}
      </ul>

      {/* Composer (root) */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submitRoot()
        }}
        className="flex items-center gap-2"
      >
        <Avatar src={currentAvatar} size="xs" />
        <div className="flex-1 flex items-center gap-1 bg-surface-container-low rounded-full pl-4 pr-1 py-1">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Viết bình luận…"
            className="flex-1 bg-transparent border-none outline-none text-sm py-1.5 placeholder:text-on-surface-variant/60"
          />
          <button
            type="button"
            aria-label="Emoji"
            className="w-8 h-8 rounded-full hover:bg-surface-container text-on-surface-variant flex items-center justify-center"
          >
            <Icon name="mood" size={18} />
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            aria-label="Gửi"
            className="w-9 h-9 rounded-full editorial-gradient text-on-primary flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition"
          >
            <Icon name="send" size={18} />
          </button>
        </div>
      </form>
    </div>
  )
}

interface RowProps {
  comment: PostComment
  compact?: boolean
  onLike?: (id: string) => void
  onReply?: () => void
}

function CommentRow({ comment: c, compact, onLike, onReply }: RowProps) {
  return (
    <div className="flex gap-3">
      <Avatar src={c.authorAvatar} size="xs" />
      <div className="flex-1 min-w-0">
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            compact ? 'bg-surface-container' : 'bg-surface-container-low',
          )}
        >
          <p className="text-sm font-headline font-bold text-on-surface leading-tight">
            {c.authorName}
          </p>
          <p className="text-sm text-on-surface/85 mt-0.5 whitespace-pre-line">
            {c.content}
          </p>
        </div>
        <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] text-on-surface-variant">
          <span>{c.createdAt}</span>
          <button
            type="button"
            onClick={() => onLike?.(c.id)}
            className={cn(
              'font-bold inline-flex items-center gap-1 transition',
              c.isLiked ? 'text-primary' : 'hover:text-primary',
            )}
          >
            <Icon name="favorite" size={12} filled={c.isLiked} />
            {c.isLiked ? 'Đã thích' : 'Thích'}
            {typeof c.likes === 'number' && c.likes > 0 && <span>· {c.likes}</span>}
          </button>
          <button
            type="button"
            onClick={onReply}
            className="font-bold hover:text-primary"
          >
            Phản hồi
          </button>
        </div>
      </div>
    </div>
  )
}
