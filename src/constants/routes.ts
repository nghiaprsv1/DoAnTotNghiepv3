// Route path constants
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  TRIPS: '/trips',
  TRIP_DETAIL: '/trips/:id',
  TRIP_CREATE: '/trips/create',
  TRIP_EDIT: '/trips/:id/edit',
  TRIP_JOINED: '/trips/:id/joined',
  PROFILE: '/profile',
  PROFILE_EDIT: '/profile/edit',
  MESSAGES: '/messages',
  MESSAGE_THREAD: '/messages/:id',
  SOCIAL: '/social',
  GUIDES: '/guides',
  GUIDE_APPLY: '/guides/apply',
  GUIDE_DETAIL: '/guides/:id',
  GUIDE_DASHBOARD: '/guide/dashboard',
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_DETAIL: '/notifications/:id',
  PLACES: '/places',
  PLACE_DETAIL: '/places/:id',
  MY_BOOKINGS: '/my-bookings',
  BOOKING_DETAIL: '/bookings/:id',
  WALLET: '/wallet',
  USER_PROFILE: '/users/:id',
  USER_FOLLOWERS: '/users/:id/followers',
  USER_FOLLOWING: '/users/:id/following',
  ADMIN: '/admin',
  ADMIN_USERS: '/admin/users',
  ADMIN_GUIDES: '/admin/guides',
  ADMIN_WITHDRAWALS: '/admin/withdrawals',
  ADMIN_REVENUE: '/admin/revenue',
  ADMIN_NOTIFICATIONS: '/admin/notifications',
  ADMIN_POSTS: '/admin/posts',
  ADMIN_TRIPS: '/admin/trips',
  ADMIN_PLACES: '/admin/places',
  DASHBOARD: '/dashboard',
  SETTINGS: '/settings',
  NOT_FOUND: '*',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

// Helpers for dynamic paths
export const tripDetailPath = (id: string) => `/trips/${id}`
export const tripEditPath = (id: string) => `/trips/${id}/edit`
export const tripJoinedPath = (id: string) => `/trips/${id}/joined`
export const messageThreadPath = (id: string) => `/messages/${id}`
export const guideDetailPath = (id: string) => `/guides/${id}`
export const bookingDetailPath = (id: string) => `/bookings/${id}`
export const notificationDetailPath = (id: string) => `/notifications/${id}`
export const placeDetailPath = (id: string) => `/places/${id}`
export const userProfilePath = (id: string) => `/users/${id}`
export const userFollowersPath = (id: string) => `/users/${id}/followers`
export const userFollowingPath = (id: string) => `/users/${id}/following`
