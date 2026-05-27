import type { FollowItem, PublicProfile } from '@types/profile'

const AV = (seed: string, w = 200) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=${w}&q=80`
const COVER = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=1400&q=80`

export const CURRENT_USER_ID = 'me'

export const mockPublicProfiles: Record<string, PublicProfile> = {
  u1: {
    id: 'u1',
    name: 'Maya Lee',
    handle: '@mayalee',
    avatar: AV('1502823403499-6ccfcf4fb453'),
    cover: COVER('1528127269322-539801943592'),
    bio: 'Photographer & traveler · Saigon-based · always chasing golden hour 🌅',
    location: 'TP. Hồ Chí Minh',
    joinedAt: 'Tham gia tháng 3 / 2023',
    verified: true,
    role: 'user',
    postsCount: 127,
    followersCount: 4820,
    followingCount: 312,
    tripsCount: 18,
    isFollowing: true,
    followsYou: true,
  },
  u2: {
    id: 'u2',
    name: 'Alex Nguyễn',
    handle: '@alex.travels',
    avatar: AV('1539571696357-5a69c17a67c6'),
    cover: COVER('1528127269322-539801943592'),
    bio: 'Solo backpacker — hơn 30 nước. Tin tưởng vào lòng tốt và bản đồ giấy.',
    location: 'Hà Nội',
    joinedAt: 'Tham gia tháng 7 / 2022',
    role: 'user',
    postsCount: 89,
    followersCount: 2310,
    followingCount: 187,
    tripsCount: 32,
    isFollowing: false,
    followsYou: false,
  },
  u3: {
    id: 'u3',
    name: 'Elena Trần',
    handle: '@elena.tran',
    avatar: AV('1438761681033-6461ffad8d80'),
    cover: COVER('1528127269322-539801943592'),
    bio: 'Đà Lạt is home. Tea, books and quiet roads.',
    location: 'Đà Lạt',
    joinedAt: 'Tham gia tháng 1 / 2024',
    postsCount: 41,
    followersCount: 768,
    followingCount: 224,
    tripsCount: 8,
    isFollowing: true,
    followsYou: false,
  },
  hg2: {
    id: 'hg2',
    name: 'Chị Hoa',
    handle: '@hoa.hoian',
    avatar: AV('1573496359142-b8d87734a5a2'),
    cover: COVER('1528127269322-539801943592'),
    bio: 'Đầu bếp & HDV ở Hội An. Tôi dẫn bạn vào những con hẻm chỉ người bản địa biết.',
    location: 'Hội An, Quảng Nam',
    joinedAt: 'Tham gia tháng 5 / 2021',
    verified: true,
    role: 'guide',
    postsCount: 203,
    followersCount: 12400,
    followingCount: 89,
    tripsCount: 312,
    isFollowing: false,
  },
  me: {
    id: 'me',
    name: 'Linh Nguyễn',
    handle: '@linh.travels',
    avatar: AV('1494790108377-be9c29b29330'),
    cover: COVER('1528127269322-539801943592'),
    bio: 'Yêu du lịch và nhiếp ảnh. Đang trên hành trình khám phá Việt Nam.',
    location: 'TP. Hồ Chí Minh',
    joinedAt: 'Tham gia tháng 8 / 2023',
    role: 'user',
    postsCount: 34,
    followersCount: 482,
    followingCount: 271,
    tripsCount: 12,
  },
}

const item = (
  id: string,
  name: string,
  handle: string,
  avatarSeed: string,
  bio: string,
  isFollowing: boolean,
  followsYou?: boolean,
  verified?: boolean
): FollowItem => ({
  id,
  name,
  handle,
  avatar: AV(avatarSeed),
  bio,
  isFollowing,
  followsYou,
  verified,
})

/** Followers list of the current user (or any user — same demo data) */
export const mockFollowers: FollowItem[] = [
  item('u1', 'Maya Lee', '@mayalee', '1502823403499-6ccfcf4fb453', 'Photographer & traveler', true, true, true),
  item('u2', 'Alex Nguyễn', '@alex.travels', '1539571696357-5a69c17a67c6', 'Solo backpacker', false, true),
  item('u4', 'Sơn Hoàng', '@son.hoang', '1507003211169-0a1dd7228f2d', 'Foodie từ Sài Gòn', true, true),
  item('u5', 'Mai Phùng', '@mai.phung', '1573496359142-b8d87734a5a2', 'Adventure addict', true, true),
  item('u6', 'Trang Vũ', '@trang.vu', '1500648767791-00dcc994a43e', 'Coffee + sunset', false, true),
  item('hg2', 'Chị Hoa', '@hoa.hoian', '1573496359142-b8d87734a5a2', 'HDV Hội An · ẩm thực', false, true, true),
]

/** People that current user is following */
export const mockFollowing: FollowItem[] = [
  item('u1', 'Maya Lee', '@mayalee', '1502823403499-6ccfcf4fb453', 'Photographer & traveler', true, true, true),
  item('u3', 'Elena Trần', '@elena.tran', '1438761681033-6461ffad8d80', 'Đà Lạt is home', true, false),
  item('u4', 'Sơn Hoàng', '@son.hoang', '1507003211169-0a1dd7228f2d', 'Foodie từ Sài Gòn', true, true),
  item('u5', 'Mai Phùng', '@mai.phung', '1573496359142-b8d87734a5a2', 'Adventure addict', true, true),
  item('hg1', 'Captain Đức', '@captain.duc', '1544005313-94ddf0286df2', 'Du thuyền vịnh Hạ Long', true, false, true),
  item('hg3', 'Sùng A Páo', '@pao.sapa', '1507003211169-0a1dd7228f2d', 'Trekking Sapa & Y Tý', true, false, true),
  item('hg4', 'Anh Tùng', '@tung.diving', '1500648767791-00dcc994a43e', 'Lặn biển Phú Quốc', true, false),
]
