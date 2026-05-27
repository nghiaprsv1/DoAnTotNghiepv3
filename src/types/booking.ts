// Booking types — used by both traveler (/my-bookings) and guide (dashboard)

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

export interface BookingGuideInfo {
  id: string
  name: string
  avatar: string
  region: string
  rating: number
}

export interface TravelerBooking {
  id: string
  guide: BookingGuideInfo
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
}
