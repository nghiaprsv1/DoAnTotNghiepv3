// Trip domain types

export type TripCategory = 'beach' | 'mountain' | 'food' | 'culture' | 'city' | 'island' | 'adventure'

export interface TripMember {
  id: string
  name: string
  avatar: string
  role?: 'leader' | 'member' | 'guide'
  note?: string
}

/** Local guide attached to a trip — distinct from regular members. */
export interface TripGuide {
  id: string
  name: string
  avatar: string
  /** Geographic specialty, e.g. "Sapa & Ha Giang" */
  region: string
  /** 0..5 */
  rating: number
  reviewCount?: number
  /** Years of guiding experience */
  yearsExperience?: number
  languages?: string[]
  specialties?: string[]
  bio?: string
  verified?: boolean
}

/** Hireable guide listing — extends TripGuide with marketplace fields. */
export interface HireableGuide extends TripGuide {
  /** Underlying User id of the guide (for DM, self-check, etc). */
  userId?: string
  /** Price per day in VND or USD (use currency below) */
  pricePerDay: number
  currency: string
  /** Availability label, e.g. "Còn lịch tháng 12" */
  availability: 'available' | 'busy' | 'fully-booked'
  availabilityLabel?: string
  /** Trips completed total */
  toursCompleted?: number
  /** Region keys for filtering (lowercase) */
  regionKeys?: string[]
  /** Specialty keys for filtering (matches TRIP categories) */
  categoryKeys?: ('beach' | 'mountain' | 'food' | 'culture' | 'city' | 'island' | 'adventure')[]
}

export interface ItineraryActivity {
  time: string
  title: string
  description?: string
  images?: string[]
}

export interface ItineraryDay {
  dayNumber: number
  date: string
  title: string
  activities: ItineraryActivity[]
}

/** Quick-glance bundles surfaced on the trip detail page. */
export interface TripInclusions {
  accommodation?: string
  transport?: string
  meals?: string
}

export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'

/** A pending join request — visible only to the trip owner. */
export interface PendingJoinRequest {
  id: string
  message?: string
  createdAt: string
  user: {
    id: string
    name: string
    avatar?: string
    handle?: string
  }
}

export interface Trip {
  id: string
  title: string
  description: string
  destination: string
  /** Optional starting point (free-form name). */
  originName?: string | null
  /** Geocoded coordinates (lat/lng) — present when set via the map picker. */
  originLat?: number | null
  originLng?: number | null
  destinationLat?: number | null
  destinationLng?: number | null
  category: TripCategory
  coverImage: string
  gallery?: string[]
  startDate: string
  endDate: string
  durationDays: number
  priceFrom: number
  currency: string
  rating: number
  maxMembers: number
  memberCount: number
  /** Độ hot — bộ đếm tương tác toàn hệ thống (dùng cho thuật toán gợi ý). */
  viewCount?: number
  clickCount?: number
  requestCount?: number
  members: TripMember[]
  creator: TripMember
  /** Optional dedicated tour guide (separate from creator/members) */
  guide?: TripGuide
  tags: string[]
  inclusions?: TripInclusions
  itinerary: ItineraryDay[]
  isJoined?: boolean
  isOwner?: boolean
  /** Backend lifecycle status — independent from date-derived live status. */
  status?: 'draft' | 'published' | 'cancelled' | 'completed'
  /** Current viewer's most recent join-request status (null if never asked). */
  joinRequestStatus?: JoinRequestStatus | null
  /** Owner-only: pending join requests waiting for response. */
  pendingRequests?: PendingJoinRequest[]
  isSaved?: boolean
  /** Score from the recommender — only present in the recommended endpoint. */
  recommendScore?: number
  /** Human-readable reasons explaining why this trip was recommended. */
  recommendReasons?: string[]
  /** Điểm thành phần đã chuẩn hoá [0,1] — chỉ có ở endpoint recommended. */
  scoreBreakdown?: {
    match: number
    interaction: number
    hot: number
  }
}
