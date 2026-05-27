import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import type { PostComment } from '@types/post'

interface Props {
  comments: PostComment[]
  currentAvatar: string
  onSubmit: (text: string) => void
}

export function CommentSection({ comments, currentAvatar, onSubmit }: Props) {
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim()) return
    onSubmit(value)
    setValue('')
  }

  return (
    <div className="px-5 pb-5 pt-2 border-t border-outline-variant/15 space-y-4">
      {/* List */}
      <ul className="space-y-3">
        {comments.length === 0 && (
          <li className="text-center text-sm text-on-surface-variant/70 py-2">
            Hãy là người đầu tiên bình luận.
          </li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar src={c.authorAvatar} size="xs" />
            <div className="flex-1 min-w-0">
              <div className="bg-surface-container-low rounded-2xl px-4 py-2.5">
                <p className="text-sm font-headline font-bold text-on-surface leading-tight">
                  {c.authorName}
                </p>
                <p className="text-sm text-on-surface/85 mt-0.5">{c.content}</p>
              </div>
              <div className="flex items-center gap-3 mt-1 ml-2 text-[11px] text-on-surface-variant">
                <span>{c.createdAt}</span>
                <button type="button" className="font-bold hover:text-primary">
                  Thích
                </button>
                <button type="button" className="font-bold hover:text-primary">
                  Phản hồi
                </button>
                {c.likes !== undefined && c.likes > 0 && (
                  <span className="inline-flex items-center gap-1 ml-auto">
                    <Icon name="favorite" size={12} className="text-primary fill" />
                    <span>{c.likes}</span>
                  </span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
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
