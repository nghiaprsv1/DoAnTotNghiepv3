import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { ReviewModal } from '@components/features/ReviewModal'
import type { ReviewTarget } from '@components/features/ReviewModal'
import { tripEditPath } from '@constants/routes'
import { useTrip } from '@hooks/useTrips'
import { useCurrentUserStore } from '@store/currentUserStore'
import { tripService } from '@services/tripService'
import {
  computeTripStatus,
  tripStatusLabel,
  tripStatusTone,
  tripStatusIcon,
} from '@utils/tripStatus'
import { TripGuidePanel } from './components/TripGuidePanel'
import { MembersPanel } from './components/MembersPanel'
import { JoinPanel } from './components/JoinPanel'
import { JoinedPanel } from './components/JoinedPanel'
import { ItineraryEditorModal } from './components/ItineraryEditorModal'
import { TripReviewsList } from './components/TripReviewsList'
import { TripMapPanel } from './components/TripMapPanel'

export function TripDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: baseTrip, isLoading, isError } = useTrip(id)
  const currentUserId = useCurrentUserStore((s) => s.id)

  // Local "joined" state — initialized from server, then mutated by join/leave actions.
  const [joined, setJoined] = useState<boolean>(false)
  const [memberCount, setMemberCount] = useState<number>(0)
  const [actionPending, setActionPending] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [itineraryEditorOpen, setItineraryEditorOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null)

  // Sync local state when trip loads / changes
  useEffect(() => {
    if (baseTrip) {
      setJoined(!!baseTrip.isJoined)
      setMemberCount(baseTrip.memberCount)
    }
  }, [baseTrip])

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto container-page py-16 md:py-20 text-center">
        <div className="inline-block w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-on-surface-variant">Đang tải chuyến đi…</p>
      </div>
    )
  }

  if (isError || !baseTrip) {
    return (
      <div className="max-w-7xl mx-auto container-page py-16 md:py-20 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-error/10 text-error flex items-center justify-center mb-4">
          <Icon name="error" className="text-2xl" />
        </div>
        <h2 className="font-headline text-2xl font-extrabold text-on-surface mb-2">
          Không tìm thấy chuyến đi
        </h2>
        <p className="text-on-surface-variant">
          Chuyến đi này không tồn tại hoặc backend chưa sẵn sàng.
        </p>
      </div>
    )
  }

  const trip = { ...baseTrip, isJoined: joined, memberCount }
  const isFull = memberCount >= trip.maxMembers
  const isOwner = !!trip.isOwner
  // Live status derived from the trip dates (+ backend cancellation flag).
  const liveStatus = computeTripStatus(trip)
  // Cross-review unlocks once the trip has actually finished (real status,
  // not a demo toggle). computeTripStatus returns 'completed' when the end
  // date has passed or the backend marked it completed.
  const tripCompleted = liveStatus === 'completed'
  // Local copy of pending requests so we can optimistically remove on accept/reject.
  const pendingRequests = trip.pendingRequests ?? []

  const handleJoin = async () => {
    if (isFull || actionPending || !id) return
    if (trip.joinRequestStatus === 'pending') return
    setActionPending(true)
    setActionError(null)
    try {
      const res = await tripService.join(id)
      // Status is 'accepted' only when BE auto-accepts (e.g. open trips); otherwise
      // it stays 'pending' until the owner responds.
      if (res.status === 'accepted') {
        setJoined(true)
        setMemberCount((c) => c + 1)
      }
      queryClient.invalidateQueries({ queryKey: ['trip', id] })
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setActionError(e.response?.data?.message ?? 'Không gửi được yêu cầu tham gia.')
    } finally {
      setActionPending(false)
    }
  }

  const handleLeave = async () => {
    if (actionPending || !id) return
    setActionPending(true)
    setActionError(null)
    try {
      const res = await tripService.leave(id)
      setJoined(false)
      setMemberCount(res.memberCount)
      queryClient.invalidateQueries({ queryKey: ['trip', id] })
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setActionError(e.response?.data?.message ?? 'Không rời được chuyến đi.')
    } finally {
      setActionPending(false)
    }
  }

  const handleCancelTrip = async () => {
    if (actionPending || !id) return
    if (!window.confirm('Huỷ chuyến đi này? Tất cả thành viên sẽ nhận được thông báo và hành động không thể hoàn tác.')) {
      return
    }
    setActionPending(true)
    setActionError(null)
    try {
      await tripService.cancel(id)
      queryClient.invalidateQueries({ queryKey: ['trip', id] })
      queryClient.invalidateQueries({ queryKey: ['trips'] })
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setActionError(e.response?.data?.message ?? 'Không huỷ được chuyến đi.')
    } finally {
      setActionPending(false)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    if (!id) return
    setActionError(null)
    try {
      await tripService.acceptJoinRequest(id, requestId)
      queryClient.invalidateQueries({ queryKey: ['trip', id] })
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setActionError(e.response?.data?.message ?? 'Không xử lý được yêu cầu.')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!id) return
    setActionError(null)
    try {
      await tripService.rejectJoinRequest(id, requestId)
      queryClient.invalidateQueries({ queryKey: ['trip', id] })
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setActionError(e.response?.data?.message ?? 'Không xử lý được yêu cầu.')
    }
  }

  // Quick-glance cards: prefer user-provided values; fall back to '—'.
  const inclusionCards: [string, string, string][] = [
    ['hotel', 'Lưu trú', trip.inclusions?.accommodation || '—'],
    ['directions_boat', 'Di chuyển', trip.inclusions?.transport || '—'],
    ['restaurant', 'Bữa ăn', trip.inclusions?.meals || '—'],
    ['group', 'Quy mô', `${trip.maxMembers} người`],
  ]

  return (
    <div className="flex-grow">
      {/* Hero */}
      <section className="relative h-[320px] xs:h-[400px] md:h-[500px] lg:h-[614px] w-full overflow-hidden">
        <img src={trip.coverImage} alt={trip.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Owner shortcut — quick edit access from the cover. */}
        {isOwner && (
          <button
            type="button"
            onClick={() => navigate(tripEditPath(trip.id))}
            className="absolute top-4 right-4 md:top-6 md:right-6 inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-full bg-white/90 hover:bg-white text-on-surface font-headline font-bold shadow-editorial-lg backdrop-blur transition active:scale-95 text-sm md:text-base"
            aria-label="Chỉnh sửa chuyến đi"
          >
            <Icon name="edit" size={18} />
            <span className="hidden sm:inline">Chỉnh sửa</span>
          </button>
        )}

        <div className="absolute bottom-0 left-0 w-full container-page py-6 md:py-12 lg:py-16 max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${tripStatusTone(liveStatus)}`}
            >
              <Icon name={tripStatusIcon(liveStatus)} size={12} className="fill" />
              {tripStatusLabel(liveStatus)}
            </span>
            {joined && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-widest shadow-editorial">
                <Icon name="check_circle" size={12} className="fill" />
                Đã tham gia
              </span>
            )}
            {trip.tags.map((tag) => (
              <Badge key={tag} variant="glass" size="md">
                {tag}
              </Badge>
            ))}
          </div>
          <h1 className="text-3xl xs:text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-2 md:mb-4 tracking-tighter font-headline leading-tight">
            {trip.title}
          </h1>
          <p className="text-white/90 text-sm md:text-lg lg:text-xl max-w-2xl italic line-clamp-2 md:line-clamp-none">"{trip.description}"</p>
        </div>
      </section>

      {/* Content grid */}
      <div className="max-w-7xl mx-auto container-page py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Left: main content */}
        <div className="lg:col-span-8">
          <article className="mb-10 md:mb-16">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-primary tracking-tight font-headline">
              Trải nghiệm
            </h2>
            <div className="max-w-none text-on-surface leading-relaxed text-base md:text-lg">
              <p className="mb-4">
                {trip.destination} không chỉ là điểm đến — nó là một nơi để dừng lại và lắng nghe.
                Trong {trip.durationDays} ngày, chúng ta sẽ đi qua những góc khuất và năng lượng
                rực rỡ nhất của vùng đất, cân bằng giữa phiêu lưu và bình yên.
              </p>
            </div>
            <div className="mt-6 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {inclusionCards.map(([icon, label, value]) => (
                <div key={label} className="bg-surface-container-low p-3 md:p-4 rounded-xl text-center">
                  <Icon name={icon} className="text-primary mb-1 md:mb-2" />
                  <p className="text-[10px] md:text-xs font-bold uppercase text-on-surface-variant">{label}</p>
                  <p className="text-sm md:text-base font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </article>

          {/* Itinerary */}
          <section className="space-y-6 md:space-y-12 mb-10 md:mb-16">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl md:text-3xl font-bold text-primary tracking-tight font-headline">
                Lịch trình hằng ngày
              </h2>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setItineraryEditorOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-headline font-bold bg-primary/10 text-primary hover:bg-primary/15 transition active:scale-95"
                >
                  <Icon name="edit_calendar" size={16} />
                  <span className="hidden sm:inline">Chỉnh lịch trình</span>
                  <span className="sm:hidden">Sửa</span>
                </button>
              )}
            </div>
            {trip.itinerary.length === 0 ? (
              <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl text-center">
                <Icon name="event_note" className="text-on-surface-variant text-4xl mb-2" />
                <p className="text-sm md:text-base text-on-surface-variant">
                  Chưa có lịch trình chi tiết cho chuyến đi này.
                </p>
              </div>
            ) : (
              trip.itinerary.map((d) => (
                <div
                  key={d.dayNumber}
                  className="relative pl-8 md:pl-12 border-l-4 border-surface-container"
                >
                  <div className="absolute -left-[10px] md:-left-[14px] top-0 w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary ring-4 ring-background" />
                  <span className="text-[10px] md:text-xs font-bold text-primary-container tracking-widest uppercase">
                    Ngày {d.dayNumber} · {new Date(d.date).toLocaleDateString('vi-VN')}
                  </span>
                  <h3 className="text-lg md:text-2xl font-bold mt-1 mb-3 md:mb-4 font-headline">{d.title}</h3>
                  <div className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl shadow-sm">
                    {d.activities.length === 0 ? (
                      <p className="text-sm text-on-surface-variant italic">
                        Chưa có hoạt động nào trong ngày này.
                      </p>
                    ) : (
                      <ul className="space-y-3 text-on-surface">
                        {d.activities.map((a, idx) => (
                          <li key={idx} className="flex gap-3">
                            <span className="font-bold text-primary shrink-0 w-12 md:w-14 text-sm md:text-base">{a.time}</span>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm md:text-base">{a.title}</p>
                              {a.description && (
                                <p className="text-xs md:text-sm text-on-surface-variant mt-0.5">
                                  {a.description}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          <TripMapPanel
            destination={trip.destination}
            destinationLat={trip.destinationLat}
            destinationLng={trip.destinationLng}
            originName={trip.originName}
            originLat={trip.originLat}
            originLng={trip.originLng}
          />

          <TripReviewsList tripId={trip.id} />
        </div>

        {/* Right: sidebar */}
        <aside className="lg:col-span-4 space-y-6 md:space-y-8">
          {joined ? (
            // Creator is a TripMember (role=LEADER) → joined=true. JoinedPanel
            // adapts its CTAs based on isOwner so the same panel shows "Chỉnh
            // sửa" for the creator and "Rời khỏi" for everyone else.
            <JoinedPanel
              trip={trip}
              isOwner={isOwner}
              onLeave={handleLeave}
              onCancel={handleCancelTrip}
              cancelling={actionPending}
            />
          ) : (
            <JoinPanel
              trip={trip}
              onJoin={handleJoin}
              isFull={isFull}
              pending={actionPending}
              requestStatus={trip.joinRequestStatus}
            />
          )}

          {actionError && (
            <div className="rounded-2xl bg-error/10 border border-error/20 px-4 py-3 text-error text-sm flex items-start gap-2">
              <Icon name="error" size={16} className="mt-0.5" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Post-trip review CTA — unlocked only when the trip has finished. */}
          {joined && (
            <section className="bg-surface-container-lowest rounded-3xl p-5 shadow-editorial">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h4 className="font-headline font-extrabold text-on-surface">
                    Sau chuyến đi
                  </h4>
                  <p className="text-xs text-on-surface-variant">
                    {tripCompleted
                      ? 'Chuyến đi đã kết thúc — chia sẻ đánh giá của bạn'
                      : 'Mở khoá khi chuyến đi kết thúc'}
                  </p>
                </div>
                <Icon
                  name={tripCompleted ? 'task_alt' : 'lock_clock'}
                  size={22}
                  className={tripCompleted ? 'text-primary' : 'text-on-surface-variant/50'}
                />
              </div>

              {tripCompleted ? (
                <div className="space-y-2">
                  <Button
                    size="md"
                    rounded="full"
                    className="w-full"
                    onClick={() =>
                      setReviewTarget({
                        kind: 'trip',
                        name: trip.title,
                        image: trip.coverImage,
                        context: trip.destination,
                        targetId: trip.id,
                      })
                    }
                  >
                    <Icon name="rate_review" size={16} />
                    Đánh giá chuyến đi
                  </Button>
                  {trip.guide && (
                    <Button
                      variant="secondary"
                      size="md"
                      rounded="full"
                      className="w-full"
                      onClick={() =>
                        setReviewTarget({
                          kind: 'guide',
                          name: trip.guide!.name,
                          image: trip.guide!.avatar,
                          context: `Tour: ${trip.title}`,
                          targetId: trip.guide!.id,
                        })
                      }
                    >
                      <Icon name="star" size={16} />
                      Đánh giá HDV
                    </Button>
                  )}
                  <p className="text-[11px] text-on-surface-variant text-center pt-1">
                    Đánh giá thành viên trong panel bên dưới
                  </p>
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  Khi chuyến đi kết thúc, bạn sẽ có thể đánh giá HDV, chuyến đi và những người đi cùng.
                </p>
              )}
            </section>
          )}

          {trip.guide && (
            <TripGuidePanel guide={trip.guide} isJoined={joined} currentUserId={currentUserId} />
          )}

          <MembersPanel
            members={trip.members}
            creator={trip.creator}
            memberCount={memberCount}
            maxMembers={trip.maxMembers}
            tripCompleted={joined && tripCompleted}
            tripTitle={trip.title}
            isOwner={isOwner}
            pendingRequests={pendingRequests}
            onAcceptRequest={handleAcceptRequest}
            onRejectRequest={handleRejectRequest}
          />
        </aside>
      </div>

      <ReviewModal
        open={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        target={reviewTarget ?? { kind: 'trip', name: '' }}
        onSuccess={() => {
          // Refresh whatever list the user was contributing to so they see
          // their review appear right away.
          if (!reviewTarget) return
          queryClient.invalidateQueries({
            queryKey: ['reviews', reviewTarget.kind, reviewTarget.targetId],
          })
        }}
      />

      <ItineraryEditorModal
        open={itineraryEditorOpen}
        tripId={trip.id}
        initialItinerary={trip.itinerary}
        tripStartDate={trip.startDate}
        onClose={() => setItineraryEditorOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['trip', id] })}
      />
    </div>
  )
}
