// Travel Places (địa điểm du lịch) — domain types

export type PlaceCategory =
  | 'beach'
  | 'mountain'
  | 'culture'
  | 'food'
  | 'city'
  | 'island'
  | 'nature'
  | 'historical'
  | 'adventure'

export interface PlaceReview {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  rating: number
  date: string
  content: string
  helpfulCount?: number
}

export interface Place {
  id: string
  name: string
  slug: string
  description: string
  longDescription?: string
  category: PlaceCategory
  /** Province/city, e.g. "Quảng Ninh" */
  province: string
  /** Specific area / district, e.g. "TP. Hạ Long" */
  city?: string
  address?: string
  coverImage: string
  gallery?: string[]
  rating: number
  reviewCount: number
  /** Entrance fee (label, e.g. "Miễn phí" / "₫150,000") */
  entranceFee?: string
  tags?: string[]
  /** Related place ids (similar) */
  relatedIds?: string[]
  reviews?: PlaceReview[]
  /** Saved by current user (UI state) */
  isSaved?: boolean
}
