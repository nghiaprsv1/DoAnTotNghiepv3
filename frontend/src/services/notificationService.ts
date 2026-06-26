import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'
import type { Notification } from '@types/notification'

export const notificationService = {
  list: async (): Promise<Notification[]> => {
    const res = await axiosInstance.get<ApiResponse<Notification[]>>('/notifications')
    return unwrap(res)
  },

  detail: async (id: string): Promise<Notification> => {
    const res = await axiosInstance.get<ApiResponse<Notification>>(`/notifications/${id}`)
    return unwrap(res)
  },

  unreadCount: async (): Promise<number> => {
    const res = await axiosInstance.get<ApiResponse<{ count: number }>>(
      '/notifications/unread-count',
    )
    return unwrap(res).count
  },

  markRead: async (id: string): Promise<void> => {
    await axiosInstance.put(`/notifications/${id}/read`)
  },

  markAllRead: async (): Promise<void> => {
    await axiosInstance.put('/notifications/read-all')
  },

  remove: async (id: string): Promise<void> => {
    await axiosInstance.delete(`/notifications/${id}`)
  },
}
