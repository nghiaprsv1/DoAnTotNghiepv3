import axiosInstance from './axiosInstance'
import { unwrap, unwrapList } from './unwrap'
import type { ApiResponse, PaginatedResponse } from '@types/common'
import type { Place, PlaceCategory } from '@types/place'

interface BackendPlace {
  id: string
  name: string
  slug: string
  description: string
  longDescription?: string
  category: { id?: string; key: PlaceCategory; label: string; icon?: string }
  province: { id: string; name: string; slug: string; region?: string }
  city?: string
  address?: string
  coverImage: string
  gallery?: { url: string; sortOrder?: number }[]
  rating: string | number
  reviewCount: number
  entranceFee?: string
  tags?: string[]
}

const adaptPlace = (b: BackendPlace): Place => ({
  id: b.id,
  name: b.name,
  slug: b.slug,
  description: b.description,
  longDescription: b.longDescription,
  category: b.category?.key ?? 'culture',
  province: b.province?.name ?? '',
  city: b.city,
  address: b.address,
  coverImage: b.coverImage,
  gallery: (b.gallery ?? []).map((g) => g.url),
  rating: Number(b.rating ?? 0),
  reviewCount: b.reviewCount ?? 0,
  entranceFee: b.entranceFee,
  tags: b.tags ?? [],
})

export const placeService = {
  list: async (params?: {
    category?: string
    province?: string
    keyword?: string
    page?: number
    pageSize?: number
  }): Promise<Place[]> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<BackendPlace>>>(
      '/places',
      { params },
    )
    return unwrapList(res).map(adaptPlace)
  },

  /**
   * Admin list — returns the raw backend rows (keeps category/province ids so
   * the edit form can prefill the select boxes). The public `list` flattens
   * those away for display.
   */
  listRaw: async (params?: {
    keyword?: string
    page?: number
    pageSize?: number
  }): Promise<AdminPlaceRow[]> => {
    const res = await axiosInstance.get<ApiResponse<PaginatedResponse<BackendPlace>>>(
      '/places',
      { params: { ...params, pageSize: params?.pageSize ?? 100 } },
    )
    return unwrapList(res).map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      longDescription: b.longDescription,
      categoryId: (b.category as { id?: string })?.id,
      categoryLabel: b.category?.label ?? '',
      provinceId: b.province?.id,
      provinceName: b.province?.name ?? '',
      city: b.city,
      address: b.address,
      coverImage: b.coverImage,
      gallery: (b.gallery ?? []).map((g) => g.url),
      entranceFee: b.entranceFee,
      tags: b.tags ?? [],
      rating: Number(b.rating ?? 0),
    }))
  },

  getById: async (id: string): Promise<Place> => {
    const res = await axiosInstance.get<ApiResponse<BackendPlace>>(`/places/${id}`)
    return adaptPlace(unwrap(res))
  },

  getBySlug: async (slug: string): Promise<Place> => {
    const res = await axiosInstance.get<ApiResponse<BackendPlace>>(`/places/slug/${slug}`)
    return adaptPlace(unwrap(res))
  },

  categories: async (): Promise<{ id: string; key: string; label: string; icon?: string }[]> => {
    const res = await axiosInstance.get<
      ApiResponse<{ id: string; key: string; label: string; icon?: string }[]>
    >('/places/categories')
    return unwrap(res)
  },

  provinces: async (): Promise<{ id: string; name: string; slug: string; region?: string }[]> => {
    const res = await axiosInstance.get<
      ApiResponse<{ id: string; name: string; slug: string; region?: string }[]>
    >('/places/provinces')
    return unwrap(res)
  },

  /** Admin — create a place. */
  create: async (payload: AdminPlacePayload): Promise<Place> => {
    const res = await axiosInstance.post<ApiResponse<BackendPlace>>('/places', payload)
    return adaptPlace(unwrap(res))
  },

  /** Admin — update a place. */
  update: async (id: string, payload: AdminPlacePayload): Promise<Place> => {
    const res = await axiosInstance.put<ApiResponse<BackendPlace>>(`/places/${id}`, payload)
    return adaptPlace(unwrap(res))
  },

  /** Admin — delete a place. */
  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/places/${id}`)
  },
}

/** Payload the admin place form sends to the BE (matches CreatePlaceDto). */
export interface AdminPlacePayload {
  name: string
  slug: string
  description: string
  longDescription?: string
  categoryId: string
  provinceId: string
  city?: string
  address?: string
  coverImage: string
  gallery?: string[]
  entranceFee?: string
  tags?: string[]
  rating?: number
}

/** Raw place row for the admin table/edit form (keeps ids for prefill). */
export interface AdminPlaceRow {
  id: string
  name: string
  slug: string
  description: string
  longDescription?: string
  categoryId?: string
  categoryLabel: string
  provinceId?: string
  provinceName: string
  city?: string
  address?: string
  coverImage: string
  gallery: string[]
  entranceFee?: string
  tags: string[]
  rating: number
}
