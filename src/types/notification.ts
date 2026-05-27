// Notification domain types

export type NotificationType =
  | 'booking_new'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'review_new'
  | 'comment'
  | 'like'
  | 'follow'
  | 'payout'
  | 'message'
  | 'system'
  | 'guide_application'
  | 'trip_update'

export interface NotificationActor {
  id: string
  name: string
  avatar: string
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  /** Short preview shown in list. */
  preview: string
  /** Long body shown in detail. Optional. */
  body?: string
  /** Human readable timestamp e.g. "2 giờ trước" */
  createdAt: string
  /** ISO date for sorting / detail header */
  isoDate?: string
  read: boolean
  /** Person who triggered the notification (if any). */
  actor?: NotificationActor
  /** Where to navigate when user taps "Xem chi tiết". */
  ctaLabel?: string
  ctaHref?: string
  /** Image attached to the notification (e.g. tour cover). */
  image?: string
  /** Highlighted metadata shown as key/value chips on detail page. */
  meta?: { label: string; value: string; icon?: string }[]
}
