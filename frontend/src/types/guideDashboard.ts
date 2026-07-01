/**
 * Domain types for Guide Dashboard / Detail screens.
 * Decoupled from any mock dataset so pure-API code can import them.
 */

export interface GuideTourHistory {
  id: string
  title: string
  destination: string
  coverImage: string
  date: string
  durationDays: number
  groupSize: number
  rating: number
  category: string
}

/** Khoảng ngày nghỉ HDV tự đánh dấu (manual block). */
export interface GuideUnavailability {
  id: string
  startDate: string
  endDate: string
  note?: string | null
}

export interface GuideReview {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  rating: number
  date: string
  content: string
  tourTitle?: string
  helpfulCount?: number
  isHelpful?: boolean
  reply?: { content: string; date: string }
}

import type { BookingStatus } from './booking'

export interface DashboardBooking {
  id: string
  /** Customer/Traveler id — for "Xem hồ sơ" / DM jumps. */
  customerId?: string
  customerName: string
  customerAvatar: string
  tourTitle: string
  destination: string
  date: string
  durationDays: number
  groupSize: number
  amount: number
  status: BookingStatus
  createdAt: string
  /** Optional traveler-supplied note. */
  message?: string
}

export interface Payout {
  id: string
  amount: number
  date: string
  method: string
  status: 'paid' | 'processing' | 'failed'
}

export interface RevenueMonth {
  month: string
  amount: number
  bookings: number
}

export interface DashboardTour {
  id: string
  title: string
  destination: string
  coverImage: string
  category: string
  pricePerDay: number
  rating: number
  bookingsCount: number
  status: 'active' | 'paused' | 'draft'
}
