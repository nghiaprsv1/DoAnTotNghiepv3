import type { ChatUser, Conversation, ChatMessage } from '@types/message'

const IMG = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=240&q=80`

/** ID of the "current" user — used to right-align messages in the demo UI. */
export const CURRENT_USER_ID = 'me'

export const mockChatUsers: Record<string, ChatUser> = {
  u1: {
    id: 'u1',
    name: 'Linh Nguyễn',
    avatar: IMG('1494790108377-be9c29b29330'),
    online: true,
  },
  u2: {
    id: 'u2',
    name: 'Minh Trần',
    avatar: IMG('1500648767791-00dcc994a43e'),
    online: false,
    lastSeen: '20 phút trước',
  },
  u3: {
    id: 'u3',
    name: 'Mai Phùng',
    avatar: IMG('1573496359142-b8d87734a5a2'),
    online: true,
  },
  u4: {
    id: 'u4',
    name: 'Sơn Hoàng',
    avatar: IMG('1507003211169-0a1dd7228f2d'),
    online: false,
    lastSeen: 'Hôm qua',
  },
  u5: {
    id: 'u5',
    name: 'Elena Trần',
    avatar: IMG('1438761681033-6461ffad8d80'),
    online: true,
  },
  u6: {
    id: 'u6',
    name: 'Alex Nguyễn',
    avatar: IMG('1539571696357-5a69c17a67c6'),
    online: false,
    lastSeen: '2 ngày trước',
  },
}

export const mockConversations: Conversation[] = [
  {
    id: 'c1',
    kind: 'direct',
    peer: mockChatUsers.u1,
    lastMessage: 'Hẹn gặp lại ở Sapa nhé! 🏔️',
    lastMessageAt: '2 phút',
    unreadCount: 2,
    pinned: true,
    typing: true,
  },
  {
    id: 'g1',
    kind: 'group',
    peer: mockChatUsers.u3,
    groupName: 'Sapa Trekkers · 12/2024',
    groupAvatar:
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=200&q=80',
    participants: [
      mockChatUsers.u1,
      mockChatUsers.u2,
      mockChatUsers.u3,
      mockChatUsers.u4,
      mockChatUsers.u5,
    ],
    lastMessage: 'Mai Phùng: Mình đã book vé tàu cho cả nhóm rồi nha 🎫',
    lastMessageAt: '5 phút',
    unreadCount: 5,
    pinned: true,
  },
  {
    id: 'c2',
    kind: 'direct',
    peer: mockChatUsers.u2,
    lastMessage: 'Bạn: Mình đã đặt vé xong rồi.',
    lastMessageAt: '10:24',
    unreadCount: 0,
    lastFromMe: true,
  },
  {
    id: 'c3',
    kind: 'direct',
    peer: mockChatUsers.u3,
    lastMessage: 'Gửi mình ảnh quán cafe đi 😋',
    lastMessageAt: '09:08',
    unreadCount: 1,
  },
  {
    id: 'g2',
    kind: 'group',
    peer: mockChatUsers.u6,
    groupName: 'Phú Quốc Diving Crew',
    groupAvatar:
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=200&q=80',
    participants: [
      mockChatUsers.u4,
      mockChatUsers.u5,
      mockChatUsers.u6,
      mockChatUsers.u2,
    ],
    lastMessage: 'Alex Nguyễn: Có ai đem theo GoPro không?',
    lastMessageAt: 'Hôm qua',
    unreadCount: 0,
  },
  {
    id: 'c4',
    kind: 'direct',
    peer: mockChatUsers.u4,
    lastMessage: 'Ok cảm ơn bạn nha!',
    lastMessageAt: 'Hôm qua',
    unreadCount: 0,
  },
  {
    id: 'c5',
    kind: 'direct',
    peer: mockChatUsers.u5,
    lastMessage: 'Bạn: Tuần sau mình rảnh, đi không?',
    lastMessageAt: 'T2',
    unreadCount: 0,
    lastFromMe: true,
  },
  {
    id: 'c6',
    kind: 'direct',
    peer: mockChatUsers.u6,
    lastMessage: 'Cảnh đẹp quá trời 🌅',
    lastMessageAt: '12/04',
    unreadCount: 0,
  },
]

export const mockMessagesByConversation: Record<string, ChatMessage[]> = {
  c1: [
    {
      id: 'm1',
      conversationId: 'c1',
      senderId: 'u1',
      content: 'Chào bạn! Cuối tuần này có rảnh đi Sapa không?',
      createdAt: '10:02',
    },
    {
      id: 'm2',
      conversationId: 'c1',
      senderId: CURRENT_USER_ID,
      content: 'Có chứ, mình đang định rủ bạn đây 😄',
      createdAt: '10:04',
      status: 'read',
    },
    {
      id: 'm3',
      conversationId: 'c1',
      senderId: 'u1',
      content: 'Tuyệt! Mình đặt được homestay view ruộng bậc thang rồi.',
      createdAt: '10:06',
    },
    {
      id: 'm4',
      conversationId: 'c1',
      senderId: 'u1',
      content: 'Xem ảnh nè 👇',
      createdAt: '10:06',
      attachment:
        'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'm5',
      conversationId: 'c1',
      senderId: CURRENT_USER_ID,
      content: 'Quá đỉnh! Mình lo phần xe đi và đồ ăn sáng nha.',
      createdAt: '10:10',
      status: 'delivered',
    },
    {
      id: 'm6',
      conversationId: 'c1',
      senderId: 'u1',
      content: 'Hẹn gặp lại ở Sapa nhé! 🏔️',
      createdAt: '10:12',
    },
  ],
  c2: [
    {
      id: 'm7',
      conversationId: 'c2',
      senderId: 'u2',
      content: 'Bạn đặt vé chưa?',
      createdAt: '09:50',
    },
    {
      id: 'm8',
      conversationId: 'c2',
      senderId: CURRENT_USER_ID,
      content: 'Mình đã đặt vé xong rồi.',
      createdAt: '10:24',
      status: 'sent',
    },
  ],
  c3: [
    {
      id: 'm9',
      conversationId: 'c3',
      senderId: 'u3',
      content: 'Gửi mình ảnh quán cafe đi 😋',
      createdAt: '09:08',
    },
  ],
  g1: [
    {
      id: 'gm1',
      conversationId: 'g1',
      senderId: 'u1',
      content: 'Mọi người ơi, ai đã book được vé tàu lên Sapa chưa?',
      createdAt: '08:30',
    },
    {
      id: 'gm2',
      conversationId: 'g1',
      senderId: 'u4',
      content: 'Mình mua vé rồi, ngồi mềm khoang 4 nha 🚆',
      createdAt: '08:32',
    },
    {
      id: 'gm3',
      conversationId: 'g1',
      senderId: CURRENT_USER_ID,
      content: 'Ủa cho mình hỏi homestay đã chốt chưa nhỉ?',
      createdAt: '08:35',
      status: 'read',
    },
    {
      id: 'gm4',
      conversationId: 'g1',
      senderId: 'u3',
      content: 'Mình đã book homestay view ruộng bậc thang nha. Sleep 6 người.',
      createdAt: '08:37',
    },
    {
      id: 'gm5',
      conversationId: 'g1',
      senderId: 'u5',
      content: 'Tuyệt vời 🤩',
      createdAt: '08:40',
    },
    {
      id: 'gm6',
      conversationId: 'g1',
      senderId: 'u3',
      content: 'Mình đã book vé tàu cho cả nhóm rồi nha 🎫',
      createdAt: '5 phút',
    },
  ],
  g2: [
    {
      id: 'gm7',
      conversationId: 'g2',
      senderId: 'u4',
      content: 'Anh em ơi, cuối tuần này lặn Hòn Mun đi!',
      createdAt: 'Hôm qua',
    },
    {
      id: 'gm8',
      conversationId: 'g2',
      senderId: 'u6',
      content: 'Có ai đem theo GoPro không?',
      createdAt: 'Hôm qua',
    },
  ],
}
