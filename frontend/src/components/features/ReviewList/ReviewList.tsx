import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import {
  reviewService,
  type Review,
  type ReviewTargetType,
} from '@services/reviewService'
import { useAuthStore } from '@store/authStore'
import { ActionRow, ReviewBody, toggleLikeIn } from './parts'

interface Props {
  targetType: ReviewTargetType
  targetId: string
  /** Heading shown above the list. Pass null to render without a heading. */
  title?: string | null
  /** Empty-state copy. */
  emptyLabel?: string
  /** When false, list renders read-only — replies and likes are disabled. */
  showInteractions?: boolean
}

/**
 * Reusable list of reviews for a target (trip / guide / place / member).
 * Each review supports like + reply (replies are flat: 1 level deep).
 *
 * Caching key: ['reviews', targetType, targetId] — same key the
 * `ReviewModal` invalidates after submit, so newly written reviews appear
 * here without a manual refresh.
 */
export function ReviewList({
  targetType,
  targetId,
  title = 'Đánh giá',
  emptyLabel = 'Chưa có đánh giá nào.',
  showInteractions = true,
}: Props) {
  const queryClient = useQueryClient()
  const isAuthed = useAuthStore((s) => s.isAuthenticated)
  const queryKey = ['reviews', targetType, targetId]
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => reviewService.list(targetType, targetId),
    enabled: Boolean(targetId),
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey })

  const onToggleLike = (id: string) => {
    queryClient.setQueryData<Review[]>(queryKey, (prev) =>
      toggleLikeIn(prev ?? [], id),
    )
    void reviewService.toggleLike(id).catch(refresh)
  }

  if (isLoading) return null
  const reviews = data ?? []

  if (reviews.length === 0) {
    return (
      <section>
        {title && (
          <h2 className="text-xl font-bold text-on-surface tracking-tight font-headline mb-4">
            {title}
          </h2>
        )}
        <div className="bg-surface-container-lowest p-8 rounded-3xl text-center text-on-surface-variant text-sm">
          {emptyLabel}
        </div>
      </section>
    )
  }

  const ratings = reviews.map((r) => r.rating).filter((n) => n > 0)
  const avg =
    ratings.length === 0
      ? 0
      : ratings.reduce((s, n) => s + n, 0) / ratings.length

  return (
    <section className="space-y-4">
      {title && (
        <header className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-on-surface tracking-tight font-headline">
            {title}
          </h2>
          <div className="flex items-center gap-1.5 text-sm font-bold text-on-surface">
            <Icon name="star" filled className="text-primary" size={20} />
            {avg.toFixed(1)}
            <span className="text-on-surface-variant font-medium">
              ({ratings.length})
            </span>
          </div>
        </header>
      )}
      <div className="space-y-4">
        {reviews.map((r) => (
          <ReviewItem
            key={r.id}
            review={r}
            canInteract={isAuthed && showInteractions}
            onToggleLike={onToggleLike}
            onReplied={refresh}
          />
        ))}
      </div>
    </section>
  )
}

interface ItemProps {
  review: Review
  canInteract: boolean
  onToggleLike: (id: string) => void
  onReplied: () => void
}

function ReviewItem({ review: r, canInteract, onToggleLike, onReplied }: ItemProps) {
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitReply = async () => {
    if (!replyText.trim() || submitting) return
    setSubmitting(true)
    try {
      await reviewService.create({
        targetType: r.targetType,
        targetId: r.targetId,
        rating: 0,
        comment: replyText.trim(),
        parentId: r.id,
      })
      setReplyText('')
      setReplyOpen(false)
      onReplied()
    } catch {
      // Keep composer open on failure so the user can retry.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <article className="bg-surface-container-lowest rounded-3xl p-5 shadow-editorial">
      <ReviewBody r={r} />
      <ActionRow
        r={r}
        canInteract={canInteract}
        onToggleLike={onToggleLike}
        onReply={() => setReplyOpen((v) => !v)}
      />

      {(r.replies?.length ?? 0) > 0 && (
        <ul className="mt-4 ml-6 space-y-3 border-l-2 border-surface-container pl-4">
          {r.replies!.map((rep) => (
            <li key={rep.id}>
              <ReviewBody r={rep} compact />
              <ActionRow
                r={rep}
                canInteract={canInteract}
                onToggleLike={onToggleLike}
                hideReply
              />
            </li>
          ))}
        </ul>
      )}

      {replyOpen && canInteract && (
        <form
          className="mt-3 ml-6 flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void submitReply()
          }}
        >
          <textarea
            rows={2}
            autoFocus
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={`Phản hồi ${r.author.name}…`}
            className="flex-1 bg-surface-container rounded-2xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <button
            type="submit"
            disabled={!replyText.trim() || submitting}
            className="px-4 h-10 rounded-full editorial-gradient text-on-primary text-sm font-bold disabled:opacity-40 active:scale-95 transition"
          >
            Gửi
          </button>
        </form>
      )}
    </article>
  )
}
