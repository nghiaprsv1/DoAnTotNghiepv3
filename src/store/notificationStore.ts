import { create } from 'zustand'
import type { Notification } from '@types/notification'

interface NotificationStore {
  items: Notification[]
  /** Replace items, e.g. after fetching from API. */
  setItems: (items: Notification[]) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  remove: (id: string) => void
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  items: [],
  setItems: (items) => set({ items }),
  markAsRead: (id) =>
    set((state) => ({
      items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
  markAllAsRead: () =>
    set((state) => ({
      items: state.items.map((n) => ({ ...n, read: true })),
    })),
  remove: (id) =>
    set((state) => ({
      items: state.items.filter((n) => n.id !== id),
    })),
  unreadCount: () => get().items.filter((n) => !n.read).length,
}))
