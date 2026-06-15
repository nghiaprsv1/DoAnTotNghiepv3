import type { User } from './user'

/** Optional public social-media handles. */
export interface SocialLinks {
  instagram?: string
  facebook?: string
  tiktok?: string
  website?: string
}

/**
 * Travel preferences captured on the edit-profile page. Surfaced as chips on
 * the public profile so other travelers can size up compatibility before
 * joining a trip together.
 */
export interface TravelPreferences {
  travelStyles?: string[]
  tripPurposes?: string[]
  budgetLevel?: string | null
  experienceLevel?: string | null
  terrainPrefs?: string[]
  activities?: string[]
  languages?: string[]
}

/** Public profile for `/users/:id` view (lighter than internal User) */
export interface PublicProfile {
  id: string
  name: string
  /** @username */
  handle: string
  avatar: string
  cover?: string
  bio?: string
  location?: string
  joinedAt?: string
  verified?: boolean
  /** "guide" for special badge */
  role?: User['role']
  /** Counters */
  postsCount: number
  followersCount: number
  followingCount: number
  /** Trips this user has joined or created (counter only). */
  tripsCount?: number
  /** True if current user follows this profile. */
  isFollowing?: boolean
  /** Reverse — does this profile follow current user back. */
  followsYou?: boolean
  /** Owner-only fields — only present when viewer is the profile owner. */
  email?: string
  phone?: string
  /** Public — null if user hasn't set any. */
  socialLinks?: SocialLinks | null
  /** Public travel preferences (chips). null/undefined when not set. */
  preferences?: TravelPreferences | null
}

/** Compact card item used in followers/following lists. */
export interface FollowItem {
  id: string
  name: string
  handle: string
  avatar: string
  bio?: string
  isFollowing: boolean
  followsYou?: boolean
  verified?: boolean
}
