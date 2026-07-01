import axiosInstance from './axiosInstance'
import { unwrap, unwrapList } from './unwrap'
import type { ApiResponse, PaginatedResponse } from '@types/common'
import type { HireableGuide } from '@types/trip'
import type { GuideTourHistory, GuideUnavailability } from '@types/guideDashboard'

interface BackendGuide {
  id: string
  userId: string
  user: {
    id: string
    name: string
    avatar?: string
    verified?: boolean
  }
  region: string
  regionKeys?: string[]
  categoryKeys?: HireableGuide['categoryKeys']
  languages?: string[]
  specialties?: string[]
  bio?: string
  yearsExperience?: number
  pricePerDay: string | number
  currency: string
  rating: string | number
  reviewCount: number
  toursCompleted?: number
  availability: HireableGuide['availability']
  availabilityLabel?: string
}

export const adaptGuide = (b: BackendGuide): HireableGuide => ({
  id: b.id,
  userId: b.userId ?? b.user?.id,
  name: b.user?.name ?? 'Hướng dẫn viên',
  avatar: b.user?.avatar ?? '',
  verified: b.user?.verified,
  region: b.region,
  rating: Number(b.rating ?? 0),
  reviewCount: b.reviewCount ?? 0,
  yearsExperience: b.yearsExperience,
  languages: b.languages ?? [],
  specialties: b.specialties ?? [],
  bio: b.bio,
  pricePerDay: Number(b.pricePerDay ?? 0),
  currency: b.currency,
  availability: b.availability,
  availabilityLabel: b.availabilityLabel,
  toursCompleted: b.toursCompleted,
  regionKeys: b.regionKeys ?? [],
  categoryKeys: b.categoryKeys ?? [],
})

export const guideService = {
  list: async (params?: {
    region?: string
    category?: string
    availability?: string
    language?: string
    availableFrom?: string
    availableTo?: string
  }): Promise<HireableGuide[]> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<BackendGuide>>>(
      '/guides',
      { params },
    )
    return unwrapList(res).map(adaptGuide)
  },

  getById: async (id: string): Promise<HireableGuide> => {
    const res = await axiosInstance.get<ApiResponse<BackendGuide>>(`/guides/${id}`)
    return adaptGuide(unwrap(res))
  },

  /** Return active booking ranges for the guide so the FE can disable busy dates. */
  busyDates: async (
    id: string,
  ): Promise<Array<{ startDate: string; endDate: string }>> => {
    const res = await axiosInstance.get<
      ApiResponse<Array<{ startDate: string; endDate: string }>>
    >(`/guides/${id}/busy-dates`)
    return unwrap(res)
  },

  /** Lịch sử tour đã hoàn thành của HDV (tab "Lịch sử tour"). */
  tourHistory: async (id: string): Promise<GuideTourHistory[]> => {
    const res = await axiosInstance.get<ApiResponse<GuideTourHistory[]>>(
      `/guides/${id}/tour-history`,
    )
    return unwrap(res)
  },

  /** Ngày nghỉ HDV tự đánh dấu — của chính mình. */
  myUnavailability: async (): Promise<GuideUnavailability[]> => {
    const res = await axiosInstance.get<ApiResponse<GuideUnavailability[]>>(
      '/guides/me/unavailability',
    )
    return unwrap(res)
  },

  /** Thêm 1 khoảng ngày nghỉ. */
  addUnavailability: async (body: {
    startDate: string
    endDate: string
    note?: string
  }): Promise<GuideUnavailability> => {
    const res = await axiosInstance.post<ApiResponse<GuideUnavailability>>(
      '/guides/me/unavailability',
      body,
    )
    return unwrap(res)
  },

  /** Gỡ 1 khoảng ngày nghỉ. */
  removeUnavailability: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/guides/me/unavailability/${id}`)
  },

  apply: async (body: {
    region: string
    regionKeys: string[]
    categoryKeys: string[]
    languages: string[]
    specialties: string[]
    bio?: string
    yearsExperience: number
    pricePerDay: number
    currency: string
    idCardNumber: string
    idCardImage?: string
    certificateImages?: string[]
  }): Promise<unknown> => {
    const res = await axiosInstance.post<ApiResponse<unknown>>('/guides/apply', body)
    return unwrap(res)
  },

  /** The signed-in guide's own profile (any approval status). */
  getMyProfile: async (): Promise<HireableGuide> => {
    const res = await axiosInstance.get<ApiResponse<BackendGuide>>('/guides/me/profile')
    return adaptGuide(unwrap(res))
  },

  /** Update the signed-in guide's own professional profile. */
  updateMyProfile: async (body: {
    region?: string
    regionKeys?: string[]
    categoryKeys?: string[]
    languages?: string[]
    specialties?: string[]
    bio?: string
    yearsExperience?: number
    pricePerDay?: number
    currency?: string
  }): Promise<HireableGuide> => {
    const res = await axiosInstance.put<ApiResponse<BackendGuide>>('/guides/me/profile', body)
    return adaptGuide(unwrap(res))
  },
}
