import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { cn } from '@utils/cn'
import type { Review } from '@services/reviewService'

/** Body of a review row — header + comment + tags. Used for both root and replies. */
export function ReviewBody({ r, compact }: { r: Review; compact?: boolean }) {
  return (
    <>
      <header className="flex items-center gap-3 mb-2">
        <Avatar
          src={r.author.avatar ?? ''}
          alt={r.author.name}
          size={compact ? 'sm' : 'md'}
        />
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'font-headline font-bold text-on-surface leading-tight',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            {r.author.name}
          </p>
          <p className="text-[11px] text-on-surface-variant">
            {new Date(r.createdAt).toLocaleDateString('vi-VN')}
          </p>
        </div>
        {r.rating > 0 && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Icon
                key={i}
                name="star"
                filled={i < Math.round(r.rating)}
                size={14}
                className={
                  i < Math.round(r.rating)
                    ? 'text-primary'
                    : 'text-on-surface-variant/30'
                }
              />
            ))}
          </div>
        )}
      </header>
      {r.comment && (
        <p className="text-on-surface/85 text-sm leading-relaxed whitespace-pre-line">
          {r.comment}
        </p>
      )}
      {r.tags && r.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {r.tags.map((t) => (
            <span
              key={t}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary"
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </>
  )
}

interface ActionProps {
  r: Review
  canInteract: boolean
  onToggleLike: (id: string) => void
  onReply?: () => void
  hideReply?: boolean
}

export function ActionRow({
  r,
  canInteract,
  onToggleLike,
  onReply,
  hideReply,
}: ActionProps) {
  return (
    <div className="flex items-center gap-4 mt-3 text-xs text-on-surface-variant">
      <button
        type="button"
        disabled={!canInteract}
        onClick={() => canInteract && onToggleLike(r.id)}
        className={cn(
          'inline-flex items-center gap-1 font-bold transition disabled:cursor-not-allowed disabled:opacity-60',
          r.isLiked ? 'text-primary' : 'hover:text-primary',
        )}
      >
        <Icon name="favorite" size={14} filled={r.isLiked} />
        {r.isLiked ? 'Đã thích' : 'Thích'}
        {r.likeCount > 0 && <span>· {r.likeCount}</span>}
      </button>
      {!hideReply && (
        <button
          type="button"
          disabled={!canInteract}
          onClick={onReply}
          className="font-bold hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
        >
          Phản hồi
        </button>
      )}
    </div>
  )
}

/** Optimistically toggle isLiked + likeCount on a review (root or reply). */
export function toggleLikeIn(reviews: Review[], id: string): Review[] {
  return reviews.map((r) => {
    if (r.id === id) {
      return {
        ...r,
        isLiked: !r.isLiked,
        likeCount: r.likeCount + (r.isLiked ? -1 : 1),
      }
    }
    if (r.replies?.length) {
      return { ...r, replies: toggleLikeIn(r.replies, id) }
    }
    return r
  })
}
