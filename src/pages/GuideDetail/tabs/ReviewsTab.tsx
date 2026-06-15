import { Icon } from '@components/ui/Icon'
import { ReviewList } from '@components/features/ReviewList'
import { RatingBreakdown } from '../components/RatingBreakdown'
import type { GuideReview } from '@types/guideDashboard'

interface Props {
  /** Lightweight summary used by the rating breakdown chart. */
  reviewsSummary: GuideReview[]
  averageRating: number
  /** Backend guide id — used to drive the live ReviewList. */
  guideId: string
  /** Optional — when provided, shows a "Viết đánh giá" CTA that calls this handler. */
  onWriteReview?: () => void
}

export function ReviewsTab({ reviewsSummary, averageRating, guideId, onWriteReview }: Props) {
  return (
    <section className="space-y-6">
      <RatingBreakdown reviews={reviewsSummary} averageRating={averageRating} />

      {onWriteReview && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onWriteReview}
            className="inline-flex items-center gap-1.5 text-sm text-primary font-bold hover:underline"
          >
            <Icon name="rate_review" size={18} />
            Viết đánh giá
          </button>
        </div>
      )}

      <ReviewList
        targetType="guide"
        targetId={guideId}
        title={null}
        emptyLabel="Chưa có đánh giá. Hãy là người đầu tiên đánh giá HDV này."
      />
    </section>
  )
}
