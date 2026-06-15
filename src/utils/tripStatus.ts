import type { Trip } from '@types/trip'

/**
 * Live trip status derived from `startDate` / `endDate` against today's date.
 *
 * - `cancelled`   — explicitly flagged by the backend (`Trip.status` = cancelled).
 *                   Takes precedence over date logic.
 * - `upcoming`    — the trip hasn't started yet (today < startDate).
 * - `ongoing`     — today is between startDate and endDate (inclusive).
 * - `completed`   — endDate is in the past (today > endDate).
 *
 * Pure function, no I/O. Use the `tripStatusLabel` / `tripStatusTone`
 * helpers below for UI rendering.
 */
export type TripStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

/** Strip time portion so day-precision comparisons are stable across timezones. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** Compute live status. Accepts a partial Trip so it works on cards too. */
export function computeTripStatus(
  trip: Pick<Trip, 'startDate' | 'endDate'> & { status?: string | null },
  now: Date = new Date(),
): TripStatus {
  if (trip.status === 'cancelled') return 'cancelled'

  // Robust to ISO ("2026-06-12") and "YYYY-MM-DD" strings.
  const start = trip.startDate ? new Date(trip.startDate) : null
  const end = trip.endDate ? new Date(trip.endDate) : null
  if (!start || isNaN(start.getTime())) return 'upcoming'

  const today = startOfDay(now)
  const startDay = startOfDay(start)
  const endDay = end && !isNaN(end.getTime()) ? startOfDay(end) : startDay

  if (today < startDay) return 'upcoming'
  if (today > endDay) return 'completed'
  return 'ongoing'
}

/** Vietnamese label for each status. */
export function tripStatusLabel(status: TripStatus): string {
  switch (status) {
    case 'upcoming':
      return 'Sắp diễn ra'
    case 'ongoing':
      return 'Đang diễn ra'
    case 'completed':
      return 'Đã hoàn thành'
    case 'cancelled':
      return 'Đã huỷ'
  }
}

/** Tailwind classes for badge styling — keep tones consistent across cards/detail. */
export function tripStatusTone(status: TripStatus): string {
  switch (status) {
    case 'upcoming':
      return 'bg-secondary-container text-on-secondary-container'
    case 'ongoing':
      // A live, attention-grabbing tone for trips happening right now.
      return 'bg-primary text-on-primary shadow-editorial'
    case 'completed':
      return 'bg-surface-container-high text-on-surface'
    case 'cancelled':
      return 'bg-error/15 text-error'
  }
}

/** Material icon name matching the status tone. */
export function tripStatusIcon(status: TripStatus): string {
  switch (status) {
    case 'upcoming':
      return 'event_upcoming'
    case 'ongoing':
      return 'play_circle'
    case 'completed':
      return 'task_alt'
    case 'cancelled':
      return 'cancel'
  }
}
