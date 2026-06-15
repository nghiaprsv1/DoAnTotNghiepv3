import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useMyBookingsAsTraveler } from '@hooks/useBookings'
import { useAuthStore } from '@store/authStore'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'
import { TravelerBookingCard } from './components/TravelerBookingCard'
import type { BookingStatus } from '@types/booking'

type FilterKey = 'all' | 'awaiting' | 'awaiting_payment' | 'confirmed' | 'completed' | 'cancelled'

const filters: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'Tất cả', icon: 'inbox' },
  { key: 'awaiting', label: 'Chờ HDV duyệt', icon: 'hourglass_top' },
  { key: 'awaiting_payment', label: 'Chờ thanh toán', icon: 'payments' },
  { key: 'confirmed', label: 'Đã xác nhận', icon: 'check_circle' },
  { key: 'completed', label: 'Đã hoàn thành', icon: 'task_alt' },
  { key: 'cancelled', label: 'Đã huỷ', icon: 'event_busy' },
]

/** Maps a backend BookingStatus to the FE filter bucket for traveler view. */
function bucketOf(status: BookingStatus): Exclude<FilterKey, 'all'> {
  switch (status) {
    case 'pending':
    case 'pending_acceptance':
      return 'awaiting'
    case 'pending_payment':
      return 'awaiting_payment'
    case 'confirmed':
      return 'confirmed'
    case 'completed':
      return 'completed'
    case 'expired':
    case 'cancelled':
    case 'rejected':
      return 'cancelled'
  }
}

export function MyBookingsPage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { data: apiBookings, isLoading } = useMyBookingsAsTraveler()
  const bookings = apiBookings ?? []
  const [filter, setFilter] = useState<FilterKey>('all')

  const counts = useMemo(() => {
    const acc: Record<FilterKey, number> = {
      all: bookings.length,
      awaiting: 0,
      awaiting_payment: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    }
    bookings.forEach((b) => {
      acc[bucketOf(b.status)]++
    })
    return acc
  }, [bookings])

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings
    return bookings.filter((b) => bucketOf(b.status) === filter)
  }, [bookings, filter])

  const totalSpent = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'completed' || b.status === 'confirmed')
        .reduce((s, b) => s + b.amount, 0),
    [bookings]
  )

  const handleCancel = async (id: string) => {
    if (!confirm('Huỷ booking này? Hành động không thể hoàn tác.')) return
    try {
      const { bookingService } = await import('@services/bookingService')
      await bookingService.respond(id, 'cancel', 'Bạn đã huỷ')
      // Refetch from server.
      window.location.reload()
    } catch (err) {
      alert('Không thể huỷ booking. Vui lòng thử lại.')
    }
  }

  const handleMarkReviewed = (_id: string) => {
    // No-op until reviewService.create is wired into the booking-card flow.
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon="login"
          title="Đăng nhập để xem booking"
          description="Bạn cần đăng nhập để theo dõi các chuyến đi đã đặt với hướng dẫn viên."
          action={{ label: 'Đăng nhập', to: ROUTES.LOGIN }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <header className="mb-8">
        <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-2 block">
          Booking của tôi
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline text-on-surface">
          Hành trình đã đặt
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl">
          Theo dõi các booking với hướng dẫn viên — từ lúc gửi yêu cầu đến khi hoàn thành chuyến đi.
        </p>
      </header>

      {/* Summary stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <Stat icon="luggage" value={`${bookings.length}`} label="Tổng booking" />
        <Stat
          icon="hourglass_top"
          value={`${counts.awaiting + counts.awaiting_payment}`}
          label="Chờ xử lý"
          tone="amber"
        />
        <Stat icon="check_circle" value={`${counts.completed}`} label="Đã hoàn thành" tone="green" />
        <Stat
          icon="payments"
          value={`₫${(totalSpent / 1_000_000).toFixed(1)}M`}
          label="Tổng chi"
          tone="primary"
        />
      </section>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-headline font-bold whitespace-nowrap transition border',
                active
                  ? 'bg-primary text-on-primary border-primary shadow-editorial'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40'
              )}
            >
              <Icon name={f.icon} size={16} />
              {f.label}
              <span
                className={cn(
                  'min-w-5 h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center',
                  active
                    ? 'bg-on-primary text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingState count={3} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="luggage"
          title={
            filter === 'all'
              ? 'Chưa có booking nào'
              : `Không có booking ${filters.find((f) => f.key === filter)?.label.toLowerCase()}`
          }
          description="Khám phá danh sách HDV và đặt chuyến đi đầu tiên của bạn."
          action={{ label: 'Tìm hướng dẫn viên', to: ROUTES.GUIDES }}
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => (
            <TravelerBookingCard
              key={b.id}
              booking={b}
              onCancel={handleCancel}
              onMarkReviewed={handleMarkReviewed}
            />
          ))}
        </div>
      )}
    </div>
  )
}

const TONE_CLASS = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-500/15 text-amber-700',
  green: 'bg-green-500/15 text-green-700',
  neutral: 'bg-surface-container-low text-on-surface-variant',
} as const

function Stat({
  icon,
  value,
  label,
  tone = 'neutral',
}: {
  icon: string
  value: string
  label: string
  tone?: keyof typeof TONE_CLASS
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-editorial">
      <span
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center mb-2',
          TONE_CLASS[tone]
        )}
      >
        <Icon name={icon} size={18} />
      </span>
      <p className="font-headline font-extrabold text-2xl text-on-surface leading-tight">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  )
}
