import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminService, type AdminUsersQuery, type AdminListQuery } from '@services/adminService'
import { useCurrentUserStore } from '@store/currentUserStore'
import { useAuthStore } from '@store/authStore'

/** Only fetch admin endpoints when the current user is an admin. */
function useIsAdmin() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useCurrentUserStore((s) => s.role)
  return isAuthenticated && role === 'admin'
}

export function useAdminDashboard() {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminService.dashboard(),
    enabled,
  })
}

export function useAdminRevenue(start?: string, end?: string) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'revenue', start, end],
    queryFn: () => adminService.revenue(start, end),
    enabled,
  })
}

export function useAdminUsers(q: AdminUsersQuery) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'users', q],
    queryFn: () => adminService.users(q),
    enabled,
  })
}

export function usePendingGuides() {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'pendingGuides'],
    queryFn: () => adminService.pendingGuides(),
    enabled,
  })
}

export function usePendingWithdrawals() {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'pendingWithdrawals'],
    queryFn: () => adminService.pendingWithdrawals(),
    enabled,
  })
}

export function useLockUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, lock }: { id: string; lock: boolean }) =>
      lock ? adminService.lockUser(id) : adminService.unlockUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  })
}

export function useApproveGuide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.approveGuide(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pendingGuides'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useRejectGuide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminService.rejectGuide(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'pendingGuides'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useDecideWithdrawal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string
      action: 'approve' | 'reject'
      reason?: string
    }) => adminService.decideWithdrawal(id, action, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pendingWithdrawals'] }),
  })
}

export function useBroadcastNotification() {
  return useMutation({
    mutationFn: adminService.broadcastNotification,
  })
}

export function useAdminWallets(search?: string) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'wallets', search ?? ''],
    queryFn: () => adminService.wallets(search),
    enabled,
  })
}

export function useAdminTopUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, amount, note }: { userId: string; amount: number; note?: string }) =>
      adminService.topUpUser(userId, amount, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'wallets'] })
      qc.invalidateQueries({ queryKey: ['admin', 'revenue'] })
    },
  })
}

export function useAdminBulkTopUp() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      userIds,
      amount,
      note,
    }: {
      userIds: string[]
      amount: number
      note?: string
    }) => adminService.topUpManyUsers(userIds, amount, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'wallets'] })
      qc.invalidateQueries({ queryKey: ['admin', 'revenue'] })
    },
  })
}

export function useRegistrationStats(
  granularity: 'day' | 'week' | 'month' = 'day',
  start?: string,
  end?: string,
) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'registrations', granularity, start, end],
    queryFn: () => adminService.registrationStats(granularity, start, end),
    enabled,
  })
}

export function useGuideRevenueDetail(guideId: string | undefined) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'guideRevenue', guideId],
    queryFn: () => adminService.guideRevenueDetail(guideId as string),
    enabled: enabled && Boolean(guideId),
  })
}

export function useAdminPosts(q: AdminListQuery = {}) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'posts', q],
    queryFn: () => adminService.posts(q),
    enabled,
  })
}

export function useDeleteAdminPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminService.deletePost(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'posts'] }),
  })
}

export function useAdminTrips(q: AdminListQuery = {}) {
  const enabled = useIsAdmin()
  return useQuery({
    queryKey: ['admin', 'trips', q],
    queryFn: () => adminService.trips(q),
    enabled,
  })
}
