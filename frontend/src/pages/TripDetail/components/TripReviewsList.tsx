import { ReviewList } from '@components/features/ReviewList'

interface Props {
  tripId: string
}

/** Thin wrapper kept for backwards-compat in the TripDetail page. */
export function TripReviewsList({ tripId }: Props) {
  return (
    <div className="mb-12">
      <ReviewList
        targetType="trip"
        targetId={tripId}
        title="Đánh giá chuyến đi"
        emptyLabel="Chưa có đánh giá nào. Hãy là người đầu tiên chia sẻ trải nghiệm sau chuyến đi."
      />
    </div>
  )
}
