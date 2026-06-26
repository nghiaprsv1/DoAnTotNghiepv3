import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'

/**
 * Structured AI-personalization preferences — the dedicated `user_preferences`
 * table (separate from the free-form `users.preferences` JSONB). Drives the
 * MATCH component of the trip recommender: categories + interests + provinces.
 */
export interface UserPreferences {
  categories: string[]
  interests: string[]
  provinces: string[]
  budgetTier?: string | null
}

interface BackendUserPreference {
  categories?: string[] | null
  interests?: string[] | null
  provinces?: string[] | null
  budgetTier?: string | null
}

const adapt = (b: BackendUserPreference): UserPreferences => ({
  categories: b.categories ?? [],
  interests: b.interests ?? [],
  provinces: b.provinces ?? [],
  budgetTier: b.budgetTier ?? null,
})

export const preferenceService = {
  /** Get the caller's structured preferences (empty arrays when never set). */
  getMine: async (): Promise<UserPreferences> => {
    const res = await axiosInstance.get<ApiResponse<BackendUserPreference>>(
      '/users/me/preferences',
    )
    return adapt(unwrap(res))
  },

  /** Create or update the caller's structured preferences. */
  upsertMine: async (payload: UserPreferences): Promise<UserPreferences> => {
    const res = await axiosInstance.put<ApiResponse<BackendUserPreference>>(
      '/users/me/preferences',
      {
        categories: payload.categories,
        interests: payload.interests,
        provinces: payload.provinces,
        budgetTier: payload.budgetTier ?? undefined,
      },
    )
    return adapt(unwrap(res))
  },
}
