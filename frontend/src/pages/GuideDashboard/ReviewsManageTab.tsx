import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useCurrentUserStore } from '@store/currentUserStore'
import { reviewService } from '@services/reviewService'
import { useMyGuideProfile } from '@hooks/useGuides'
import { RatingBreakdown } from '../GuideDetail/components/RatingBreakdown'
import { ReviewManageCard } from './components/ReviewManageCard'
import type { GuideReview } from '@types/guideDashboard'

export function ReviewsManageTab() {
  const myUserId = useCurrentUserStore((s) => s.id)
  const queryClient = useQueryClient()

  // Reviews target the guide PROFILE id (targetType='guide'), not the userId.
  // Resolve the signed-in guide's own profile first, then list its reviews.
  const { data: profile } = useMyGuideProfile()
  const guideProfileId = profile?.id

  const { data: rawReviews, isLoading } = useQuery({
    queryKey: ['reviews', 'guide-self', guideProfileId],
    queryFn: () => reviewService.list('guide', guideProfileId as string),
    enabled: Boolean(guideProfileId),
  })

  // Gửi phản hồi = tạo review con (parentId = id review gốc, không cần rating).
  const replyMutation = useMutation({
    mutationFn: ({ parentId, content }: { parentId: string; content: string }) =>
      reviewService.create({
        targetType: 'guide',
        targetId: guideProfileId as string,
        rating: 0,
        comment: content,
        parentId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'guide-self', guideProfileId] })
    },
  })

  const reviews = useMemo<GuideReview[]>(
    () =>
      (rawReviews ?? [])
        // Chỉ lấy review gốc (có rating); reply được gắn vào field `reply`.
        .filter((r) => !r.parentId)
        .map((r) => {
          // Phản hồi của HDV = reply do chính tài khoản HDV viết (nếu có).
          const own = r.replies?.find((rep) => rep.author.id === myUserId)
          return {
            id: r.id,
            authorId: r.author.id,
            authorName: r.author.name,
            authorAvatar: r.author.avatar ?? '',
            rating: r.rating,
            date: new Date(r.createdAt).toLocaleDateString('vi-VN'),
            content: r.comment ?? '',
            helpfulCount: r.helpfulCount,
            reply: own
              ? {
                  content: own.comment ?? '',
                  date: new Date(own.createdAt).toLocaleDateString('vi-VN'),
                }
              : undefined,
          }
        }),
    [rawReviews, myUserId]
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
                onReply={(content) => replyMutation.mutate({ parentId: r.id, content })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
