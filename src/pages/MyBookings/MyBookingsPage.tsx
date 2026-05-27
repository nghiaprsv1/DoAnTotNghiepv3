import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { mockTravelerBookings } from '@constants/mockTravelerBookings'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'
import { TravelerBookingCard } from './components/TravelerBookingCard'
import type { BookingStatus, TravelerBooking } from '@types/booking'

type FilterKey = 'all' | BookingStatus

const filters: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'Tất cả', icon: 'inbox' },
  { key: 'pending', label: 'Chờ phản hồi', icon: 'hourglass_top' },
  { key: 'confirmed', label: 'Đã xác nhận', icon: 'check_circle' },
  { key: 'completed', label: 'Đã hoàn thành', icon: 'task_alt' },
  { key: 'cancelled', label: 'Đã huỷ', icon: 'event_busy' },
]

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<TravelerBooking[]>(mockTravelerBookings)
  const [filter, setFilter] = useState<FilterKey>('all')

  const counts = useMemo(() => {
    const acc: Record<FilterKey, number> = {
      all: bookings.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    }
    bookings.forEach((b) => {
      acc[b.status]++
    })
    return acc
  }, [bookings])

  const filtered = useMemo(() => {
    if (filter === 'all') return bookings
    return bookings.filter((b) => b.status === filter)
  }, [bookings, filter])

  const totalSpent = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'completed' || b.status === 'confirmed')
        .reduce((s, b) => s + b.amount, 0),
    [bookings]
  )

  const handleCancel = (id: string) => {
    if (!confirm('Huỷ booking này? Hành động không thể hoàn tác.')) return
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, status: 'cancelled', cancelReason: 'Bạn đã huỷ' } : b
      )
    )
  }

  const handleMarkReviewed = (id: string) => {
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, hasReview: true } : b)))
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
        <Stat icon="hourglass_top" value={`${counts.pending}`} label="Chờ phản hồi" tone="amber" />
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
      {filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto mb-4">
            <Icon name="luggage" className="text-2xl" />
          </div>
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-1">
            {filter === 'all' ? 'Chưa có booking nào' : `Không có booking ${filters.find((f) => f.key === filter)?.label.toLowerCase()}`}
          </h3>
          <p className="text-on-surface-variant max-w-md mx-auto mb-5">
            Khám phá danh sách HDV và đặt chuyến đi đầu tiên của bạn.
          </p>
          <Link
            to={ROUTES.GUIDES}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full editorial-gradient text-on-primary font-headline font-bold shadow-editorial active:scale-95"
          >
            <Icon name="search" />
            Tìm hướng dẫn viên
          </Link>
        </div>
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
