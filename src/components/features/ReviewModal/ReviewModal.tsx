import { useState, useEffect } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { cn } from '@utils/cn'

export type ReviewTargetKind = 'guide' | 'place' | 'trip' | 'member'

export interface ReviewTarget {
  kind: ReviewTargetKind
  /** Display name of target (guide name / place name / trip title / member name) */
  name: string
  /** Optional avatar/cover */
  image?: string
  /** Optional context line, e.g. "Tour: ..." */
  context?: string
}

export interface ReviewSubmission {
  rating: number
  comment: string
  tags: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  target: ReviewTarget
  onSubmit?: (data: ReviewSubmission) => void
}

const TARGET_LABEL: Record<ReviewTargetKind, string> = {
  guide: 'hướng dẫn viên',
  place: 'địa điểm',
  trip: 'chuyến đi',
  member: 'người đi cùng',
}

const TAGS_BY_KIND: Record<ReviewTargetKind, string[]> = {
  guide: ['Am hiểu', 'Nhiệt tình', 'Đúng giờ', 'Vui tính', 'An toàn', 'Tiếng Anh tốt'],
  place: ['Cảnh đẹp', 'Sạch sẽ', 'Đáng tiền', 'Ít đông', 'Dễ tiếp cận', 'View độc đáo'],
  trip: ['Lịch trình hợp lý', 'Giá hợp lý', 'Tổ chức tốt', 'Đáng nhớ', 'Thoải mái'],
  member: ['Hoà đồng', 'Đúng giờ', 'Vui vẻ', 'Tôn trọng', 'Hợp tác'],
}

const RATING_LABELS = ['', 'Tệ', 'Tạm', 'Khá', 'Tốt', 'Tuyệt vời']

export function ReviewModal({ open, onClose, target, onSubmit }: Props) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  // Reset on open
  useEffect(() => {
    if (open) {
      setRating(0)
      setHover(0)
      setComment('')
      setTags([])
      setSubmitted(false)
    }
  }, [open])

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const display = hover || rating
  const valid = rating > 0 && comment.trim().length >= 10
  const availableTags = TAGS_BY_KIND[target.kind]

  const toggleTag = (t: string) =>
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid) return
    onSubmit?.({ rating, comment: comment.trim(), tags })
    setSubmitted(true)
    setTimeout(() => onClose(), 1500)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {submitted ? (
          <div className="p-10 text-center">
            <div className="w-20 h-20 rounded-3xl editorial-gradient text-on-primary flex items-center justify-center mx-auto mb-5 shadow-editorial-lg">
              <Icon name="task_alt" className="text-3xl" />
            </div>
            <h2 className="font-headline font-extrabold text-2xl text-on-surface mb-2">
              Cảm ơn đánh giá!
            </h2>
            <p className="text-on-surface-variant">
              Đánh giá của bạn sẽ giúp cộng đồng có lựa chọn tốt hơn.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <header className="flex items-start gap-3 p-6 border-b border-outline-variant/15">
              {target.image ? (
                <img
                  src={target.image}
                  alt={target.name}
                  className="w-14 h-14 rounded-2xl object-cover flex-shrink-0"
                />
              ) : (
                <span className="w-14 h-14 rounded-2xl editorial-gradient text-on-primary flex items-center justify-center flex-shrink-0">
                  <Icon name="rate_review" />
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Viết đánh giá {TARGET_LABEL[target.kind]}
                </p>
                <h2 className="font-headline font-extrabold text-xl text-on-surface leading-tight truncate">
                  {target.name}
                </h2>
                {target.context && (
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">
                    {target.context}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng"
                className="w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
              >
                <Icon name="close" />
              </button>
            </header>

            <div className="p-6 space-y-5">
              {/* Star picker */}
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3">
                  Bạn cho mấy sao?
                </p>
                <div className="flex justify-center gap-1.5 mb-2">
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = n <= display
                    return (
                      <button
                        key={n}
                        type="button"
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(n)}
                        aria-label={`${n} sao`}
                        className="transition-transform active:scale-95 hover:scale-110"
                      >
                        <Icon
                          name="star"
                          size={40}
                          filled={active}
                          className={cn(
                            'transition-colors',
                            active ? 'text-primary' : 'text-on-surface-variant/30'
                          )}
                        />
                      </button>
                    )
                  })}
                </div>
                <p
                  className={cn(
                    'text-sm font-headline font-bold transition-colors h-5',
                    display === 0 ? 'text-on-surface-variant/50' : 'text-primary'
                  )}
                >
                  {RATING_LABELS[display] || 'Chọn số sao'}
                </p>
              </div>

              {/* Tags */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Điểm nổi bật (tuỳ chọn)
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((t) => {
                    const active = tags.includes(t)
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleTag(t)}
                        className={cn(
                          'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition border',
                          active
                            ? 'bg-primary text-on-primary border-primary shadow-editorial'
                            : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40'
                        )}
                      >
                        {active && <Icon name="check" size={12} />}
                        {t}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Trải nghiệm của bạn
                </label>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`Hãy chia sẻ câu chuyện của bạn về ${TARGET_LABEL[target.kind]} này...`}
                  className="w-full bg-surface-container-highest border-none rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
                <p className="text-[11px] text-on-surface-variant mt-1 ml-1">
                  Tối thiểu 10 ký tự, tối đa 1000.
                </p>
              </div>
            </div>

            <footer className="flex items-center justify-end gap-2 p-4 border-t border-outline-variant/15">
              <Button type="button" variant="ghost" size="md" rounded="full" onClick={onClose}>
                Huỷ
              </Button>
              <Button type="submit" size="md" rounded="full" disabled={!valid}>
                <Icon name="send" />
                Gửi đánh giá
              </Button>
            </footer>
          </form>
        )}
      </div>
    </div>
  )
}
