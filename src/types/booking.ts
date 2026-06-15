// Booking types — used by both traveler (/my-bookings) and guide (dashboard)

/**
 * Backend state machine (see backend/src/modules/guide/entities/guide-booking.entity.ts):
 *  pending_acceptance → pending_payment → confirmed → completed
 *                    ↘ rejected         ↘ expired   ↘ cancelled
 *
 * `pending` is a legacy value kept for older rows.
 */
export type BookingStatus =
  | 'pending'
  | 'pending_acceptance'
  | 'pending_payment'
  | 'confirmed'
  | 'expired'
  | 'completed'
  | 'cancelled'
  | 'rejected'

export interface BookingGuideInfo {
  id: string
  /** Guide *user* id — useful for DMing the guide. */
  userId?: string
  name: string
  avatar: string
  region: string
  rating: number
}

/** Traveler info attached to a booking — surfaced on the guide-side view. */
export interface BookingTravelerInfo {
  id: string
  name: string
  avatar: string
}

/** Trip the booking is gắn into — surfaced from BE so detail page can link. */
export interface BookingTripInfo {
  id: string
  title: string
  destination: string
  coverImage?: string
  startDate?: string
  endDate?: string
}

export interface TravelerBooking {
  id: string
  guide: BookingGuideInfo
  /** Traveler details — present on the guide-side list. */
  traveler?: BookingTravelerInfo
  /** Trip the booking is gắn into. */
  trip?: BookingTripInfo
  tourTitle: string
  tourCover: string
  destination: string
  startDate: string
  endDate?: string
  durationDays: number
  groupSize: number
  amount: number
  currency: string
  status: BookingStatus
  /** Optional message from traveler when creating */
  message?: string
  createdAt: string
  /** True if traveler already left review for this booking */
  hasReview?: boolean
  /** Cancellation reason (if cancelled) */
  cancelReason?: string
  /** When guide accepted (gates the 24h payment deadline). */
  acceptedAt?: string
  /** When traveler paid (CONFIRMED). */
  paidAt?: string
  /** When trip was completed. */
  completedAt?: string
}
