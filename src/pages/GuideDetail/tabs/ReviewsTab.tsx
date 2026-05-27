import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { RatingBreakdown } from '../components/RatingBreakdown'
import { ReviewCard } from '../components/ReviewCard'
import type { GuideReview } from '@constants/mockGuideDetail'

interface Props {
  reviews: GuideReview[]
  averageRating: number
}

type FilterKey = 'all' | '5' | '4' | 'with-reply' | 'recent'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: '5', label: '5 sao' },
  { key: '4', label: '4 sao' },
  { key: 'with-reply', label: 'Có phản hồi' },
  { key: 'recent', label: 'Mới nhất' },
]

export function ReviewsTab({ reviews, averageRating }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = (() => {
    switch (filter) {
      case '5':
        return reviews.filter((r) => Math.round(r.rating) === 5)
      case '4':
        return reviews.filter((r) => Math.round(r.rating) === 4)
      case 'with-reply':
        return reviews.filter((r) => !!r.reply)
      case 'recent':
      case 'all':
      default:
        return reviews
    }
  })()

  return (
    <section className="space-y-6">
      <RatingBreakdown reviews={reviews} averageRating={averageRating} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = f.key === filter
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-full text-sm font-bold transition border ${
                  active
                    ? 'bg-primary text-on-primary border-primary shadow-editorial'
                    : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40'
                }`}
              >
                {f.label}
              </button>
            )
          })}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-primary font-bold hover:underline"
        >
          <Icon name="rate_review" size={18} />
          Viết đánh giá
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-10 text-center">
          <Icon name="reviews" className="text-3xl text-on-surface-variant mb-2" />
          <p className="text-on-surface-variant">Không có đánh giá nào khớp bộ lọc.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}
    </section>
  )
}
