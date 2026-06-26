import { useMemo } from 'react'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useMyBookingsAsGuide } from '@hooks/useBookings'
import { useMyWallet } from '@hooks/useWallet'
import { StatCard } from './components/StatCard'
import { BookingRow } from './components/BookingRow'
import { RevenueChart } from './components/RevenueChart'
import type { TravelerBooking } from '@types/booking'
import type { DashboardBooking, RevenueMonth } from '@types/guideDashboard'

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

const VND = (n: number) => `₫${Math.round(n).toLocaleString('vi-VN')}`

/** 6-month revenue series from completed bookings (guide-side, 90% net). */
function buildRevenueSeries(bookings: DashboardBooking[]): RevenueMonth[] {
  const months: RevenueMonth[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ month: `T${d.getMonth() + 1}`, amount: 0, bookings: 0 })
  }
  bookings.forEach((b) => {
    if (b.status !== 'completed') return
    const d = new Date(b.createdAt)
    const idx =
      (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()) + 5
    if (idx >= 0 && idx < months.length) {
      months[idx].amount += b.amount * 0.9
      months[idx].bookings += 1
    }
  })
  return months
}

/**
 * "Tổng quan" tab — high-level KPIs (revenue net of 10% commission, frozen
 * balance, pending requests), a 6-month bar chart, plus the 5 most-recent
 * bookings with inline actions.
 */
export function OverviewTab() {
  const { data: rawBookings, isLoading } = useMyBookingsAsGuide()
  const { data: wallet } = useMyWallet()
  const bookings = useMemo(() => (rawBookings ?? []).map(adapt), [rawBookings])

  const completedRevenue = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'completed')
        .reduce((s, b) => s + b.amount * 0.9, 0),
    [bookings],
  )
  const heldAmount = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'confirmed')
        .reduce((s, b) => s + b.amount, 0),
    [bookings],
  )
  const totalBookings = bookings.length
  const completedCount = bookings.filter((b) => b.status === 'completed').length
  const confirmedCount = bookings.filter((b) => b.status === 'confirmed').length
  const pendingCount = bookings.filter(
    (b) => b.status === 'pending' || b.status === 'pending_acceptance',
  ).length
  const series = useMemo(() => buildRevenueSeries(bookings), [bookings])
  const recent = bookings.slice(0, 5)

  const available = wallet ? Number(wallet.wallet.balanceAvailable) : null

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-headline font-extrabold text-2xl text-on-surface">Tổng quan</h2>
        <p className="text-sm text-on-surface-variant">
          Doanh thu thực nhận đã trừ 10% phí nền tảng. Số dư khả dụng có thể rút về ngân hàng.
        </p>
      </header>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon="payments"
          label="Doanh thu (đã hoàn thành)"
          value={VND(completedRevenue)}
          tone="primary"
          delta={`${completedCount} tour`}
        />
        <StatCard
          icon="account_balance_wallet"
          label="Số dư khả dụng"
          value={available != null ? VND(available) : '—'}
          tone="primary"
        />
        <StatCard
          icon="lock_clock"
          label="Đang giữ"
          value={VND(heldAmount)}
          delta={`${confirmedCount} tour`}
        />
        <StatCard
          icon="hourglass_top"
          label="Booking chờ duyệt"
          value={`${pendingCount}`}
          delta={`${totalBookings} tổng`}
        />
      </div>

      {/* Revenue chart */}
      <RevenueChart data={series} />

      {/* Recent bookings */}
      <section className="bg-surface-container-low rounded-3xl p-5 md:p-6">
        <header className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-extrabold text-lg text-on-surface">
            Booking gần đây
          </h3>
          <span className="text-xs text-on-surface-variant">5 đơn mới nhất</span>
        </header>
        {isLoading ? (
          <LoadingState count={2} />
        ) : recent.length === 0 ? (
          <EmptyState
            icon="event_busy"
            title="Chưa có booking nào"
            description="Khi traveler đặt tour với bạn, các yêu cầu sẽ xuất hiện ở đây."
          />
        ) : (
          <div className="space-y-3">
            {recent.map((b) => (
              <BookingRow key={b.id} booking={b} showActions />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
