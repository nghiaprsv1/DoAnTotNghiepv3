import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'
import type {
  FollowItem,
  PublicProfile,
  SocialLinks,
  TravelPreferences,
} from '@types/profile'

interface BackendUser {
  id: string
  name: string
  handle?: string
  email?: string
  avatar?: string
  cover?: string
  bio?: string
  location?: string
  phone?: string
  socialLinks?: SocialLinks | null
  preferences?: TravelPreferences | null
  role: PublicProfile['role']
  verified?: boolean
  createdAt?: string
  postsCount?: number
  followersCount?: number
  followingCount?: number
  tripsCount?: number
  isFollowing?: boolean
  followsYou?: boolean
}

const adaptProfile = (u: BackendUser): PublicProfile => ({
  id: u.id,
  name: u.name,
  handle: u.handle ?? (u.email ? u.email.split('@')[0] : ''),
  avatar: u.avatar ?? '',
  cover: u.cover,
  bio: u.bio,
  location: u.location,
  joinedAt: u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : undefined,
  verified: u.verified,
  role: u.role,
  postsCount: u.postsCount ?? 0,
  followersCount: u.followersCount ?? 0,
  followingCount: u.followingCount ?? 0,
  tripsCount: u.tripsCount,
  isFollowing: u.isFollowing,
  followsYou: u.followsYou,
  email: u.email,
  phone: u.phone,
  socialLinks: u.socialLinks ?? null,
  preferences: u.preferences ?? null,
})

const adaptFollow = (u: BackendUser): FollowItem => ({
  id: u.id,
  name: u.name,
  handle: u.handle ?? (u.email ? u.email.split('@')[0] : ''),
  avatar: u.avatar ?? '',
  bio: u.bio,
  isFollowing: !!u.isFollowing,
  followsYou: u.followsYou,
  verified: u.verified,
})

export const userService = {
  getProfile: async (id: string): Promise<PublicProfile> => {
    const res = await axiosInstance.get<ApiResponse<BackendUser>>(`/users/${id}`)
    return adaptProfile(unwrap(res))
  },

  updateMe: async (patch: Record<string, unknown>): Promise<PublicProfile> => {
    const res = await axiosInstance.put<ApiResponse<BackendUser>>('/users/me', patch)
    return adaptProfile(unwrap(res))
  },

  follow: async (id: string): Promise<{ isFollowing: boolean }> => {
    const res = await axiosInstance.post<ApiResponse<{ isFollowing: boolean }>>(
      `/users/${id}/follow`,
    )
    return unwrap(res)
  },

  unfollow: async (id: string): Promise<{ isFollowing: boolean }> => {
    const res = await axiosInstance.delete<ApiResponse<{ isFollowing: boolean }>>(
      `/users/${id}/follow`,
    )
    return unwrap(res)
  },

  followers: async (id: string): Promise<FollowItem[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendUser[]>>(`/users/${id}/followers`)
    return unwrap(res).map(adaptFollow)
  },

  following: async (id: string): Promise<FollowItem[]> => {
    const res = await axiosInstance.get<ApiResponse<BackendUser[]>>(`/users/${id}/following`)
    return unwrap(res).map(adaptFollow)
  },

  /** Free-text search (name / handle / email). Returns up to `limit` matches. */
  search: async (q: string, limit = 20): Promise<PublicProfile[]> => {
    if (!q.trim()) return []
    const res = await axiosInstance.get<ApiResponse<BackendUser[]>>('/users/search', {
      params: { q, limit },
    })
    return unwrap(res).map(adaptProfile)
  },
}
