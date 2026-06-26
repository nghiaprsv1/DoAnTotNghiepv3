import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useCurrentUserStore } from '@store/currentUserStore'
import { bookingService } from '@services/bookingService'
import {
  ROUTES,
  guideDetailPath,
  tripDetailPath,
  userProfilePath,
} from '@constants/routes'
import { cn } from '@utils/cn'
import { BookingTimeline } from './components/BookingTimeline'
import { BookingActions } from './components/BookingActions'
import type { TravelerBooking } from '@types/booking'

const statusLabel: Record<TravelerBooking['status'], { label: string; cls: string }> = {
  pending: { label: 'Chờ duyệt', cls: 'bg-amber-500/15 text-amber-700' },
  pending_acceptance: { label: 'Chờ HDV duyệt', cls: 'bg-amber-500/15 text-amber-700' },
  pending_payment: { label: 'Chờ thanh toán', cls: 'bg-orange-500/15 text-orange-700' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-green-500/15 text-green-700' },
  expired: { label: 'Hết hạn', cls: 'bg-on-surface-variant/10 text-on-surface-variant' },
  completed: { label: 'Đã hoàn thành', cls: 'bg-primary/10 text-primary' },
  cancelled: { label: 'Đã huỷ', cls: 'bg-error/10 text-error' },
  rejected: { label: 'Bị từ chối', cls: 'bg-error/10 text-error' },
}

const VND = (n: number) => `₫${Math.round(n).toLocaleString('vi-VN')}`

/**
 * Single-booking detail page — accessible to both the traveler and the guide
 * tied to the booking. Shows: hero, status timeline, financial breakdown
 * (gross / commission / net), the linked trip, the other party, and the
 * appropriate action panel based on viewer role + state.
 */
export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const currentUserId = useCurrentUserStore((s) => s.id)

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingService.getById(id as string),
    enabled: Boolean(id),
  })

  if (isLoading) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <LoadingState label="Đang tải booking…" />
      </div>
    )
  }
  if (error || !booking) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-16">
        <EmptyState
          icon="error_outline"
          title="Không tải được booking"
          description="Có thể bạn không có quyền xem hoặc booking không tồn tại."
          action={{ label: 'Về danh sách', to: ROUTES.MY_BOOKINGS }}
        />
      </div>
    )
  }

  const isTraveler = !!currentUserId && booking.traveler?.id === currentUserId
  const isGuide = !!currentUserId && booking.guide.userId === currentUserId
  const status = statusLabel[booking.status] ?? statusLabel.pending
  const commission = booking.amount * 0.1
  const net = booking.amount * 0.9

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 py-6">
      {/* Hero */}
      <div className="relative h-48 md:h-64 rounded-3xl overflow-hidden shadow-editorial mb-6">
        <img src={booking.tourCover} alt={booking.tourTitle} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-on-surface/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2',
                status.cls,
              )}
            >
              {status.label}
            </span>
            <h1 className="font-headline font-extrabold text-white text-2xl md:text-3xl truncate">
              {booking.tourTitle}
            </h1>
            <p className="text-white/80 text-sm flex items-center gap-1">
              <Icon name="location_on" size={14} /> {booking.destination}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          {/* Trip linked */}
          {booking.trip && (
            <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
              <h3 className="font-headline font-extrabold text-base text-on-surface mb-3 flex items-center gap-2">
                <Icon name="explore" className="text-primary" />
                Chuyến đi gắn với booking
              </h3>
              <Link
                to={tripDetailPath(booking.trip.id)}
                className="flex items-center gap-3 hover:bg-surface-container-low rounded-2xl p-2 transition"
              >
                <img
                  src={booking.trip.coverImage ?? booking.tourCover}
                  alt={booking.trip.title}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-headline font-bold text-on-surface truncate">
                    {booking.trip.title}
                  </p>
                  <p className="text-sm text-on-surface-variant truncate">
                    {booking.trip.destination}
                    {booking.trip.startDate &&
                      ` · ${booking.trip.startDate} → ${booking.trip.endDate ?? '…'}`}
                  </p>
                </div>
                <Icon name="chevron_right" className="text-on-surface-variant" />
              </Link>
            </section>
          )}

          {/* Parties */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PartyCard
              role="HDV"
              name={booking.guide.name}
              avatar={booking.guide.avatar}
              link={guideDetailPath(booking.guide.id)}
              icon="workspace_premium"
              meta={booking.guide.region}
            />
            {booking.traveler && (
              <PartyCard
                role="Khách"
                name={booking.traveler.name}
                avatar={booking.traveler.avatar}
                link={userProfilePath(booking.traveler.id)}
                icon="person"
                meta={booking.message ? `"${booking.message}"` : undefined}
              />
            )}
          </section>

          {/* Trip facts + finance */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Fact icon="event" label="Ngày khởi hành" value={booking.startDate} />
            <Fact icon="schedule" label="Số ngày" value={`${booking.durationDays} ngày`} />
            <Fact icon="groups" label="Số khách" value={`${booking.groupSize}`} />
            <Fact icon="payments" label="Tổng" value={VND(booking.amount)} />
          </section>

          {booking.status === 'completed' && (
            <section className="bg-primary/5 rounded-3xl p-5">
              <h3 className="font-headline font-extrabold text-base text-on-surface mb-2">
                Phân chia doanh thu
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <Money label="HDV nhận" value={VND(net)} tone="primary" />
                <Money label="Phí nền tảng" value={VND(commission)} tone="amber" />
                <Money label="Tổng" value={VND(booking.amount)} tone="neutral" />
              </div>
            </section>
          )}

          {/* Timeline */}
          <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 md:p-6">
            <h3 className="font-headline font-extrabold text-lg text-on-surface mb-4">
              Lịch sử trạng thái
            </h3>
            <BookingTimeline booking={booking} />
            {booking.cancelReason && (
              <p className="mt-4 text-sm text-error bg-error/10 rounded-xl px-3 py-2">
                <b>Lý do:</b> {booking.cancelReason}
              </p>
            )}
          </section>
        </div>

        {/* Right: actions */}
        <BookingActions booking={booking} isTraveler={isTraveler} isGuide={isGuide} />
      </div>
    </div>
  )
}

function PartyCard({
  role,
  name,
  avatar,
  link,
  icon,
  meta,
}: {
  role: string
  name: string
  avatar: string
  link: string
  icon: string
  meta?: string
}) {
  return (
    <Link
      to={link}
      className="bg-surface-container-lowest rounded-3xl shadow-editorial p-4 flex items-center gap-3 hover:shadow-editorial-lg transition"
    >
      <Avatar src={avatar} alt={name} size="lg" ring />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant inline-flex items-center gap-1">
          <Icon name={icon} size={12} /> {role}
        </p>
        <p className="font-headline font-extrabold text-on-surface truncate">{name}</p>
        {meta && <p className="text-xs text-on-surface-variant truncate">{meta}</p>}
      </div>
      <Icon name="chevron_right" className="text-on-surface-variant" />
    </Link>
  )
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-editorial p-3">
      <Icon name={icon} className="text-primary" size={16} />
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant mt-1">{label}</p>
      <p className="font-headline font-bold text-on-surface text-sm truncate">{value}</p>
    </div>
  )
}

function Money({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'amber' | 'neutral' }) {
  const tones: Record<typeof tone, string> = {
    primary: 'bg-primary/10 text-primary',
    amber: 'bg-amber-500/15 text-amber-700',
    neutral: 'bg-surface-container text-on-surface',
  }
  return (
    <div className={cn('rounded-2xl p-3', tones[tone])}>
      <p className="text-[10px] uppercase tracking-widest font-bold opacity-80">{label}</p>
      <p className="font-headline font-extrabold text-lg mt-1">{value}</p>
    </div>
  )
}
