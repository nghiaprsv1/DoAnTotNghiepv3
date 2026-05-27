import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { defaultReviews } from '@constants/mockGuideDetail'
import { RatingBreakdown } from '../GuideDetail/components/RatingBreakdown'
import { ReviewManageCard } from './components/ReviewManageCard'
import type { GuideReview } from '@constants/mockGuideDetail'

export function ReviewsManageTab() {
  const [reviews, setReviews] = useState<GuideReview[]>(defaultReviews)
  const [filter, setFilter] = useState<'all' | 'unreplied' | 'replied'>('all')

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / Math.max(1, reviews.length)
  const needsReply = reviews.filter((r) => !r.reply).length

  const handleReply = (id: string, content: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, reply: { content, date: 'vừa xong' } }
          : r
      )
    )
  }

  const filtered = reviews.filter((r) => {
    if (filter === 'unreplied') return !r.reply
    if (filter === 'replied') return !!r.reply
    return true
  })

  const filterChips: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'Tất cả', count: reviews.length },
    { key: 'unreplied', label: 'Chưa phản hồi', count: needsReply },
    { key: 'replied', label: 'Đã phản hồi', count: reviews.length - needsReply },
  ]

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

      <RatingBreakdown reviews={reviews} averageRating={avg} />

      {needsReply > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
          <Icon name="reply" className="text-primary" />
          <p className="text-sm text-on-surface/85 flex-1">
            Bạn còn <strong className="text-primary">{needsReply}</strong> đánh giá chưa phản hồi.
          </p>
          <button
            type="button"
            onClick={() => setFilter('unreplied')}
            className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-headline font-bold bg-primary text-on-primary shadow-editorial active:scale-95"
          >
            Lọc xem ngay
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-headline font-bold transition border ${
                active
                  ? 'bg-primary text-on-primary border-primary shadow-editorial'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40'
              }`}
            >
              {f.label}
              <span
                className={`min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                  active ? 'bg-on-primary text-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {f.count}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-10 text-center">
          <Icon name="reviews" className="text-3xl text-on-surface-variant mb-2" />
          <p className="text-on-surface-variant">Không có đánh giá nào khớp.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <ReviewManageCard
              key={r.id}
              review={r}
              onReply={(content) => handleReply(r.id, content)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
