import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { ROUTES } from '@constants/routes'
import { useAuthStore } from '@store/authStore'
import { useCurrentUserStore } from '@store/currentUserStore'
import { useOpenDirectChat } from '@hooks/useMessages'
import { useMyCreatedTrips, useMyJoinedTrips } from '@hooks/useTrips'
import { bookingService } from '@services/bookingService'
import { guideService } from '@services/guideService'
import { cn } from '@utils/cn'
import type { HireableGuide } from '@types/trip'

interface Props {
  guide: HireableGuide
  /**
   * Backing guide *user* id (optional). Needed for the "nhắn tin" button so the
   * traveler can DM the guide directly.
   */
  guideUserId?: string
}

const availabilityStyles: Record<HireableGuide['availability'], string> = {
  available: 'bg-green-500/15 text-green-700 border-green-500/30',
  busy: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'fully-booked': 'bg-error/10 text-error border-error/30',
}

const availabilityDot: Record<HireableGuide['availability'], string> = {
  available: 'bg-green-500',
  busy: 'bg-amber-500',
  'fully-booked': 'bg-error',
}

const defaultStart = () => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().slice(0, 10)
}

/**
 * Sticky sidebar on the guide detail page. Lets a traveler send a booking
 * request (`POST /guides/bookings`) and bounces them to /my-bookings on
 * success so they can follow the lifecycle.
 */
export function BookingPanel({ guide, guideUserId }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUserId = useCurrentUserStore((s) => s.id)
  const openDirect = useOpenDirectChat()

  const [startDate, setStartDate] = useState(defaultStart())
  const [durationDays, setDurationDays] = useState(2)
  const [groupSize, setGroupSize] = useState(2)
  const [message, setMessage] = useState('')
  const [tripId, setTripId] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  // Spec: traveler must attach the booking to a trip they're a member of.
  // Combine "trips I created" + "trips I joined" so leaders see their own.
  const { data: createdTrips = [] } = useMyCreatedTrips(isAuthenticated)
  const { data: joinedTrips = [] } = useMyJoinedTrips(isAuthenticated)
  const myTrips = useMemo(() => {
    const seen = new Set<string>()
    return [...createdTrips, ...joinedTrips].filter((t) => {
      if (seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [createdTrips, joinedTrips])

  // Spec: booking date phải nằm trong khoảng start_date..end_date của chuyến đi.
  // Khi user chọn chuyến, ép date picker về biên đó.
  const selectedTrip = useMemo(
    () => myTrips.find((t) => t.id === tripId),
    [myTrips, tripId],
  )
  const dateMin = selectedTrip?.startDate ?? new Date().toISOString().slice(0, 10)
  const dateMax = selectedTrip?.endDate
  const tripDurationDays = selectedTrip?.durationDays ?? 14

  // Reset / clamp date when the chosen trip changes so the picker is never
  // outside the trip range.
  useEffect(() => {
    if (!selectedTrip) return
    if (startDate < selectedTrip.startDate || startDate > selectedTrip.endDate) {
      setStartDate(selectedTrip.startDate)
    }
    if (durationDays > selectedTrip.durationDays) {
      setDurationDays(Math.max(1, selectedTrip.durationDays))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId])

  const totalAmount = useMemo(
    () => Math.max(0, durationDays) * Math.max(0, guide.pricePerDay),
    [durationDays, guide.pricePerDay],
  )
  const isFullyBooked = guide.availability === 'fully-booked'
  const isSelf = !!guideUserId && guideUserId === currentUserId

  // Pull guide busy ranges so we can warn the traveler before submit. The BE
  // also enforces this — the FE check is purely UX.
  const { data: busyRanges = [] } = useQuery({
    queryKey: ['guide', guide.id, 'busy-dates'],
    queryFn: () => guideService.busyDates(guide.id),
  })

  const overlapsBusy = useMemo(() => {
    if (!startDate || durationDays <= 0) return false
    const end = new Date(startDate)
    end.setDate(end.getDate() + durationDays - 1)
    const endIso = end.toISOString().slice(0, 10)
    return busyRanges.some((r) => startDate <= r.endDate && endIso >= r.startDate)
  }, [busyRanges, startDate, durationDays])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN)
      return
    }
    if (isSelf) {
      setFeedback({ kind: 'err', msg: 'Bạn không thể tự đặt lịch chính mình.' })
      return
    }
    if (!startDate || durationDays <= 0 || groupSize <= 0) {
      setFeedback({ kind: 'err', msg: 'Vui lòng nhập đủ thông tin.' })
      return
    }
    if (!tripId) {
      setFeedback({
        kind: 'err',
        msg: 'Vui lòng chọn chuyến đi để gắn booking. HDV cần biết chuyến nào sẽ dẫn.',
      })
      return
    }
    // Validate booking range fits inside the chosen trip range — same rule
    // BE enforces, surfaced earlier so the user gets a friendly error.
    if (selectedTrip) {
      const end = new Date(startDate)
      end.setDate(end.getDate() + durationDays - 1)
      const endIso = end.toISOString().slice(0, 10)
      if (startDate < selectedTrip.startDate || endIso > selectedTrip.endDate) {
        setFeedback({
          kind: 'err',
          msg: `Ngày thuê HDV phải nằm trong chuyến (${selectedTrip.startDate} → ${selectedTrip.endDate}).`,
        })
        return
      }
    }
    if (overlapsBusy) {
      setFeedback({
        kind: 'err',
        msg: 'HDV đã có lịch bận trong khoảng ngày này. Vui lòng chọn ngày khác.',
      })
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      const trip = myTrips.find((t) => t.id === tripId)
      const end = new Date(startDate)
      end.setDate(end.getDate() + durationDays - 1)
      await bookingService.create({
        guideId: guide.id,
        tripId,
        tourTitle: trip ? `${trip.title} · ${guide.region}` : `Tour ${guide.region}`,
        tourCover: guide.coverImage,
        destination: trip?.destination || guide.region,
        startDate,
        endDate: end.toISOString().slice(0, 10),
        durationDays,
        groupSize,
        amount: totalAmount,
        currency: guide.currency || 'VND',
        message: message.trim() || undefined,
      })
      qc.invalidateQueries({ queryKey: ['bookings', 'me', 'traveler'] })
      navigate(ROUTES.MY_BOOKINGS)
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setFeedback({
        kind: 'err',
        msg: e.response?.data?.message ?? 'Không gửi được yêu cầu. Thử lại sau.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleChat = async () => {
    if (!isAuthenticated) {
      navigate(ROUTES.LOGIN)
      return
    }
    if (!guideUserId) return
    try {
      await openDirect(guideUserId)
    } catch {
      navigate(ROUTES.MESSAGES)
    }
  }

  return (
    <section className="bg-surface-container-lowest p-6 md:p-7 rounded-3xl shadow-editorial-lg border-t-4 border-primary sticky top-24">
      <div className="flex items-end justify-between mb-5">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Từ
          </span>
          <p className="text-3xl font-extrabold text-on-surface font-headline leading-none">
            {guide.currency}
            {guide.pricePerDay.toLocaleString('vi-VN')}
            <span className="text-sm font-medium text-on-surface-variant ml-1">/ngày</span>
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
            availabilityStyles[guide.availability]
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', availabilityDot[guide.availability])} />
          {guide.availabilityLabel ??
            (guide.availability === 'available' ? 'Còn lịch' : 'Bận')}
        </span>
      </div>

      <form onSubmit={submit}>
        {/* Spec Phần 4: gắn booking với 1 chuyến đi traveler đang tham gia. */}
        <div className="mb-3">
          <Field
            label="Chuyến đi gắn với booking *"
            input={
              myTrips.length === 0 ? (
                <div className="text-xs text-on-surface-variant bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-2.5">
                  Bạn chưa có chuyến đi nào.{' '}
                  <Link to={ROUTES.TRIPS} className="text-primary font-bold underline">
                    Tạo / tham gia một chuyến
                  </Link>{' '}
                  trước khi thuê HDV.
                </div>
              ) : (
                <select
                  value={tripId}
                  onChange={(e) => setTripId(e.target.value)}
                  className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">— Chọn chuyến đi —</option>
                  {myTrips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} · {t.destination}
                    </option>
                  ))}
                </select>
              )
            }
          />
          {selectedTrip && (
            <p className="text-[11px] text-on-surface-variant mt-1.5">
              Khoảng chuyến: <b>{selectedTrip.startDate}</b> → <b>{selectedTrip.endDate}</b> ·{' '}
              {selectedTrip.durationDays} ngày
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <Field
            label="Ngày khởi hành"
            input={
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={dateMin}
                max={dateMax}
                disabled={!selectedTrip}
                className={cn(
                  'w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60',
                  overlapsBusy && 'ring-2 ring-error/50',
                )}
              />
            }
          />
          <Field
            label="Số ngày"
            input={
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              >
                {[1, 2, 3, 4, 5, 7, 10, 14]
                  .filter((n) => n <= tripDurationDays)
                  .map((n) => (
                    <option key={n} value={n}>
                      {n} ngày
                    </option>
                  ))}
              </select>
            }
          />
        </div>
        {overlapsBusy && (
          <p className="text-[11px] text-error -mt-2 mb-3 flex items-center gap-1">
            <Icon name="event_busy" size={12} />
            Khoảng ngày bạn chọn trùng với booking đã xác nhận của HDV.
          </p>
        )}
        {busyRanges.length > 0 && !overlapsBusy && (
          <p className="text-[11px] text-on-surface-variant -mt-2 mb-3">
            HDV đang bận: {busyRanges
              .slice(0, 3)
              .map((r) => `${r.startDate}→${r.endDate}`)
              .join(', ')}
            {busyRanges.length > 3 && ` …và ${busyRanges.length - 3} khoảng khác`}
          </p>
        )}
        <div className="mb-3">
          <Field
            label="Số khách"
            input={
              <input
                type="number"
                min={1}
                max={20}
                value={groupSize}
                onChange={(e) => setGroupSize(Number(e.target.value))}
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
              />
            }
          />
        </div>
        <div className="mb-4">
          <Field
            label="Lời nhắn tới HDV (tuỳ chọn)"
            input={
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                placeholder="Vd: 2 người lớn + 1 trẻ em, thích trekking nhẹ…"
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            }
          />
        </div>

        <div className="bg-primary/5 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
            Tổng tạm tính
          </span>
          <span className="font-headline font-extrabold text-2xl text-on-surface">
            {guide.currency}
            {totalAmount.toLocaleString('vi-VN')}
          </span>
        </div>

        {feedback && (
          <p
            className={cn(
              'text-sm mb-3',
              feedback.kind === 'ok' ? 'text-green-700' : 'text-error',
            )}
          >
            {feedback.msg}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="w-full mb-2"
          disabled={
            isFullyBooked ||
            submitting ||
            isSelf ||
            overlapsBusy ||
            (isAuthenticated && !tripId)
          }
          isLoading={submitting}
        >
          {isFullyBooked ? (
            <>Hết lịch</>
          ) : isSelf ? (
            <>Không thể tự đặt</>
          ) : overlapsBusy ? (
            <>HDV đã bận trong khoảng này</>
          ) : (
            <>
              <Icon name="calendar_add_on" />
              Gửi yêu cầu đặt lịch
            </>
          )}
        </Button>
      </form>
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full mb-2"
        onClick={handleChat}
        disabled={!guideUserId || isSelf}
      >
        <Icon name="chat" />
        Nhắn tin với HDV
      </Button>
      <p className="text-center text-[11px] text-on-surface-variant mt-2">
        HDV sẽ phản hồi trong {guide.responseTime ?? '24 giờ'}. Tiền chỉ bị trừ khi bạn xác nhận
        thanh toán.
      </p>
    </section>
  )
}

function Field({ label, input }: { label: string; input: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
        {label}
      </span>
      {input}
    </label>
  )
}
