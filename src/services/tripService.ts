import axiosInstance from './axiosInstance'
import { unwrap, unwrapList } from './unwrap'
import type { ApiResponse, PaginatedResponse } from '@types/common'
import type {
  ItineraryActivity,
  ItineraryDay,
  JoinRequestStatus,
  PendingJoinRequest,
  Trip,
  TripCategory,
  TripInclusions,
  TripMember,
} from '@types/trip'

interface BackendUser {
  id: string
  name: string
  avatar?: string
}

interface BackendCategory {
  key: TripCategory
  label: string
  icon?: string
}

interface BackendTripMember {
  id: string
  userId: string
  user?: BackendUser
  role?: 'leader' | 'member' | 'guide'
  note?: string
}

interface BackendActivity {
  time: string
  title: string
  description?: string
  images?: string[]
  sortOrder?: number
}

interface BackendItineraryDay {
  dayNumber: number
  date: string
  title: string
  activities?: BackendActivity[]
}

interface BackendPendingRequest {
  id: string
  message?: string
  createdAt: string
  user: { id: string; name: string; avatar?: string; handle?: string }
}

interface BackendTrip {
  id: string
  title: string
  description: string
  destination: string
  originName?: string | null
  originLat?: string | number | null
  originLng?: string | number | null
  destinationLat?: string | number | null
  destinationLng?: string | number | null
  category: BackendCategory
  coverImage: string
  galleryUrls?: string[]
  startDate: string
  endDate: string
  durationDays: number
  priceFrom: string | number
  currency: string
  rating: string | number
  maxMembers: number
  memberCount: number
  creator: BackendUser
  guide?: BackendUser | null
  tags?: string[]
  inclusions?: TripInclusions | null
  members?: BackendTripMember[]
  itinerary?: BackendItineraryDay[]
  status?: string
  isJoined?: boolean
  isOwner?: boolean
  joinRequestStatus?: JoinRequestStatus | null
  pendingRequests?: BackendPendingRequest[]
  isSaved?: boolean
  recommendScore?: number
  recommendReasons?: string[]
}

const toMember = (m: BackendTripMember): TripMember => ({
  id: m.userId,
  name: m.user?.name ?? 'Member',
  avatar: m.user?.avatar ?? '',
  role: m.role,
  note: m.note,
})

const toActivity = (a: BackendActivity): ItineraryActivity => ({
  time: a.time,
  title: a.title,
  description: a.description,
  images: a.images,
})

const toItineraryDay = (d: BackendItineraryDay): ItineraryDay => ({
  dayNumber: d.dayNumber,
  date: d.date,
  title: d.title,
  activities: (d.activities ?? []).map(toActivity),
})

const toPendingRequest = (r: BackendPendingRequest): PendingJoinRequest => ({
  id: r.id,
  message: r.message,
  createdAt: r.createdAt,
  user: {
    id: r.user.id,
    name: r.user.name,
    avatar: r.user.avatar ?? '',
    handle: r.user.handle,
  },
})

const numOrNull = (v: string | number | null | undefined): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v)

export const adaptTrip = (b: BackendTrip): Trip => ({
  id: b.id,
  title: b.title,
  description: b.description,
  destination: b.destination,
  originName: b.originName ?? null,
  originLat: numOrNull(b.originLat),
  originLng: numOrNull(b.originLng),
  destinationLat: numOrNull(b.destinationLat),
  destinationLng: numOrNull(b.destinationLng),
  category: b.category?.key ?? 'culture',
  coverImage: b.coverImage,
  gallery: b.galleryUrls,
  startDate: b.startDate,
  endDate: b.endDate,
  durationDays: b.durationDays,
  priceFrom: Number(b.priceFrom),
  currency: b.currency,
  rating: Number(b.rating),
  maxMembers: b.maxMembers,
  memberCount: b.memberCount,
  members: (b.members ?? []).map(toMember),
  creator: {
    id: b.creator.id,
    name: b.creator.name,
    avatar: b.creator.avatar ?? '',
  },
  guide: b.guide
    ? {
        id: b.guide.id,
        name: b.guide.name,
        avatar: b.guide.avatar ?? '',
        region: '',
        rating: 0,
      }
    : undefined,
  tags: b.tags ?? [],
  inclusions: b.inclusions ?? undefined,
  itinerary: (b.itinerary ?? []).map(toItineraryDay),
  isJoined: b.isJoined,
  isOwner: b.isOwner,
  status: b.status as Trip['status'] | undefined,
  joinRequestStatus: b.joinRequestStatus ?? null,
  pendingRequests: b.pendingRequests ? b.pendingRequests.map(toPendingRequest) : undefined,
  isSaved: b.isSaved,
  recommendScore: b.recommendScore,
  recommendReasons: b.recommendReasons,
})

/** Payload for `POST /trips`. Mirrors backend `CreateTripDto`. */
export interface CreateTripPayload {
  title: string
  description: string
  destination: string
  originName?: string
  originLat?: number
  originLng?: number
  destinationLat?: number
  destinationLng?: number
  categoryId: string
  coverImage: string
  galleryUrls?: string[]
  startDate: string
  endDate: string
  durationDays: number
  priceFrom?: number
  currency?: string
  maxMembers: number
  tags?: string[]
  inclusions?: TripInclusions
  itinerary?: {
    dayNumber: number
    date: string
    title: string
    activities?: { time: string; title: string; description?: string; images?: string[] }[]
  }[]
}

/** Payload for `PUT /trips/:id`. Mirrors backend `UpdateTripDto` (all optional). */
export type UpdateTripPayload = Partial<Omit<CreateTripPayload, 'itinerary'>>

export const tripService = {
  list: async (params?: {
    creatorId?: string
    search?: string
    destination?: string
    category?: string
    page?: number
    pageSize?: number
  }): Promise<Trip[]> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<BackendTrip>>>('/trips', {
      params,
    })
    return unwrapList(res).map(adaptTrip)
  },

  getById: async (id: string): Promise<Trip> => {
    const res = await axiosInstance.get<ApiResponse<BackendTrip>>(`/trips/${id}`)
    return adaptTrip(unwrap(res))
  },

  create: async (payload: CreateTripPayload): Promise<Trip> => {
    const res = await axiosInstance.post<ApiResponse<BackendTrip>>('/trips', payload)
    return adaptTrip(unwrap(res))
  },

  update: async (id: string, payload: UpdateTripPayload): Promise<Trip> => {
    const res = await axiosInstance.put<ApiResponse<BackendTrip>>(`/trips/${id}`, payload)
    return adaptTrip(unwrap(res))
  },

  cancel: async (id: string): Promise<Trip> => {
    const res = await axiosInstance.post<ApiResponse<BackendTrip>>(`/trips/${id}/cancel`)
    return adaptTrip(unwrap(res))
  },

  join: async (
    id: string,
    message?: string,
  ): Promise<{ status: JoinRequestStatus }> => {
    const res = await axiosInstance.post<ApiResponse<{ status: JoinRequestStatus }>>(
      `/trips/${id}/join`,
      message ? { message } : {},
    )
    return unwrap(res)
  },

  leave: async (id: string): Promise<{ memberCount: number }> => {
    const res = await axiosInstance.post<ApiResponse<{ memberCount: number }>>(
      `/trips/${id}/leave`,
    )
    return unwrap(res)
  },

  acceptJoinRequest: async (tripId: string, requestId: string): Promise<unknown> => {
    const res = await axiosInstance.post<ApiResponse<unknown>>(
      `/trips/${tripId}/requests/${requestId}/accept`,
    )
    return unwrap(res)
  },

  rejectJoinRequest: async (tripId: string, requestId: string): Promise<unknown> => {
    const res = await axiosInstance.post<ApiResponse<unknown>>(
      `/trips/${tripId}/requests/${requestId}/reject`,
    )
    return unwrap(res)
  },

  myCreated: async (): Promise<Trip[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendTrip[]>>('/trips/mine/created')
    return unwrap(res).map(adaptTrip)
  },

  myJoined: async (): Promise<Trip[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendTrip[]>>('/trips/mine/joined')
    return unwrap(res).map(adaptTrip)
  },

  /**
   * Personalised recommendations based on the user's stored TravelPreferences.
   * Anonymous users still receive a list (sorted by rating).
   */
  recommended: async (limit = 6): Promise<Trip[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendTrip[]>>('/trips/recommended', {
      params: { limit },
    })
    return unwrap(res).map(adaptTrip)
  },

  /** Replace the trip's itinerary (owner-only). Mirrors backend `PUT /trips/:id/itinerary`. */
  saveItinerary: async (
    id: string,
    days: {
      dayNumber: number
      date: string
      title: string
      activities?: { time: string; title: string; description?: string }[]
    }[],
  ): Promise<Trip> => {
    const res = await axiosInstance.put<ApiResponse<BackendTrip>>(
      `/trips/${id}/itinerary`,
      { days },
    )
    return adaptTrip(unwrap(res))
  },
}
