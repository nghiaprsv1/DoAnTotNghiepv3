import { Rating } from './Rating'
import type { GuideReview } from '@constants/mockGuideDetail'

interface Props {
  reviews: GuideReview[]
  averageRating: number
}

export function RatingBreakdown({ reviews, averageRating }: Props) {
  const total = reviews.length
  const counts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => Math.round(r.rating) === star).length
  )

  return (
    <div className="bg-surface-container-low rounded-3xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-[180px_1fr] gap-6 items-center">
      {/* Score box */}
      <div className="text-center md:text-left">
        <p className="text-5xl font-extrabold font-headline text-on-surface leading-none">
          {averageRating.toFixed(2)}
        </p>
        <Rating rating={averageRating} size={20} className="mt-2" />
        <p className="text-xs text-on-surface-variant mt-2 font-bold uppercase tracking-widest">
          {total} đánh giá
        </p>
      </div>

      {/* Distribution bars */}
      <ul className="space-y-2 w-full">
        {[5, 4, 3, 2, 1].map((star, i) => {
          const count = counts[i]
          const pct = total === 0 ? 0 : Math.round((count / total) * 100)
          return (
            <li key={star} className="flex items-center gap-3 text-sm">
              <span className="w-6 text-on-surface-variant font-bold">{star}★</span>
              <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
                <div
                  className="h-full editorial-gradient transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-on-surface-variant text-xs">{count}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
