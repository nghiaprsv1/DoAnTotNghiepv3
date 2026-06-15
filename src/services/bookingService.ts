import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'
import type { TravelerBooking } from '@types/booking'

/**
 * Raw shape returned by the BE — eager-loads `guide` (GuideProfile) and
 * `traveler` (User), with `guide.user` joined in at the service layer.
 */
interface BackendBooking {
  id: string
  guideId: string
  travelerId: string
  tripId?: string | null
  tourTitle: string
  tourCover: string
  destination: string
  startDate: string
  endDate?: string
  durationDays: number
  groupSize: number
  amount: string | number
  currency: string
  status: TravelerBooking['status']
  message?: string
  cancelReason?: string
  createdAt: string
  acceptedAt?: string | null
  paidAt?: string | null
  completedAt?: string | null
  guide?: {
    id: string
    userId?: string
    region?: string
    rating?: string | number
    user?: { id: string; name?: string; avatar?: string }
  }
  traveler?: { id: string; name?: string; avatar?: string }
  trip?: {
    id: string
    title: string
    destination: string
    coverImage?: string
    startDate?: string
    endDate?: string
  } | null
}

const adapt = (b: BackendBooking): TravelerBooking => ({
  id: b.id,
  guide: {
    id: b.guide?.id ?? b.guideId,
    userId: b.guide?.userId ?? b.guide?.user?.id,
    name: b.guide?.user?.name ?? 'Hướng dẫn viên',
    avatar: b.guide?.user?.avatar ?? '',
    region: b.guide?.region ?? '',
    rating: Number(b.guide?.rating ?? 0),
  },
  traveler: b.traveler
    ? {
        id: b.traveler.id,
        name: b.traveler.name ?? 'Khách',
        avatar: b.traveler.avatar ?? '',
      }
    : undefined,
  trip: b.trip
    ? {
        id: b.trip.id,
        title: b.trip.title,
        destination: b.trip.destination,
        coverImage: b.trip.coverImage,
        startDate: b.trip.startDate,
        endDate: b.trip.endDate,
      }
    : undefined,
  tourTitle: b.tourTitle,
  tourCover: b.tourCover,
  destination: b.destination,
  startDate: b.startDate,
  endDate: b.endDate,
  durationDays: b.durationDays,
  groupSize: b.groupSize,
  amount: Number(b.amount ?? 0),
  currency: b.currency,
  status: b.status,
  message: b.message,
  cancelReason: b.cancelReason,
  createdAt: b.createdAt,
  acceptedAt: b.acceptedAt ?? undefined,
  paidAt: b.paidAt ?? undefined,
  completedAt: b.completedAt ?? undefined,
})

export const bookingService = {
  myAsTraveler: async (): Promise<TravelerBooking[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendBooking[]>>(
      '/guides/bookings/me/traveler',
    )
    return unwrap(res).map(adapt)
  },

  myAsGuide: async (): Promise<TravelerBooking[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendBooking[]>>(
      '/guides/bookings/me/guide',
    )
    return unwrap(res).map(adapt)
  },

  getById: async (id: string): Promise<TravelerBooking> => {
    const res = await axiosInstance.get<ApiResponse<BackendBooking>>(
      `/guides/bookings/${id}`,
    )
    return adapt(unwrap(res))
  },

  create: async (body: Record<string, unknown>): Promise<TravelerBooking> => {
    const res = await axiosInstance.post<ApiResponse<BackendBooking>>(
      '/guides/bookings',
      body,
    )
    return adapt(unwrap(res))
  },

  respond: async (
    id: string,
    action: 'accept' | 'reject' | 'cancel' | 'complete' | 'pay',
    reason?: string,
  ): Promise<TravelerBooking> => {
    const res = await axiosInstance.put<ApiResponse<BackendBooking>>(
      `/guides/bookings/${id}`,
      { action, reason },
    )
    return adapt(unwrap(res))
  },
}
