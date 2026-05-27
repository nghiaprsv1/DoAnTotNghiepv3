import type { User } from './user'

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
