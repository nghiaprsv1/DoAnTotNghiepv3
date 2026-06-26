import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { ReviewModal } from '@components/features/ReviewModal'
import type { ReviewTarget } from '@components/features/ReviewModal'
import type { PendingJoinRequest, TripMember } from '@types/trip'

interface Props {
  members: TripMember[]
  creator: TripMember
  memberCount: number
  maxMembers: number
  /** Trip already finished — enable cross-rating between members. */
  tripCompleted?: boolean
  /** Current user id (to hide self-rate button) */
  currentUserId?: string
  /** Trip title for review context */
  tripTitle?: string
  /** Owner-only: list of pending requests waiting for response. */
  pendingRequests?: PendingJoinRequest[]
  /** Whether the viewer is the trip owner (renders Accept/Reject buttons). */
  isOwner?: boolean
  /** Called when owner accepts a request (id is the request id). */
  onAcceptRequest?: (requestId: string) => Promise<void> | void
  /** Called when owner rejects a request (id is the request id). */
  onRejectRequest?: (requestId: string) => Promise<void> | void
}

export function MembersPanel({
  members,
  creator,
  memberCount,
  maxMembers,
  tripCompleted = false,
  currentUserId,
  tripTitle,
  pendingRequests,
  isOwner = false,
  onAcceptRequest,
  onRejectRequest,
}: Props) {
  const slotsLeft = Math.max(0, maxMembers - memberCount)
  const progress = Math.min(100, Math.round((memberCount / maxMembers) * 100))
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  const handleAccept = async (requestId: string) => {
    if (!onAcceptRequest || pendingActionId) return
    setPendingActionId(`accept:${requestId}`)
    try {
      await onAcceptRequest(requestId)
    } finally {
      setPendingActionId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!onRejectRequest || pendingActionId) return
    setPendingActionId(`reject:${requestId}`)
    try {
      await onRejectRequest(requestId)
    } finally {
      setPendingActionId(null)
    }
  }

  return (
    <section className="bg-surface-container-low p-6 rounded-3xl">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-xl font-bold flex items-center gap-2 font-headline text-on-surface">
          <Icon name="groups" className="text-primary" />
          Thành viên
        </h4>
        <span className="text-sm font-bold text-on-surface">
          {memberCount}
          <span className="text-on-surface-variant">/{maxMembers}</span>
        </span>
      </div>

      {/* Capacity bar */}
      <div className="mb-5">
        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
          <div
            className="h-full editorial-gradient transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-on-surface-variant">
          {slotsLeft > 0 ? (
            <>
              Còn <span className="font-bold text-primary">{slotsLeft} chỗ</span> trống.
            </>
          ) : (
            <span className="font-bold text-primary">Đã đủ thành viên</span>
          )}
        </p>
      </div>

      {/* Creator */}
      <div className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl mb-3">
        <Avatar src={creator.avatar} alt={creator.name} size="sm" ring />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-on-surface truncate">{creator.name}</p>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
            Người tạo chuyến
          </p>
        </div>
        <Icon name="workspace_premium" className="text-primary" />
      </div>

      {/* Members */}
      <ul className="space-y-2">
        {members.map((m) => {
          const canRate = tripCompleted && m.id !== currentUserId
          const reviewed = reviewedIds.has(m.id)
          const roleLabel =
            m.role === 'guide'
              ? 'Hướng dẫn viên'
              : m.role === 'leader'
                ? 'Trưởng đoàn'
                : 'Thành viên'
          const roleIcon = m.role === 'guide' ? 'tour' : m.role === 'leader' ? 'star' : null
          return (
            <li
              key={m.id}
              className="flex items-center gap-3 p-3 bg-surface-container-lowest/60 rounded-2xl"
            >
              <Avatar src={m.avatar} alt={m.name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-on-surface truncate">{m.name}</p>
                <p
                  className={
                    'text-[10px] uppercase tracking-widest flex items-center gap-1 ' +
                    (m.role === 'guide'
                      ? 'text-primary font-bold'
                      : m.role === 'leader'
                        ? 'text-amber-700 font-bold'
                        : 'text-on-surface-variant')
                  }
                >
                  {roleIcon && <Icon name={roleIcon} size={10} className="fill" />}
                  {roleLabel}
                </p>
              </div>
              {canRate && !reviewed && (
                <button
                  type="button"
                  onClick={() =>
                    setReviewTarget({
                      kind: 'member',
                      name: m.name,
                      image: m.avatar,
                      context: tripTitle ? `Cùng chuyến: ${tripTitle}` : undefined,
                      targetId: m.id,
                    })
                  }
                  aria-label={`Đánh giá ${m.name}`}
                  title="Đánh giá người đi cùng"
                  className="w-9 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition flex-shrink-0"
                >
                  <Icon name="rate_review" size={18} />
                </button>
              )}
              {canRate && reviewed && (
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-green-500/15 text-green-700"
                  title="Đã đánh giá"
                >
                  <Icon name="check" size={18} />
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {members.length === 0 && (
        <p className="text-center text-sm text-on-surface-variant/70 py-3">
          Chưa có thành viên nào — hãy là người đầu tiên!
        </p>
      )}

      {/* Owner-only: pending join requests */}
      {isOwner && pendingRequests && pendingRequests.length > 0 && (
        <div className="mt-6 pt-5 border-t border-outline-variant/15">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-sm font-extrabold uppercase tracking-widest text-on-surface flex items-center gap-2">
              <Icon name="how_to_reg" className="text-primary" size={18} />
              Yêu cầu chờ duyệt
            </h5>
            <span className="text-xs font-bold text-on-surface-variant">
              {pendingRequests.length}
            </span>
          </div>
          <ul className="space-y-2">
            {pendingRequests.map((req) => {
              const isAccepting = pendingActionId === `accept:${req.id}`
              const isRejecting = pendingActionId === `reject:${req.id}`
              const busy = isAccepting || isRejecting
              return (
                <li
                  key={req.id}
                  className="flex items-start gap-3 p-3 bg-surface-container-lowest rounded-2xl"
                >
                  <Avatar src={req.user.avatar ?? ''} alt={req.user.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-on-surface truncate">
                      {req.user.name}
                    </p>
                    {req.message && (
                      <p className="text-xs text-on-surface-variant mt-0.5 break-words">
                        “{req.message}”
                      </p>
                    )}
                    <p className="text-[10px] text-on-surface-variant/70 mt-1">
                      {new Date(req.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAccept(req.id)}
                      disabled={busy}
                      className="w-8 h-8 rounded-full bg-primary/15 text-primary hover:bg-primary/25 disabled:opacity-50 flex items-center justify-center transition"
                      title="Đồng ý"
                      aria-label={`Đồng ý ${req.user.name}`}
                    >
                      <Icon name={isAccepting ? 'hourglass_top' : 'check'} size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(req.id)}
                      disabled={busy}
                      className="w-8 h-8 rounded-full bg-error/10 text-error hover:bg-error/20 disabled:opacity-50 flex items-center justify-center transition"
                      title="Từ chối"
                      aria-label={`Từ chối ${req.user.name}`}
                    >
                      <Icon name={isRejecting ? 'hourglass_top' : 'close'} size={18} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <ReviewModal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        target={reviewTarget ?? { kind: 'member', name: '' }}
        onSubmit={() => {
          // mark by name (since we only keep target by name in modal); real impl would pass id
          const m = members.find((mb) => mb.name === reviewTarget?.name)
          if (m) setReviewedIds((prev) => new Set(prev).add(m.id))
        }}
      />
    </section>
  )
}
