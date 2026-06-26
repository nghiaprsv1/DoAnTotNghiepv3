import type { NotificationType } from '@types/notification'

/**
 * Material symbol icon name per notification type — pure UI mapping,
 * decoupled from any mock dataset.
 */
export const NOTIFICATION_ICON: Record<NotificationType, string> = {
  booking_new: 'event_available',
  booking_confirmed: 'check_circle',
  booking_cancelled: 'event_busy',
  review_new: 'star',
  comment: 'chat_bubble',
  like: 'favorite',
  follow: 'person_add',
  payout: 'payments',
  message: 'mail',
  system: 'campaign',
  guide_application: 'workspace_premium',
  trip_update: 'flight_takeoff',
  trip_join_request: 'group_add',
  trip_join_accepted: 'how_to_reg',
  trip_join_rejected: 'person_off',
  trip_cancelled: 'cancel',
}

/** Tailwind tone class per notification type. */
export const NOTIFICATION_TONE: Record<NotificationType, string> = {
  booking_new: 'bg-amber-500/15 text-amber-700',
  booking_confirmed: 'bg-green-500/15 text-green-700',
  booking_cancelled: 'bg-error/10 text-error',
  review_new: 'bg-primary/10 text-primary',
  comment: 'bg-secondary/10 text-secondary',
  like: 'bg-rose-500/15 text-rose-600',
  follow: 'bg-tertiary/10 text-tertiary',
  payout: 'bg-green-500/15 text-green-700',
  message: 'bg-primary/10 text-primary',
  system: 'bg-on-surface/10 text-on-surface',
  guide_application: 'editorial-gradient text-on-primary',
  trip_update: 'bg-primary/10 text-primary',
  trip_join_request: 'bg-amber-500/15 text-amber-700',
  trip_join_accepted: 'bg-green-500/15 text-green-700',
  trip_join_rejected: 'bg-error/10 text-error',
  trip_cancelled: 'bg-error/10 text-error',
}
