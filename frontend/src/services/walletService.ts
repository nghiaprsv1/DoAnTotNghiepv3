import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'

export interface Wallet {
  id: string
  userId: string
  balanceAvailable: number
  balanceFrozen: number
  currency: string
}

export type WalletTxnType =
  | 'hold'
  | 'release'
  | 'refund'
  | 'commission'
  | 'penalty'
  | 'withdraw_request'
  | 'withdraw_success'
  | 'withdraw_rejected'
  | 'topup'
  | 'payment'

export type WalletTxnStatus = 'pending' | 'success' | 'failed'

export interface WalletTransaction {
  id: string
  walletId: string
  type: WalletTxnType
  status: WalletTxnStatus
  amount: number
  currency: string
  note?: string
  bookingId?: string | null
  bankAccount?: string
  createdAt: string
}

export interface WalletSummary {
  wallet: Wallet
  transactions: WalletTransaction[]
}

export const walletService = {
  me: async (): Promise<WalletSummary> => {
    const res = await axiosInstance.get<ApiResponse<WalletSummary>>('/guides/wallet/me')
    return unwrap(res)
  },
  withdraw: async (amount: number, bankAccount?: string): Promise<WalletTransaction> => {
    const res = await axiosInstance.post<ApiResponse<WalletTransaction>>(
      '/guides/wallet/withdrawals',
      { amount, bankAccount },
    )
    return unwrap(res)
  },
}
