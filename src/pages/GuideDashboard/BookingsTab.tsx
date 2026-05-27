import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { mockBookings } from '@constants/mockGuideDashboard'
import { BookingRow } from './components/BookingRow'
import type { Booking } from '@constants/mockGuideDashboard'

type FilterKey = 'all' | Booking['status']

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Tất cả' },
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'confirmed', label: 'Đã xác nhận' },
  { key: 'completed', label: 'Hoàn thành' },
  { key: 'cancelled', label: 'Đã huỷ' },
]

export function BookingsTab() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    let l = mockBookings
    if (filter !== 'all') l = l.filter((b) => b.status === filter)
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
  }, [filter, query])

  const counts = useMemo(() => {
    const acc: Record<FilterKey, number> = {
      all: mockBookings.length,
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
    }
    mockBookings.forEach((b) => {
      acc[b.status] = (acc[b.status] ?? 0) + 1
    })
    return acc
  }, [])

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="font-headline font-extrabold text-2xl text-on-surface">
            Đặt chỗ
          </h2>
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
                  active ? 'bg-on-primary text-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {counts[f.key]}
              </span>
            </button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-10 text-center">
          <Icon name="event_busy" className="text-3xl text-on-surface-variant mb-2" />
          <p className="text-on-surface-variant">Không có booking nào khớp.</p>
        </div>
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
