import { useQuery } from '@tanstack/react-query'
import { placeService } from '@services/placeService'

export function usePlaces(params?: {
  category?: string
  province?: string
  keyword?: string
}) {
  return useQuery({
    queryKey: ['places', params],
    queryFn: () => placeService.list(params),
  })
}

export function usePlace(id: string | undefined) {
  return useQuery({
    queryKey: ['place', id],
    queryFn: () => placeService.getById(id as string),
    enabled: Boolean(id),
  })
}

export function usePlaceCategories() {
  return useQuery({
    queryKey: ['place-categories'],
    queryFn: () => placeService.categories(),
    staleTime: 1000 * 60 * 30,
  })
}

export function usePlaceProvinces() {
  return useQuery({
    queryKey: ['place-provinces'],
    queryFn: () => placeService.provinces(),
    staleTime: 1000 * 60 * 30,
  })
}
