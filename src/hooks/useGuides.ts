import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

/** The signed-in guide's own profile (any approval status). */
export function useMyGuideProfile(enabled = true) {
  return useQuery({
    queryKey: ['guide', 'me'],
    queryFn: () => guideService.getMyProfile(),
    enabled,
  })
}

/** Update the signed-in guide's own professional profile. */
export function useUpdateMyGuideProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: guideService.updateMyProfile,
    onSuccess: (updated) => {
      qc.setQueryData(['guide', 'me'], updated)
      qc.invalidateQueries({ queryKey: ['guide', updated.id] })
      qc.invalidateQueries({ queryKey: ['guides'] })
    },
  })
}
