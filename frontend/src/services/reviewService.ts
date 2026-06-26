import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'

export type ReviewTargetType = 'place' | 'trip' | 'guide' | 'member'

export interface Review {
  id: string
  targetType: ReviewTargetType
  targetId: string
  /** Null for top-level reviews; otherwise the id of the review being replied to. */
  parentId?: string | null
  rating: number
  comment?: string
  tags: string[]
  helpfulCount: number
  likeCount: number
  isLiked?: boolean
  /** Children replies (only present on root reviews returned by `list`). */
  replies?: Review[]
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    avatar?: string
  }
}

export const reviewService = {
  list: async (targetType: ReviewTargetType, targetId: string): Promise<Review[]> => {
    const res = await axiosInstance.get<ApiResponse<Review[]>>('/reviews', {
      params: { targetType, targetId },
    })
    return unwrap(res)
  },

  create: async (body: {
    targetType: ReviewTargetType
    targetId: string
    rating: number
    comment?: string
    tags?: string[]
    /** When set, posts a reply under that review id (no rating required). */
    parentId?: string
  }): Promise<Review> => {
    const res = await axiosInstance.post<ApiResponse<Review>>('/reviews', body)
    return unwrap(res)
  },

  /** Toggle a like on a review. Returns the new aggregate state. */
  toggleLike: async (
    id: string,
  ): Promise<{ liked: boolean; likeCount: number }> => {
    const res = await axiosInstance.post<
      ApiResponse<{ liked: boolean; likeCount: number }>
    >(`/reviews/${id}/like`)
    return unwrap(res)
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/reviews/${id}`)
  },
}
