import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useCurrentUserStore } from '@store/currentUserStore'
import { reviewService } from '@services/reviewService'
import { RatingBreakdown } from '../GuideDetail/components/RatingBreakdown'
import { ReviewManageCard } from './components/ReviewManageCard'
import type { GuideReview } from '@types/guideDashboard'

export function ReviewsManageTab() {
  const userId = useCurrentUserStore((s) => s.id)

  // Reviews targeting the current guide profile.
  // NOTE: BE expects a guideProfileId, but the user mapping provides a userId.
  // For now we point at the user — adjust when the BE exposes a /guides/me endpoint.
  const { data: rawReviews, isLoading } = useQuery({
    queryKey: ['reviews', 'guide-self', userId],
    queryFn: () => reviewService.list('guide', userId as string),
    enabled: Boolean(userId),
  })

  const reviews = useMemo<GuideReview[]>(
    () =>
      (rawReviews ?? []).map((r) => ({
        id: r.id,
        authorId: r.author.id,
        authorName: r.author.name,
        authorAvatar: r.author.avatar ?? '',
        rating: r.rating,
        date: new Date(r.createdAt).toLocaleDateString('vi-VN'),
        content: r.comment ?? '',
        helpfulCount: r.helpfulCount,
      })),
    [rawReviews]
  )

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length)

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-headline font-extrabold text-2xl text-on-surface">
          Đánh giá khách hàng
        </h2>
        <p className="text-sm text-on-surface-variant">
          Phản hồi đánh giá để xây dựng uy tín — guide phản hồi đầy đủ thường có rating cao hơn.
        </p>
      </header>

      {isLoading ? (
        <LoadingState count={2} />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="reviews"
          title="Chưa có đánh giá"
          description="Khi traveler đánh giá tour của bạn, các review sẽ xuất hiện ở đây."
        />
      ) : (
        <>
          <RatingBreakdown reviews={reviews} averageRating={avg} />
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewManageCard
                key={r.id}
                review={r}
                onReply={() => {
                  // TODO: wire BE endpoint for guide reply when available.
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
