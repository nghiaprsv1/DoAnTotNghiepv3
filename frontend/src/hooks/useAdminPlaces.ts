import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  placeService,
  type AdminPlacePayload,
  type AdminPlaceRow,
} from '@services/placeService'
import { useAuthStore } from '@store/authStore'
import { useCurrentUserStore } from '@store/currentUserStore'

function useIsAdmin() {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  const role = useCurrentUserStore((s) => s.role)
  return isAuth && role === 'admin'
}

/** Full place list (raw rows) for the admin management table. */
export function useAdminPlaces(keyword?: string) {
  const enabled = useIsAdmin()
  return useQuery<AdminPlaceRow[]>({
    queryKey: ['admin', 'places', keyword ?? ''],
    queryFn: () => placeService.listRaw({ keyword: keyword || undefined }),
    enabled,
  })
}

/** Place categories + provinces for the create/edit form selects. */
export function usePlaceCategories() {
  return useQuery({
    queryKey: ['places', 'categories'],
    queryFn: () => placeService.categories(),
  })
}

export function usePlaceProvinces() {
  return useQuery({
    queryKey: ['places', 'provinces'],
    queryFn: () => placeService.provinces(),
  })
}

export function useCreatePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: AdminPlacePayload) => placeService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'places'] }),
  })
}

export function useUpdatePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AdminPlacePayload }) =>
      placeService.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'places'] }),
  })
}

export function useDeletePlace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => placeService.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'places'] }),
  })
}
