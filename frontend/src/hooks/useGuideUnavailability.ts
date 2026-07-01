import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { guideService } from '@services/guideService'

const KEY = ['guide', 'me', 'unavailability']

/** Danh sách ngày nghỉ HDV tự đánh dấu (của chính mình). */
export function useMyUnavailability(enabled = true) {
  return useQuery({
    queryKey: KEY,
    queryFn: () => guideService.myUnavailability(),
    enabled,
  })
}

/** Thêm 1 khoảng ngày nghỉ. Invalidate danh sách + lịch bận công khai. */
export function useAddUnavailability(guideId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { startDate: string; endDate: string; note?: string }) =>
      guideService.addUnavailability(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      if (guideId) qc.invalidateQueries({ queryKey: ['guide', guideId, 'busy-dates'] })
    },
  })
}

/** Gỡ 1 khoảng ngày nghỉ. */
export function useRemoveUnavailability(guideId?: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => guideService.removeUnavailability(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY })
      if (guideId) qc.invalidateQueries({ queryKey: ['guide', guideId, 'busy-dates'] })
    },
  })
}
