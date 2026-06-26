import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse, PaginatedResponse } from '@types/common'
import type { UserRole } from '@types/user'
import type { WalletTransaction } from './walletService'

/* ───────────────────────── DTOs ───────────────────────── */

export interface AdminDashboard {
  totalUsers: number
  totalGuides: number
  pendingGuides: number
  totalPosts: number
  totalTrips: number
  tripsPublished: number
  bookingsCompleted: number
  /** 10% commission of completed bookings, in VND. */
  commissionRevenue: number
  /** User signup breakdown over time. */
  users: {
    total: number
    newThisMonth: number
    newPrevMonth: number
    newLast7Days: number
    /** Month-over-month growth %, null when previous month had 0 signups. */
    growthPct: number | null
  }
  posts: {
    total: number
    newThisMonth: number
  }
  trips: {
    total: number
    published: number
    newThisMonth: number
  }
}

export interface RevenueDailyBucket {
  day: string
  bookings: number
  gross: number
  commission: number
}

export interface RevenueBookingRow {
  bookingId: string
  tourTitle: string
  gross: number
  commission: number
  net: number
  completedAt: string
  guide: { id: string; name: string; avatar?: string }
  traveler: { id: string; name: string; avatar?: string }
}

export interface RevenueGuideRow {
  userId: string
  name: string
  avatar?: string
  bookings: number
  gross: number
  commission: number
}

export interface MoneyFlowEntry {
  total: number
  count: number
}

export interface RevenueReport {
  from: string | null
  to: string | null
  totals: {
    gross: number
    commission: number
    net: number
    bookingsCompleted: number
  }
  moneyFlow: {
    topUp: MoneyFlowEntry
    payment: MoneyFlowEntry
    commission: MoneyFlowEntry
    withdrawSuccess: MoneyFlowEntry
    withdrawPending: MoneyFlowEntry
    refund: MoneyFlowEntry
  }
  daily: RevenueDailyBucket[]
  topGuides: RevenueGuideRow[]
  breakdown: RevenueBookingRow[]
}

export interface AdminWalletRow {
  id: string
  balanceAvailable: number
  balanceFrozen: number
  currency: string
  role: string
  user: { id: string; name: string; email: string; avatar?: string }
}

export interface AdminUser {
  id: string
  email: string
  handle?: string
  name: string
  avatar?: string
  role: UserRole
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

export interface PendingGuide {
  id: string
  userId: string
  region?: string
  regionKeys?: string[]
  categoryKeys?: string[]
  languages?: string[]
  specialties?: string[]
  bio?: string
  yearsExperience?: number
  pricePerDay?: number
  currency?: string
  availability?: string
  availabilityLabel?: string
  idCardNumber?: string
  idCardImage?: string
  certificateImages?: string[]
  status: string
  createdAt: string
  user?: { id: string; name: string; email: string; avatar?: string; phone?: string }
}

export interface PendingWithdrawal extends WalletTransaction {
  user: { id: string; name: string; email: string; avatar?: string }
}

export interface AdminUsersQuery {
  page?: number
  pageSize?: number
  role?: UserRole | string
  search?: string
  status?: 'active' | 'banned'
}

export interface AdminPostRow {
  id: string
  title: string
  excerpt: string
  image: string
  location: string
  visibility: string
  likeCount: number
  commentCount: number
  createdAt: string
  author: { id: string; name: string; email: string; avatar?: string } | null
}

export interface AdminTripRow {
  id: string
  title: string
  destination: string
  coverImage: string
  startDate: string
  endDate: string
  durationDays: number
  maxMembers: number
  memberCount: number
  status: string
  priceFrom: number
  currency: string
  createdAt: string
  creator: { id: string; name: string; avatar?: string } | null
  guide: { id: string; name: string; avatar?: string } | null
}

export interface AdminListQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}

export interface BulkTopUpResult {
  requested: number
  succeeded: number
  failed: number
  failures: Array<{ userId: string; reason: string }>
  totalCredited: number
}

export interface RegistrationPoint {
  date: string
  count: number
}

export interface RegistrationStats {
  granularity: 'day' | 'week' | 'month'
  total: number
  series: RegistrationPoint[]
}

export interface GuideRevenueDetail {
  guide: {
    id: string
    userId: string
    name: string
    avatar: string
    region: string
    pricePerDay: number
    currency: string
  }
  summary: {
    totalBookings: number
    completedBookings: number
    cancelledBookings: number
    grossRevenue: number
    commission: number
    netEarnings: number
  }
  bookings: Array<{
    id: string
    tourTitle: string
    destination: string
    startDate: string
    endDate?: string
    amount: number
    status: string
    createdAt: string
    completedAt?: string | null
  }>
}

/* ───────────────────────── Service ───────────────────────── */

export const adminService = {
  dashboard: async (): Promise<AdminDashboard> => {
    const res = await axiosInstance.get<ApiResponse<AdminDashboard>>('/admin/dashboard')
    return unwrap(res)
  },

  revenue: async (start?: string, end?: string): Promise<RevenueReport> => {
    const res = await axiosInstance.get<ApiResponse<RevenueReport>>('/admin/revenue', {
      params: { startDate: start, endDate: end },
    })
    return unwrap(res)
  },

  pendingGuides: async (): Promise<PendingGuide[]> => {
    const res = await axiosInstance.get<ApiResponse<PendingGuide[]>>('/admin/guides/pending')
    return unwrap(res)
  },

  approveGuide: async (id: string): Promise<void> => {
    await axiosInstance.post(`/guides/${id}/approve`)
  },

  rejectGuide: async (id: string, reason?: string): Promise<void> => {
    await axiosInstance.post(`/guides/${id}/reject`, { reason })
  },

  users: async (q: AdminUsersQuery = {}): Promise<PaginatedResponse<AdminUser>> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<AdminUser>>>(
      '/admin/users',
      { params: q },
    )
    return unwrap(res)
  },

  lockUser: async (id: string): Promise<void> => {
    await axiosInstance.post(`/admin/users/${id}/lock`)
  },

  unlockUser: async (id: string): Promise<void> => {
    await axiosInstance.post(`/admin/users/${id}/unlock`)
  },

  pendingWithdrawals: async (): Promise<PendingWithdrawal[]> => {
    const res = await axiosInstance.get<ApiResponse<PendingWithdrawal[]>>(
      '/guides/wallet/withdrawals/pending',
    )
    return unwrap(res)
  },

  decideWithdrawal: async (
    id: string,
    action: 'approve' | 'reject',
    reason?: string,
  ): Promise<void> => {
    await axiosInstance.put(`/guides/wallet/withdrawals/${id}`, { action, reason })
  },

  broadcastNotification: async (input: {
    title: string
    content: string
    receiverId?: string
    sendToAll?: boolean
    image?: string
  }): Promise<{ delivered: number }> => {
    const res = await axiosInstance.post<ApiResponse<{ delivered: number }>>(
      '/admin/notifications',
      input,
    )
    return unwrap(res)
  },

  /** Fetch wallet snapshots across the platform (sortable by balance). */
  wallets: async (search?: string, page = 1, pageSize = 30): Promise<AdminWalletRow[]> => {
    const res = await axiosInstance.get<ApiResponse<AdminWalletRow[]>>('/admin/wallets', {
      params: { search, page, pageSize },
    })
    return unwrap(res)
  },

  /** Admin credits any user's wallet — replaces the missing payment gateway. */
  topUpUser: async (
    userId: string,
    amount: number,
    note?: string,
  ): Promise<WalletTransaction> => {
    const res = await axiosInstance.post<ApiResponse<WalletTransaction>>(
      '/admin/wallets/topup',
      { userId, amount, note },
    )
    return unwrap(res)
  },

  /** Bulk credit — top up many users with the same amount in one call. */
  topUpManyUsers: async (
    userIds: string[],
    amount: number,
    note?: string,
  ): Promise<BulkTopUpResult> => {
    const res = await axiosInstance.post<ApiResponse<BulkTopUpResult>>(
      '/admin/wallets/topup-bulk',
      { userIds, amount, note },
    )
    return unwrap(res)
  },

  /** Registration timeline for marketing analytics. */
  registrationStats: async (
    granularity: 'day' | 'week' | 'month' = 'day',
    start?: string,
    end?: string,
  ): Promise<RegistrationStats> => {
    const res = await axiosInstance.get<ApiResponse<RegistrationStats>>(
      '/admin/stats/registrations',
      { params: { granularity, startDate: start, endDate: end } },
    )
    return unwrap(res)
  },

  /** Detailed revenue breakdown for a single guide. */
  guideRevenueDetail: async (guideId: string): Promise<GuideRevenueDetail> => {
    const res = await axiosInstance.get<ApiResponse<GuideRevenueDetail>>(
      `/admin/guides/${guideId}/revenue`,
    )
    return unwrap(res)
  },

  /** Cross-platform feed listing for admin moderation (sees PUBLIC + FRIENDS). */
  posts: async (q: AdminListQuery = {}): Promise<PaginatedResponse<AdminPostRow>> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<AdminPostRow>>>(
      '/admin/posts',
      { params: q },
    )
    return unwrap(res)
  },

  /** Force-delete a post regardless of author. */
  deletePost: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/admin/posts/${id}`)
  },

  /** Read-only listing of every trip on the platform. */
  trips: async (q: AdminListQuery = {}): Promise<PaginatedResponse<AdminTripRow>> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<AdminTripRow>>>(
      '/admin/trips',
      { params: q },
    )
    return unwrap(res)
  },
}
