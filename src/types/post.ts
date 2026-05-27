// Community post types

export interface PostComment {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  content: string
  createdAt: string
  likes?: number
  isLiked?: boolean
}

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
  /** Pre-loaded comments to show inline */
  topComments?: PostComment[]
}

/** Lightweight item shown in story bar */
export interface Story {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  preview: string
  /** Already viewed by current user */
  seen?: boolean
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
