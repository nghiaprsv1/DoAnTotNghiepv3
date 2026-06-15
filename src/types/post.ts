// Community post types

export interface PostComment {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  createdAt: string
  /** Null for top-level comments; otherwise the id of the comment being replied to. */
  parentId?: string | null
  likes?: number
  isLiked?: boolean
}

export type PostVisibility = 'public' | 'friends'

export interface Post {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  /** Marker for "verified guide / popular traveler" */
  authorVerified?: boolean
  location: string
  postedAt: string
  title: string
  excerpt: string
  /** Long-form body (markdown-ish plain text). */
  body?: string
  /** Single hero image. Kept for backwards compat. */
  image: string
  /** Multiple gallery images (carousel). Includes `image` if not provided. */
  gallery?: string[]
  tags?: string[]
  likes: number
  comments: number
  shares?: number
  isBookmarked?: boolean
  isLiked?: boolean
  /** Public (everyone) or friends-only (mutuals). */
  visibility?: PostVisibility
  /** Pre-loaded comments to show inline */
  topComments?: PostComment[]
}

/** A user who has liked a post (returned by `GET /posts/:id/likes`). */
export interface PostLiker {
  id: string
  name: string
  handle?: string | null
  avatar?: string | null
  bio?: string | null
  likedAt: string
  isFollowing: boolean
  isMe: boolean
}

export interface Guide {
  id: string
  name: string
  avatar: string
  location: string
  rating: number
  reviewCount?: number
  specialties?: string[]
}
