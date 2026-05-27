import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import {
  mockBookings,
  mockDashboardTours,
  mockPayouts,
  mockRevenueByMonth,
} from '@constants/mockGuideDashboard'
import { StatCard } from './components/StatCard'
import { RevenueChart } from './components/RevenueChart'
import { BookingRow } from './components/BookingRow'
import { cn } from '@utils/cn'

export function OverviewTab() {
  const [hoverIdx, setHoverIdx] = useState(-1)

  const totalRevenue = useMemo(
    () => mockRevenueByMonth.reduce((s, m) => s + m.amount, 0),
    []
  )
  const totalBookings = useMemo(
    () => mockRevenueByMonth.reduce((s, m) => s + m.bookings, 0),
    []
  )
  const pendingBookings = mockBookings.filter((b) => b.status === 'pending').length

  const recent = mockBookings.slice(0, 4)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="payments"
          label="Doanh thu 7 tháng"
          value={`₫${totalRevenue.toLocaleString('vi-VN')}`}
          delta={{ value: '+18%', positive: true }}
          tone="primary"
        />
        <StatCard
          icon="event_available"
          label="Tổng booking"
          value={`${totalBookings}`}
          delta={{ value: '+12%', positive: true }}
        />
        <StatCard
          icon="hourglass_top"
          label="Chờ duyệt"
          value={`${pendingBookings}`}
        />
        <StatCard
          icon="star"
          label="Rating trung bình"
          value="4.95"
          delta={{ value: '+0.05', positive: true }}
        />
      </div>

      <RevenueChart
        data={mockRevenueByMonth}
        activeIndex={hoverIdx}
        onHover={setHoverIdx}
      />

      {/* Recent bookings */}
      <section className="bg-surface-container-low rounded-3xl p-5 md:p-6">
        <header className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-extrabold text-lg text-on-surface">
            Booking gần đây
          </h3>
          <button type="button" className="text-sm text-primary font-bold hover:underline">
            Xem tất cả
          </button>
        </header>
        <div className="space-y-3">
          {recent.map((b) => (
            <BookingRow key={b.id} booking={b} />
          ))}
        </div>
      </section>

      {/* Recent payouts mini */}
      <section className="bg-surface-container-low rounded-3xl p-5 md:p-6">
        <header className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-extrabold text-lg text-on-surface">
            Lần thanh toán gần nhất
          </h3>
        </header>
        <ul className="space-y-2">
          {mockPayouts.slice(0, 3).map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 p-3 bg-surface-container-lowest rounded-2xl"
            >
              <span
                className={cn(
                  'w-9 h-9 rounded-xl flex items-center justify-center',
                  p.status === 'paid'
                    ? 'bg-green-500/15 text-green-700'
                    : p.status === 'processing'
                      ? 'bg-amber-500/15 text-amber-700'
                      : 'bg-error/10 text-error'
                )}
              >
                <Icon
                  name={
                    p.status === 'paid'
                      ? 'check'
                      : p.status === 'processing'
                        ? 'schedule'
                        : 'error'
                  }
                />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-on-surface truncate">
                  ₫{p.amount.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-on-surface-variant truncate">{p.method}</p>
              </div>
              <span className="text-xs text-on-surface-variant">{p.date}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Quick tour overview */}
      <section className="bg-surface-container-low rounded-3xl p-5 md:p-6">
        <header className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-extrabold text-lg text-on-surface">
            Tour của bạn
          </h3>
          <span className="text-xs text-on-surface-variant">
            {mockDashboardTours.length} tour ·{' '}
            {mockDashboardTours.filter((t) => t.status === 'active').length} đang hoạt động
          </span>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {mockDashboardTours.slice(0, 4).map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 p-2 bg-surface-container-lowest rounded-2xl"
            >
              <img
                src={t.coverImage}
                alt={t.title}
                className="w-16 h-16 object-cover rounded-xl flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-on-surface text-sm truncate">
                  {t.title}
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  {t.bookingsCount} booking · ⭐ {t.rating || '-'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
