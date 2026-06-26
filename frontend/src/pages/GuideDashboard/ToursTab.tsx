import { useMemo } from 'react'
import { Icon } from '@components/ui/Icon'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useMyBookingsAsGuide } from '@hooks/useBookings'
import { BookingRow } from './components/BookingRow'
import type { TravelerBooking } from '@types/booking'
import type { DashboardBooking } from '@types/guideDashboard'

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

function isUpcoming(date: string) {
  const d = new Date(date).getTime()
  return d >= Date.now() - 86400000 // include today
}

/**
 * "Tour của tôi" — operational schedule for the guide. Splits confirmed
 * bookings into a "Sắp diễn ra" agenda and an archive of past completed
 * tours so the guide can plan and finalise them in one place.
 */
export function ToursTab() {
  const { data: rawBookings, isLoading } = useMyBookingsAsGuide()
  const bookings = useMemo(() => (rawBookings ?? []).map(adapt), [rawBookings])

  const confirmed = bookings.filter((b) => b.status === 'confirmed')
  const upcoming = confirmed
    .filter((b) => isUpcoming(b.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const past = bookings
    .filter((b) => b.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 12)

  return (
    <div className="space-y-6">
      <header>
        <h2 className="font-headline font-extrabold text-2xl text-on-surface">Tour của tôi</h2>
        <p className="text-sm text-on-surface-variant">
          Lịch sắp diễn ra và lịch sử tour. Bấm <b>Hoàn thành</b> sau khi kết thúc tour để giải
          ngân 90% (10% là phí nền tảng).
        </p>
      </header>

      {isLoading ? (
        <LoadingState count={3} />
      ) : (
        <>
          <section>
            <header className="flex items-center justify-between mb-3">
              <h3 className="font-headline font-extrabold text-lg text-on-surface flex items-center gap-2">
                <Icon name="event_upcoming" className="text-primary" />
                Sắp diễn ra
                <span className="text-sm font-bold text-on-surface-variant">
                  · {upcoming.length}
                </span>
              </h3>
            </header>
            {upcoming.length === 0 ? (
              <EmptyState
                icon="event_busy"
                title="Chưa có lịch sắp diễn ra"
                description="Khi khách thanh toán, tour sẽ xuất hiện ở đây để bạn theo dõi và đánh dấu hoàn thành."
              />
            ) : (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingRow key={b.id} booking={b} showActions />
                ))}
              </div>
            )}
          </section>

          <section>
            <header className="flex items-center justify-between mb-3">
              <h3 className="font-headline font-extrabold text-lg text-on-surface flex items-center gap-2">
                <Icon name="history" className="text-on-surface-variant" />
                Đã hoàn thành
                <span className="text-sm font-bold text-on-surface-variant">
                  · {past.length}
                </span>
              </h3>
            </header>
            {past.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">
                Chưa có tour nào hoàn thành.
              </p>
            ) : (
              <div className="space-y-3">
                {past.map((b) => (
                  <BookingRow key={b.id} booking={b} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
