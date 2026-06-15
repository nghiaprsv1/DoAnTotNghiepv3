import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { bookingService } from '@services/bookingService'
import { useMyWallet } from '@hooks/useWallet'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'
import type { TravelerBooking } from '@types/booking'

interface Props {
  booking: TravelerBooking
  isTraveler: boolean
  isGuide: boolean
}

const VND = (n: number) => `₫${Math.round(n).toLocaleString('vi-VN')}`

/**
 * Action panel for the booking detail page. Surfaces the right CTA based on
 * booking state + viewer role:
 *  - Guide  + pending_acceptance → Accept / Reject
 *  - Traveler + pending_payment   → Pay (debits wallet)
 *  - Traveler + confirmed         → Confirm completion (releases 90/10)
 *  - Either + confirmed           → Cancel (with refund rules)
 */
export function BookingActions({ booking, isTraveler, isGuide }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: wallet } = useMyWallet()
  const [reason, setReason] = useState('')
  const [showReason, setShowReason] = useState<null | 'reject' | 'cancel'>(null)

  const respond = useMutation({
    mutationFn: (vars: { action: 'accept' | 'reject' | 'pay' | 'cancel' | 'complete'; reason?: string }) =>
      bookingService.respond(booking.id, vars.action, vars.reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['booking', booking.id] })
      qc.invalidateQueries({ queryKey: ['bookings', 'me'] })
      qc.invalidateQueries({ queryKey: ['wallet', 'me'] })
      setShowReason(null)
      setReason('')
    },
  })

  const errorMsg =
    respond.error &&
    (((respond.error as { response?: { data?: { message?: string } } }).response?.data?.message) ??
      'Có lỗi xảy ra, thử lại.')
  const available = wallet ? Number(wallet.wallet.balanceAvailable) : 0
  const insufficient = isTraveler && booking.status === 'pending_payment' && available < booking.amount

  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 md:p-6 sticky top-24">
      <h3 className="font-headline font-extrabold text-lg text-on-surface mb-1">
        Hành động
      </h3>
      <p className="text-xs text-on-surface-variant mb-4">
        {isTraveler ? 'Bạn là người đặt' : isGuide ? 'Bạn là HDV nhận tour' : 'Khách quan sát'}
      </p>

      {/* Total */}
      <div className="bg-primary/5 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
          Tổng tiền
        </span>
        <span className="font-headline font-extrabold text-2xl text-on-surface">
          {VND(booking.amount)}
        </span>
      </div>

      {isTraveler && booking.status === 'pending_payment' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-4 py-3 mb-4 text-sm">
          <p className="font-bold text-amber-800 mb-1">Sẵn sàng thanh toán</p>
          <p className="text-on-surface-variant text-xs mb-2">
            Số dư khả dụng: <b>{VND(available)}</b>. Tiền sẽ bị tạm giữ đến khi bạn xác nhận hoàn
            thành chuyến đi.
          </p>
          {insufficient && (
            <Link
              to={ROUTES.WALLET}
              className="inline-flex items-center gap-1 text-error font-bold text-xs"
            >
              <Icon name="warning" size={14} />
              Số dư không đủ — yêu cầu admin nạp thêm
            </Link>
          )}
        </div>
      )}

      {/* Reject/cancel reason input */}
      {showReason && (
        <div className="mb-3">
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
            Lý do
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Lý do (tuỳ chọn)…"
            className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setShowReason(null)
                setReason('')
              }}
            >
              Đóng
            </Button>
            <Button
              size="sm"
              onClick={() => respond.mutate({ action: showReason, reason: reason || undefined })}
              disabled={respond.isPending}
            >
              Xác nhận {showReason === 'reject' ? 'từ chối' : 'huỷ'}
            </Button>
          </div>
        </div>
      )}

      {errorMsg && <p className="text-sm text-error mb-3">{errorMsg}</p>}

      {/* Actions */}
      <div className="space-y-2">
        {isGuide && booking.status === 'pending_acceptance' && (
          <>
            <Button
              size="lg"
              className="w-full"
              onClick={() => respond.mutate({ action: 'accept' })}
              disabled={respond.isPending}
            >
              <Icon name="check" /> Chấp nhận
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full"
              onClick={() => setShowReason('reject')}
              disabled={respond.isPending}
            >
              <Icon name="close" /> Từ chối
            </Button>
          </>
        )}
        {isTraveler && booking.status === 'pending_payment' && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => respond.mutate({ action: 'pay' })}
            disabled={respond.isPending || insufficient}
          >
            <Icon name="payments" /> Thanh toán {VND(booking.amount)}
          </Button>
        )}
        {isTraveler && booking.status === 'confirmed' && (
          <Button
            size="lg"
            className="w-full"
            onClick={() => respond.mutate({ action: 'complete' })}
            disabled={respond.isPending}
          >
            <Icon name="task_alt" /> Xác nhận hoàn thành
          </Button>
        )}
        {(isTraveler || isGuide) && booking.status === 'confirmed' && (
          <Button
            size="lg"
            variant="secondary"
            className={cn('w-full', isTraveler && booking.status === 'confirmed' ? '' : '')}
            onClick={() => setShowReason('cancel')}
            disabled={respond.isPending}
          >
            <Icon name="cancel" /> Huỷ chuyến
          </Button>
        )}
        <Button
          size="md"
          variant="secondary"
          className="w-full"
          onClick={() => navigate(ROUTES.MY_BOOKINGS)}
        >
          <Icon name="arrow_back" /> Quay lại danh sách
        </Button>
      </div>
    </div>
  )
}
