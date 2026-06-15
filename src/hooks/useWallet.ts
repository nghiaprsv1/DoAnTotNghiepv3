import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { walletService } from '@services/walletService'
import { useAuthStore } from '@store/authStore'

export function useMyWallet() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery({
    queryKey: ['wallet', 'me'],
    queryFn: () => walletService.me(),
    enabled: isAuthenticated,
  })
}

export function useRequestWithdrawal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ amount, bankAccount }: { amount: number; bankAccount?: string }) =>
      walletService.withdraw(amount, bankAccount),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet', 'me'] })
    },
  })
}
