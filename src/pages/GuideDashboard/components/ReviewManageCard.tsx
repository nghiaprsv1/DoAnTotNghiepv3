import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Rating } from '../../GuideDetail/components/Rating'
import { cn } from '@utils/cn'
import type { GuideReview } from '@constants/mockGuideDetail'

interface Props {
  review: GuideReview
  onReply: (content: string) => void
}

/**
 * Manage view of a review — shows reply (if any) or inline reply composer.
 */
export function ReviewManageCard({ review, onReply }: Props) {
  const [replying, setReplying] = useState(false)
  const [text, setText] = useState('')

  const submit = () => {
    if (text.trim().length < 5) return
    onReply(text.trim())
    setText('')
    setReplying(false)
  }

  return (
    <article className="bg-surface-container-lowest rounded-3xl p-5 md:p-6 shadow-editorial space-y-3">
      <header className="flex items-start gap-3">
        <Avatar src={review.authorAvatar} alt={review.authorName} size="md" ring />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-headline font-extrabold text-on-surface">{review.authorName}</p>
            <Rating rating={review.rating} size={14} />
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {review.date}
            {review.tourTitle && (
              <>
                {' · '}
                <span className="text-on-surface/85">{review.tourTitle}</span>
              </>
            )}
          </p>
        </div>
        {!review.reply && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700">
            <Icon name="hourglass_top" size={12} />
            Chưa phản hồi
          </span>
        )}
      </header>

      <p className="text-sm text-on-surface/85 leading-relaxed">{review.content}</p>

      {/* Existing reply */}
      {review.reply && (
        <div className="ml-12 p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1.5 inline-flex items-center gap-1">
            <Icon name="verified" size={14} className="fill" />
            Phản hồi của bạn · {review.reply.date}
          </p>
          <p className="text-sm text-on-surface/85 leading-relaxed">{review.reply.content}</p>
          <button
            type="button"
            className="mt-2 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
          >
            <Icon name="edit" size={12} />
            Chỉnh sửa phản hồi
          </button>
        </div>
      )}

      {/* Reply composer */}
      {!review.reply && (
        <div className="pt-2 border-t border-outline-variant/15">
          {!replying ? (
            <button
              type="button"
              onClick={() => setReplying(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-headline font-bold bg-primary text-on-primary shadow-editorial hover:scale-[1.02] active:scale-95 transition"
            >
              <Icon name="reply" size={16} />
              Viết phản hồi
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                rows={3}
                value={text}
                onChange={(e) => setText(e.target.value)}
                autoFocus
                maxLength={500}
                placeholder={`Cảm ơn ${review.authorName}, bạn có thể chia sẻ thêm...`}
                className="w-full bg-surface-container-low rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
              <div className="flex items-center justify-between">
                <p className={cn(
                  'text-[11px]',
                  text.length < 5 ? 'text-on-surface-variant' : 'text-on-surface-variant'
                )}>
                  {text.length}/500 ký tự
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReplying(false)
                      setText('')
                    }}
                    className="px-3 py-1.5 rounded-full text-sm font-bold text-on-surface-variant hover:bg-surface-container-low transition"
                  >
                    Huỷ
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={text.trim().length < 5}
                    className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-headline font-bold editorial-gradient text-on-primary shadow-editorial disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  >
                    <Icon name="send" size={14} />
                    Gửi
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
