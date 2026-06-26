import axiosInstance from './axiosInstance'
import { unwrap } from './unwrap'
import type { ApiResponse } from '@types/common'

/**
 * SePay deposit intent — the user transfers `amount` VND to the returned
 * bank account, including `transferCode` in the description. SePay's webhook
 * then credits the wallet.
 */
export interface SepayIntent {
  txnId: string
  transferCode: string
  amount: number
  bankAccount: string
  bankName: string
  accountHolder: string
  qrUrl: string | null
}

export const paymentService = {
  /** Kick off a SePay deposit. Returns bank info + QR for the FE to render. */
  createSepayIntent: async (amount: number): Promise<SepayIntent> => {
    const res = await axiosInstance.post<ApiResponse<SepayIntent>>(
      '/payments/sepay/intent',
      { amount },
    )
    return unwrap(res)
  },
}
