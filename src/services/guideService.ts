import axiosInstance from './axiosInstance'
import { unwrap, unwrapList } from './unwrap'
import type { ApiResponse, PaginatedResponse } from '@types/common'
import type { HireableGuide } from '@types/trip'

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
  responseTime?: string
  availability: HireableGuide['availability']
  availabilityLabel?: string
  highlights?: string[]
  coverImage?: string
  galleryUrls?: string[]
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
  coverImage:
    b.coverImage ??
    'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
  gallery: b.galleryUrls ?? [],
  pricePerDay: Number(b.pricePerDay ?? 0),
  currency: b.currency,
  availability: b.availability,
  availabilityLabel: b.availabilityLabel,
  toursCompleted: b.toursCompleted,
  responseTime: b.responseTime,
  highlights: b.highlights ?? [],
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
  }): Promise<unknown> => {
    const res = await axiosInstance.post<ApiResponse<unknown>>('/guides/apply', body)
    return unwrap(res)
  },
}
