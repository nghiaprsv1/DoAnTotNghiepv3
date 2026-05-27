// Mock data for Guide Dashboard

export interface Booking {
  id: string
  customerName: string
  customerAvatar: string
  tourTitle: string
  destination: string
  date: string // human readable
  durationDays: number
  groupSize: number
  amount: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  createdAt: string
}

export interface Payout {
  id: string
  amount: number
  date: string
  method: string
  status: 'paid' | 'processing' | 'failed'
}

export interface RevenueMonth {
  month: string // 'T1', 'T2'...
  amount: number
  bookings: number
}

export interface DashboardTour {
  id: string
  title: string
  destination: string
  coverImage: string
  category: string
  pricePerDay: number
  rating: number
  bookingsCount: number
  status: 'active' | 'paused' | 'draft'
}

const IMG = (seed: string, w = 600) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=${w}&q=80`
const AV = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=120&q=80`

export const mockBookings: Booking[] = [
  {
    id: 'b1',
    customerName: 'Maya Lee',
    customerAvatar: AV('1502823403499-6ccfcf4fb453'),
    tourTitle: 'Du thuyền 3 ngày khám phá Vịnh',
    destination: 'Hạ Long',
    date: '15-17/12/2024',
    durationDays: 3,
    groupSize: 4,
    amount: 3600000,
    status: 'pending',
    createdAt: '2 giờ trước',
  },
  {
    id: 'b2',
    customerName: 'Alex Nguyễn',
    customerAvatar: AV('1539571696357-5a69c17a67c6'),
    tourTitle: 'Hang động bí mật Cát Bà',
    destination: 'Cát Bà',
    date: '20-21/12/2024',
    durationDays: 2,
    groupSize: 6,
    amount: 2400000,
    status: 'confirmed',
    createdAt: '1 ngày trước',
  },
  {
    id: 'b3',
    customerName: 'Elena Trần',
    customerAvatar: AV('1438761681033-6461ffad8d80'),
    tourTitle: 'Sunrise kayak Sửng Sốt',
    destination: 'Hạ Long',
    date: '28/12/2024',
    durationDays: 1,
    groupSize: 2,
    amount: 1200000,
    status: 'confirmed',
    createdAt: '3 ngày trước',
  },
  {
    id: 'b4',
    customerName: 'Sơn Hoàng',
    customerAvatar: AV('1507003211169-0a1dd7228f2d'),
    tourTitle: 'Hành trình hải sản Bãi Cháy',
    destination: 'Hạ Long',
    date: '02/12/2024',
    durationDays: 1,
    groupSize: 8,
    amount: 1500000,
    status: 'completed',
    createdAt: '2 tuần trước',
  },
  {
    id: 'b5',
    customerName: 'Mai Phùng',
    customerAvatar: AV('1573496359142-b8d87734a5a2'),
    tourTitle: 'Du thuyền 3 ngày khám phá Vịnh',
    destination: 'Hạ Long',
    date: '25/11/2024',
    durationDays: 3,
    groupSize: 5,
    amount: 4200000,
    status: 'cancelled',
    createdAt: '1 tháng trước',
  },
]

export const mockRevenueByMonth: RevenueMonth[] = [
  { month: 'T6', amount: 8500000, bookings: 6 },
  { month: 'T7', amount: 12300000, bookings: 9 },
  { month: 'T8', amount: 15800000, bookings: 11 },
  { month: 'T9', amount: 13200000, bookings: 10 },
  { month: 'T10', amount: 18900000, bookings: 14 },
  { month: 'T11', amount: 22100000, bookings: 17 },
  { month: 'T12', amount: 9300000, bookings: 6 },
]

export const mockPayouts: Payout[] = [
  {
    id: 'p1',
    amount: 18800000,
    date: '01/12/2024',
    method: 'Ngân hàng VCB · ****1234',
    status: 'paid',
  },
  {
    id: 'p2',
    amount: 15400000,
    date: '01/11/2024',
    method: 'Ngân hàng VCB · ****1234',
    status: 'paid',
  },
  {
    id: 'p3',
    amount: 4500000,
    date: '15/12/2024',
    method: 'Ngân hàng VCB · ****1234',
    status: 'processing',
  },
]

export const mockDashboardTours: DashboardTour[] = [
  {
    id: 'dt1',
    title: 'Du thuyền 3 ngày khám phá Vịnh Hạ Long',
    destination: 'Hạ Long',
    coverImage: IMG('1528127269322-539801943592'),
    category: 'Du thuyền',
    pricePerDay: 1200000,
    rating: 4.95,
    bookingsCount: 38,
    status: 'active',
  },
  {
    id: 'dt2',
    title: 'Hang động bí mật Cát Bà',
    destination: 'Cát Bà',
    coverImage: IMG('1528127269322-539801943592', 700),
    category: 'Phiêu lưu',
    pricePerDay: 1100000,
    rating: 4.9,
    bookingsCount: 22,
    status: 'active',
  },
  {
    id: 'dt3',
    title: 'Hành trình hải sản Bãi Cháy',
    destination: 'Hạ Long',
    coverImage: IMG('1528127269322-539801943592', 800),
    category: 'Ẩm thực',
    pricePerDay: 950000,
    rating: 4.8,
    bookingsCount: 15,
    status: 'paused',
  },
  {
    id: 'dt4',
    title: 'Sunrise kayak qua hang Sửng Sốt (Bản nháp)',
    destination: 'Hạ Long',
    coverImage: IMG('1528127269322-539801943592', 900),
    category: 'Phiêu lưu',
    pricePerDay: 800000,
    rating: 0,
    bookingsCount: 0,
    status: 'draft',
  },
]
