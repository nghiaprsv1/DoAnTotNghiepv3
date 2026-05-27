import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Rating } from './Rating'
import type { GuideReview } from '@constants/mockGuideDetail'

interface Props {
  review: GuideReview
}

export function ReviewCard({ review }: Props) {
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
      </header>

      <p className="text-sm text-on-surface/85 leading-relaxed">{review.content}</p>

      <footer className="flex items-center gap-4 pt-2 border-t border-outline-variant/15">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-bold"
        >
          <Icon name="thumb_up" size={16} />
          Hữu ích
          {review.helpfulCount !== undefined && review.helpfulCount > 0 && (
            <span className="text-on-surface-variant/70">({review.helpfulCount})</span>
          )}
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-primary font-bold"
        >
          <Icon name="reply" size={16} />
          Phản hồi
        </button>
      </footer>

      {review.reply && (
        <div className="mt-2 ml-12 p-4 rounded-2xl bg-primary/5 border border-primary/15">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1.5 inline-flex items-center gap-1">
            <Icon name="verified" size={14} className="fill" />
            Phản hồi từ HDV · {review.reply.date}
          </p>
          <p className="text-sm text-on-surface/85 leading-relaxed">{review.reply.content}</p>
        </div>
      )}
    </article>
  )
}
