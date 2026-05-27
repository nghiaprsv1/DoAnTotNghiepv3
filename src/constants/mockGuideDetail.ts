// Mock tour history + reviews per guide id
// Used by GuideDetailPage. Generic data — fallback when specific id missing.

export interface GuideTourHistory {
  id: string
  title: string
  destination: string
  coverImage: string
  date: string // human readable
  durationDays: number
  groupSize: number
  rating: number
  category: string
}

export interface GuideReview {
  id: string
  authorId: string
  authorName: string
  authorAvatar: string
  rating: number // 0..5
  date: string
  content: string
  tourTitle?: string
  helpfulCount?: number
  isHelpful?: boolean
  /** Reply from the guide */
  reply?: {
    content: string
    date: string
  }
}

const IMG = (seed: string, w = 800) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=${w}&q=80`

const AV = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=200&q=80`

export const guideToursById: Record<string, GuideTourHistory[]> = {
  hg1: [
    {
      id: 'gt1',
      title: 'Du thuyền 3 ngày khám phá Vịnh Hạ Long',
      destination: 'Hạ Long',
      coverImage: IMG('1528127269322-539801943592'),
      date: 'Tháng 11, 2024',
      durationDays: 3,
      groupSize: 6,
      rating: 5,
      category: 'Du thuyền',
    },
    {
      id: 'gt2',
      title: 'Hang động bí mật Cát Bà',
      destination: 'Cát Bà',
      coverImage: IMG('1528127269322-539801943592', 900),
      date: 'Tháng 10, 2024',
      durationDays: 2,
      groupSize: 4,
      rating: 4.9,
      category: 'Phiêu lưu',
    },
    {
      id: 'gt3',
      title: 'Hành trình hải sản Bãi Cháy',
      destination: 'Hạ Long',
      coverImage: IMG('1528127269322-539801943592', 1100),
      date: 'Tháng 9, 2024',
      durationDays: 1,
      groupSize: 8,
      rating: 4.8,
      category: 'Ẩm thực',
    },
    {
      id: 'gt4',
      title: 'Sunrise kayak qua hang Sửng Sốt',
      destination: 'Hạ Long',
      coverImage: IMG('1528127269322-539801943592', 1000),
      date: 'Tháng 8, 2024',
      durationDays: 1,
      groupSize: 4,
      rating: 5,
      category: 'Phiêu lưu',
    },
  ],
}

// Default fallback list — used for any guide id
export const defaultTourHistory: GuideTourHistory[] = [
  {
    id: 'd-gt1',
    title: 'Tour văn hoá phố cổ',
    destination: 'Việt Nam',
    coverImage: IMG('1528127269322-539801943592'),
    date: 'Tháng 11, 2024',
    durationDays: 2,
    groupSize: 6,
    rating: 5,
    category: 'Văn hoá',
  },
  {
    id: 'd-gt2',
    title: 'Trekking khám phá thiên nhiên',
    destination: 'Việt Nam',
    coverImage: IMG('1528127269322-539801943592', 900),
    date: 'Tháng 10, 2024',
    durationDays: 3,
    groupSize: 5,
    rating: 4.9,
    category: 'Phiêu lưu',
  },
  {
    id: 'd-gt3',
    title: 'Hành trình ẩm thực địa phương',
    destination: 'Việt Nam',
    coverImage: IMG('1528127269322-539801943592', 1100),
    date: 'Tháng 9, 2024',
    durationDays: 1,
    groupSize: 8,
    rating: 4.8,
    category: 'Ẩm thực',
  },
]

export const defaultReviews: GuideReview[] = [
  {
    id: 'r1',
    authorId: 'u1',
    authorName: 'Maya Lee',
    authorAvatar: AV('1502823403499-6ccfcf4fb453'),
    rating: 5,
    date: '2 tuần trước',
    content:
      'Một trải nghiệm khó quên! HDV cực kỳ am hiểu và nhiệt tình, đưa nhóm mình đến những nơi mà bình thường du khách không thể tìm thấy. Sẽ quay lại 100%.',
    tourTitle: 'Du thuyền 3 ngày khám phá Vịnh Hạ Long',
    helpfulCount: 24,
    reply: {
      content: 'Cảm ơn bạn rất nhiều! Hẹn gặp lại trong chuyến đi tiếp theo nhé 🌊',
      date: '2 tuần trước',
    },
  },
  {
    id: 'r2',
    authorId: 'u2',
    authorName: 'Alex Nguyễn',
    authorAvatar: AV('1539571696357-5a69c17a67c6'),
    rating: 5,
    date: '1 tháng trước',
    content:
      'Đi tour với anh ấy như đi với một người bạn cũ. Lịch trình linh hoạt, ảnh chụp cho cả nhóm cũng rất xịn. Đặc biệt là kiến thức về địa phương — câu chuyện nào cũng cuốn.',
    tourTitle: 'Hang động bí mật Cát Bà',
    helpfulCount: 18,
  },
  {
    id: 'r3',
    authorId: 'u3',
    authorName: 'Elena Trần',
    authorAvatar: AV('1438761681033-6461ffad8d80'),
    rating: 4,
    date: '2 tháng trước',
    content:
      'Tour ổn, đáng tiền. Trời hôm đó hơi mưa nên một số điểm bị bỏ qua, nhưng HDV bù lại bằng nhà hàng địa phương cực ngon. Thông tin trước tour có thể chi tiết hơn.',
    tourTitle: 'Hành trình hải sản Bãi Cháy',
    helpfulCount: 7,
  },
  {
    id: 'r4',
    authorId: 'u4',
    authorName: 'Sơn Hoàng',
    authorAvatar: AV('1507003211169-0a1dd7228f2d'),
    rating: 5,
    date: '3 tháng trước',
    content:
      'Đi theo nhóm 4 người. Mọi thứ được sắp xếp gọn gàng, lịch trình rất hợp lý. Anh ấy biết cả những spot chụp ảnh đẹp mà mình không bao giờ tìm thấy trên Google.',
    tourTitle: 'Sunrise kayak qua hang Sửng Sốt',
    helpfulCount: 12,
  },
]
