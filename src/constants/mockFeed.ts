import type { Post, Story, PostComment } from '@types/post'

const IMG = (seed: string, w = 1200) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=${w}&q=80`

export const mockStories: Story[] = [
  {
    id: 's1',
    authorId: 'u1',
    authorName: 'Linh',
    authorAvatar: IMG('1494790108377-be9c29b29330', 200),
    preview: IMG('1528127269322-539801943592', 400),
  },
  {
    id: 's2',
    authorId: 'u2',
    authorName: 'Minh',
    authorAvatar: IMG('1500648767791-00dcc994a43e', 200),
    preview: IMG('1528127269322-539801943592', 400),
    seen: true,
  },
  {
    id: 's3',
    authorId: 'u3',
    authorName: 'Mai',
    authorAvatar: IMG('1573496359142-b8d87734a5a2', 200),
    preview: IMG('1528127269322-539801943592', 400),
  },
  {
    id: 's4',
    authorId: 'u4',
    authorName: 'Sơn',
    authorAvatar: IMG('1507003211169-0a1dd7228f2d', 200),
    preview: IMG('1528127269322-539801943592', 400),
  },
  {
    id: 's5',
    authorId: 'u5',
    authorName: 'Elena',
    authorAvatar: IMG('1438761681033-6461ffad8d80', 200),
    preview: IMG('1528127269322-539801943592', 400),
    seen: true,
  },
  {
    id: 's6',
    authorId: 'u6',
    authorName: 'Alex',
    authorAvatar: IMG('1539571696357-5a69c17a67c6', 200),
    preview: IMG('1528127269322-539801943592', 400),
  },
]

const sampleComments: PostComment[] = [
  {
    id: 'pc1',
    authorId: 'u2',
    authorName: 'Minh Trần',
    authorAvatar: IMG('1500648767791-00dcc994a43e', 200),
    content: 'Tuyệt quá! Bạn ở khu nào vậy? Mình đang lên kế hoạch tháng sau.',
    createdAt: '1 giờ',
    likes: 12,
  },
  {
    id: 'pc2',
    authorId: 'u3',
    authorName: 'Mai Phùng',
    authorAvatar: IMG('1573496359142-b8d87734a5a2', 200),
    content: 'Ảnh đẹp xỉu 😍 cho mình xin info quán cafe nhé.',
    createdAt: '32 phút',
    likes: 4,
  },
]

export const mockFeedPosts: Post[] = [
  {
    id: 'fp1',
    authorId: 'me',
    authorName: 'Linh Nguyễn',
    authorAvatar: IMG('1494790108377-be9c29b29330', 200),
    authorVerified: true,
    location: 'Hội An, Quảng Nam',
    postedAt: '2 giờ trước',
    title: 'Đêm phố cổ và những chiếc đèn lồng',
    excerpt:
      'Tìm thấy một con hẻm yên tĩnh tránh xa đám đông. Đèn lồng buổi đêm khi đường vắng người mang một vibe rất khác.',
    body: 'Đi Hội An lần thứ 3 rồi mà mỗi lần vẫn thấy mới. Tối nay mình rời khỏi khu chính, đi vào con hẻm nhỏ phía sau chợ đêm. Chỉ có tiếng nước sông và ánh đèn lồng. Mình ngồi ở quán nhỏ, gọi một ly cafe muối, và chỉ nghe thôi. Có những chuyến đi không cần phải đi xa — chỉ cần đi sâu hơn một chút.',
    image: IMG('1528127269322-539801943592'),
    gallery: [
      IMG('1528127269322-539801943592'),
      IMG('1528127269322-539801943592', 1400),
      IMG('1528127269322-539801943592', 1000),
    ],
    tags: ['#hoian', '#vietnam', '#nightphotography'],
    likes: 1284,
    comments: 84,
    shares: 23,
    isLiked: false,
    isBookmarked: false,
    topComments: sampleComments,
  },
  {
    id: 'fp2',
    authorId: 'u2',
    authorName: 'Alex Nguyễn',
    authorAvatar: IMG('1539571696357-5a69c17a67c6', 200),
    location: 'Hà Giang',
    postedAt: '5 giờ trước',
    title: 'Đèo Mã Pí Lèng — vòng lặp khiến bạn thay đổi',
    excerpt:
      'Cuối cùng đã chinh phục được Mã Pí Lèng. Lời nói không thể diễn tả được sự hùng vĩ của những ngọn núi này.',
    image: IMG('1528127269322-539801943592'),
    gallery: [IMG('1528127269322-539801943592'), IMG('1528127269322-539801943592', 1100)],
    tags: ['#hagiang', '#mapileng', '#motorbike'],
    likes: 3421,
    comments: 120,
    shares: 67,
    isLiked: true,
    isBookmarked: true,
  },
  {
    id: 'fp3',
    authorId: 'u3',
    authorName: 'Maya Lee',
    authorAvatar: IMG('1502823403499-6ccfcf4fb453', 200),
    authorVerified: true,
    location: 'Huế',
    postedAt: 'Hôm qua',
    title: 'Tiếng vọng Cố đô',
    excerpt:
      'Đi qua Tử Cấm Thành như bước qua một lát cắt thời gian. Những chi tiết kiến trúc nhỏ thôi cũng đủ làm mình đứng lại 5 phút.',
    image: IMG('1528127269322-539801943592'),
    tags: ['#hue', '#imperial', '#culture'],
    likes: 2103,
    comments: 45,
    shares: 18,
  },
  {
    id: 'fp4',
    authorId: 'u4',
    authorName: 'Sơn Hoàng',
    authorAvatar: IMG('1507003211169-0a1dd7228f2d', 200),
    location: 'Phú Quốc',
    postedAt: '2 ngày trước',
    title: 'Bãi tắm bí mật ở An Thới',
    excerpt:
      'Đi canoe 30 phút từ cảng An Thới và tìm được bãi tắm này. Cát trắng, không bóng người, nước trong vắt.',
    image: IMG('1528127269322-539801943592'),
    gallery: [
      IMG('1528127269322-539801943592'),
      IMG('1528127269322-539801943592', 1400),
      IMG('1528127269322-539801943592', 1000),
      IMG('1528127269322-539801943592', 1300),
    ],
    tags: ['#phuquoc', '#beach', '#hidden'],
    likes: 892,
    comments: 32,
    shares: 12,
  },
]
