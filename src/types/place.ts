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

export interface OpeningHours {
  /** 0 = Sunday */
  day: number
  open: string // 'HH:mm'
  close: string
  closed?: boolean
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
  /** Approximate visit duration */
  duration?: string
  /** Recommended seasons / months */
  bestTime?: string
  /** Entrance fee (label, e.g. "Miễn phí" / "₫150,000") */
  entranceFee?: string
  openingHours?: OpeningHours[]
  tags?: string[]
  /** Hashtag-like activities */
  highlights?: string[]
  /** Related place ids (similar) */
  relatedIds?: string[]
  reviews?: PlaceReview[]
  /** Coordinates for future map use */
  coordinates?: { lat: number; lng: number }
  /** Saved by current user (UI state) */
  isSaved?: boolean
}
