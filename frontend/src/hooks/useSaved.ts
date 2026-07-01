import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { savedService, type SavedType } from '@services/savedService'
import { useAuthStore } from '@store/authStore'

/** Saved posts for the current user (Profile "Đã lưu" tab). */
export function useSavedPosts(enabled = true) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['saved', 'posts'],
    queryFn: () => savedService.posts(),
    enabled: enabled && isAuth,
  })
}

export function useSavedTrips(enabled = true) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['saved', 'trips'],
    queryFn: () => savedService.trips(),
    enabled: enabled && isAuth,
  })
}

export function useSavedGuides(enabled = true) {
  const isAuth = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['saved', 'guides'],
    queryFn: () => savedService.guides(),
    enabled: enabled && isAuth,
  })
}

/**
 * Toggle a bookmark on a post / trip / guide. Invalidates the relevant saved
 * list AND the domain queries (trips/trip detail, places, guides, posts) so the
 * `isSaved` flag refreshes everywhere the item is shown — list cards, detail
 * pages, recommendations. Returns the mutation so callers can read
 * `isPending` / await the result for optimistic UI.
 */
export function useToggleSaved() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ type, id }: { type: SavedType; id: string }) =>
      savedService.toggle(type, id),
    onSuccess: (_data, { type, id }) => {
      // Danh sách "Đã lưu" trong Profile.
      qc.invalidateQueries({ queryKey: ['saved', `${type}s`] })
      // Cờ isSaved nằm trong dữ liệu domain → làm mới để thẻ/chi tiết đồng bộ.
      const domainKey = { trip: 'trips', place: 'places', guide: 'guides', post: 'posts' }[
        type
      ]
      if (domainKey) {
        qc.invalidateQueries({ queryKey: [domainKey] })
        qc.invalidateQueries({ queryKey: [domainKey.slice(0, -1), id] }) // ['trip', id] / ['place', id]…
      }
    },
  })
}
