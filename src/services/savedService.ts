import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import { adaptPost } from './postService'
import { adaptTrip } from './tripService'
import { adaptGuide } from './guideService'
import type { ApiResponse } from '@types/common'
import type { Post } from '@types/post'
import type { Trip, HireableGuide } from '@types/trip'

/** Bookmarkable target kinds — must match the backend SavedTargetType. */
export type SavedType = 'post' | 'trip' | 'guide'

/**
 * Bookmark API. The backend exposes a single toggle plus three hydrated list
 * endpoints (posts / trips / guides) used by the Profile "Đã lưu" tab. The
 * list endpoints return raw backend rows, so we reuse the same adapters the
 * dedicated services use to map them into FE shapes.
 */
export const savedService = {
  /** Toggle a bookmark; returns the resulting saved state. */
  toggle: async (type: SavedType, id: string): Promise<{ saved: boolean }> => {
    const res = await axiosInstance.post<ApiResponse<{ saved: boolean }>>('/saved/toggle', {
      targetType: type,
      targetId: id,
    })
    return unwrap(res)
  },

  posts: async (): Promise<Post[]> => {
    const res = await axiosInstance.get<ApiResponse<unknown[]>>('/saved/posts')
    return unwrap(res).map((p) => adaptPost(p as Parameters<typeof adaptPost>[0]))
  },

  trips: async (): Promise<Trip[]> => {
    const res = await axiosInstance.get<ApiResponse<unknown[]>>('/saved/trips')
    return unwrap(res).map((t) => adaptTrip(t as Parameters<typeof adaptTrip>[0]))
  },

  guides: async (): Promise<HireableGuide[]> => {
    const res = await axiosInstance.get<ApiResponse<unknown[]>>('/saved/guides')
    return unwrap(res).map((g) => adaptGuide(g as Parameters<typeof adaptGuide>[0]))
  },
}
