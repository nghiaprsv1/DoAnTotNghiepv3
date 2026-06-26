import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { tripService } from '@services/tripService'

interface UseTripsOptions {
  creatorId?: string
  search?: string
}

export function useTrips(opts: UseTripsOptions = {}) {
  return useQuery({
    queryKey: ['trips', opts],
    queryFn: () => tripService.list(opts),
  })
}

export function useUserTrips(userId: string | undefined) {
  return useQuery({
    queryKey: ['trips', 'by-creator', userId],
    queryFn: () => tripService.list({ creatorId: userId }),
    enabled: Boolean(userId),
  })
}

export function useTrip(id: string | undefined) {
  return useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getById(id as string),
    enabled: Boolean(id),
  })
}

export function useMyCreatedTrips(enabled = true) {
  return useQuery({
    queryKey: ['trips', 'mine', 'created'],
    queryFn: () => tripService.myCreated(),
    enabled,
  })
}

export function useMyJoinedTrips(enabled = true) {
  return useQuery({
    queryKey: ['trips', 'mine', 'joined'],
    queryFn: () => tripService.myJoined(),
    enabled,
  })
}

/** Personalised recommendations driven by the user's TravelPreferences. */
export function useRecommendedTrips(limit = 6, enabled = true) {
  return useQuery({
    queryKey: ['trips', 'recommended', limit],
    queryFn: () => tripService.recommended(limit),
    enabled,
  })
}

/** Cancel a trip (creator only). Refreshes the trip detail + list caches. */
export function useCancelTrip(tripId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => tripService.cancel(tripId as string),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trip', tripId] })
      qc.invalidateQueries({ queryKey: ['trips'] })
    },
  })
}
