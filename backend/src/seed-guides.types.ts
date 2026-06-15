/**
 * Type contracts for the guide-data seeder. Pure data shapes — no runtime
 * imports. Kept separate so seed-guides.data.ts and seed-guides.ts can both
 * reference them without circular references.
 */

export interface GuidePersona {
  email: string
  name: string
  handle: string
  avatar: string
  region: string
  regionKeys: string[]
  categoryKeys: string[]
  languages: string[]
  specialties: string[]
  bio: string
  yearsExperience: number
  pricePerDay: number
  rating: number
  reviewCount: number
  toursCompleted: number
  responseTime: string
  coverImage: string
  availabilityLabel: string
  highlights: string[]
}

export interface TravelerPersona {
  email: string
  name: string
  handle: string
  avatar: string
}

export interface BookingPlan {
  status: string
  /** days ago when booking was created */
  createdDaysAgo: number
  /** days ago when tour started (negative = future) */
  startDaysAgo: number
  durationDays: number
  groupSize: number
}

export const TOUR_TITLES: Record<string, string[]> = {
  'Hạ Long & Đông Bắc': ['Du thuyền vịnh Hạ Long', 'Kayak hang Sửng Sốt', 'Cát Bà & Lan Hạ'],
  'Sapa & Tây Bắc': ['Trekking Mường Hoa', 'Homestay bản Tả Van', 'Săn mây Fansipan'],
  'Hội An & Đà Nẵng': ['Tour ẩm thực Hội An', 'Phố cổ về đêm', 'Bà Nà Hills'],
  'Phú Quốc': ['Lặn ngắm san hô', '4 đảo phía Nam', 'Câu cá đêm'],
  'Hà Giang': ['Hà Giang loop 4N3Đ', 'Mã Pí Lèng', 'Chợ phiên Đồng Văn'],
}

export const TRAVELER_NOTES: string[] = [
  'Đi 2 vợ chồng, không gấp thời gian',
  'Có 1 trẻ em 5 tuổi, mong HDV linh hoạt',
  'Nhóm bạn 4 người, thích chụp ảnh',
  '',
  'Lần đầu đi vùng này, nhờ HDV gợi ý lịch trình',
  'Đã đi nhiều nơi, ưu tiên trải nghiệm khác lạ',
  '',
  'Tốc độ chậm, có người lớn tuổi',
]
