import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '@services/notificationService'
import { useNotificationStore } from '@store/notificationStore'
import { useAuthStore } from '@store/authStore'
import type { Notification } from '@types/notification'

/**
 * Fetches the authenticated user's notifications from the API and pushes them
 * into the zustand store so the bell + page stay in sync.
 * Skips the request when the user is unauthenticated.
 */
export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setItems = useNotificationStore((s) => s.setItems)
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
    enabled: isAuthenticated,
  })

  useEffect(() => {
    if (query.data) setItems(query.data)
  }, [query.data, setItems])

  return query
}

export function useNotification(id: string | undefined) {
  return useQuery({
    queryKey: ['notification', id],
    queryFn: () => notificationService.detail(id as string),
    enabled: Boolean(id),
  })
}

export function useUnreadNotificationCount() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationService.unreadCount(),
    refetchInterval: 30000,
    enabled: isAuthenticated,
  })
}

/**
 * Persist "marked as read" to the BE so the unread badge stays cleared after
 * refresh / refetch. Optimistically updates the local store so the UI feels
 * instant.
 */
export function useMarkNotificationRead() {
  const qc = useQueryClient()
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onMutate: (id) => {
      markAsRead(id)
      // Optimistically patch the cached list so a refetch race doesn't undo it.
      qc.setQueryData<Notification[] | undefined>(['notifications'], (prev) =>
        prev ? prev.map((n) => (n.id === id ? { ...n, read: true } : n)) : prev,
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onMutate: () => {
      markAllAsRead()
      qc.setQueryData<Notification[] | undefined>(['notifications'], (prev) =>
        prev ? prev.map((n) => ({ ...n, read: true })) : prev,
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  const remove = useNotificationStore((s) => s.remove)
  return useMutation({
    mutationFn: (id: string) => notificationService.remove(id),
    onMutate: (id) => {
      remove(id)
      qc.setQueryData<Notification[] | undefined>(['notifications'], (prev) =>
        prev ? prev.filter((n) => n.id !== id) : prev,
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    },
  })
}
