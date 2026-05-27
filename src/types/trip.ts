// Trip domain types

export type TripCategory = 'beach' | 'mountain' | 'food' | 'culture' | 'city' | 'island' | 'adventure'

export interface TripMember {
  id: string
  name: string
  avatar: string
  role?: 'leader' | 'member'
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
  /** Cover photo for listing card */
  coverImage: string
  /** Optional gallery */
  gallery?: string[]
  /** Price per day in VND or USD (use currency below) */
  pricePerDay: number
  currency: string
  /** Availability label, e.g. "Còn lịch tháng 12" */
  availability: 'available' | 'busy' | 'fully-booked'
  availabilityLabel?: string
  /** Trips completed total */
  toursCompleted?: number
  /** Hourly response speed label, e.g. "trong 1 giờ" */
  responseTime?: string
  /** Tag chips like "Top Rated", "Local Expert" */
  highlights?: string[]
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

export interface Trip {
  id: string
  title: string
  description: string
  destination: string
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
  members: TripMember[]
  creator: TripMember
  /** Optional dedicated tour guide (separate from creator/members) */
  guide?: TripGuide
  tags: string[]
  itinerary: ItineraryDay[]
  isJoined?: boolean
  isSaved?: boolean
}
