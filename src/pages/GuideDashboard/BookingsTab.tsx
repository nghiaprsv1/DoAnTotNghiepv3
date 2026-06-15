import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useMyBookingsAsGuide } from '@hooks/useBookings'
import { BookingRow } from './components/BookingRow'
import type { TravelerBooking } from '@types/booking'
import type { DashboardBooking } from '@types/guideDashboard'

type FilterKey = 'all' | 'awaiting' | 'confirmed' | 'completed' | 'cancelled'

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'awaiting', label: 'Cần xử lý' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã huỷ' },
]

/** Bucket statuses for the guide-side view. */
function bucketOf(status: DashboardBooking['status']): Exclude<FilterKey, 'all'> {
  switch (status) {
    case 'pending':
    case 'pending_acceptance':
    case 'pending_payment':
      return 'awaiting'
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

/** Map TravelerBooking (BE) → DashboardBooking shape used by BookingRow. */
const adapt = (b: TravelerBooking): DashboardBooking => ({
  id: b.id,
  customerId: b.traveler?.id,
  customerName: b.traveler?.name ?? 'Khách',
  customerAvatar: b.traveler?.avatar ?? '',
  tourTitle: b.tourTitle,
  destination: b.destination,
  date: b.startDate,
  durationDays: b.durationDays,
  groupSize: b.groupSize,
  amount: b.amount,
  status: b.status,
  createdAt: b.createdAt,
  message: b.message,
})

export function BookingsTab() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')
  const { data: rawBookings, isLoading } = useMyBookingsAsGuide()
  const bookings = useMemo(() => (rawBookings ?? []).map(adapt), [rawBookings])

  const list = useMemo(() => {
    let l = bookings
    if (filter !== 'all') l = l.filter((b) => bucketOf(b.status) === filter)
    if (query.trim()) {
      const q = query.toLowerCase()
      l = l.filter(
        (b) =>
          b.customerName.toLowerCase().includes(q) ||
          b.tourTitle.toLowerCase().includes(q) ||
          b.destination.toLowerCase().includes(q)
      )
    }
    return l
  }, [bookings, filter, query])

  const counts = useMemo(() => {
    const acc: Record<FilterKey, number> = {
      all: bookings.length,
      awaiting: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    }
    bookings.forEach((b) => {
      acc[bucketOf(b.status)]++
    })
    return acc
  }, [bookings])

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-headline font-extrabold text-2xl text-on-surface">Đặt chỗ</h2>
          <p className="text-sm text-on-surface-variant">
            Quản lý booking từ khách. Xác nhận / từ chối / nhắn tin trực tiếp với khách.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2 shadow-editorial w-full md:w-72">
          <Icon name="search" className="text-on-surface-variant" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên khách, tour…"
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/60"
          />
        </div>
      </header>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
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
                  active
                    ? 'bg-on-primary text-primary'
                    : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <LoadingState count={3} />
      ) : list.length === 0 ? (
        <EmptyState
          icon="event_busy"
          title={filter === 'all' ? 'Chưa có booking nào' : 'Không có booking khớp bộ lọc'}
          description="Khi traveler đặt tour với bạn, yêu cầu sẽ xuất hiện ở đây."
        />
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <BookingRow key={b.id} booking={b} showActions />
          ))}
        </div>
      )}
    </div>
  )
}
