import { useQuery } from '@tanstack/react-query'
import { guideService } from '@services/guideService'

export function useGuides(params?: {
  region?: string
  category?: string
  availability?: string
  language?: string
  availableFrom?: string
  availableTo?: string
}) {
  return useQuery({
    queryKey: ['guides', params],
    queryFn: () => guideService.list(params),
  })
}

export function useGuide(id: string | undefined) {
  return useQuery({
    queryKey: ['guide', id],
    queryFn: () => guideService.getById(id as string),
    enabled: Boolean(id),
  })
}
