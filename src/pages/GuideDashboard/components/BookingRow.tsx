import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { useOpenDirectChat } from '@hooks/useMessages'
import { bookingService } from '@services/bookingService'
import { bookingDetailPath, userProfilePath } from '@constants/routes'
import { cn } from '@utils/cn'
import type { DashboardBooking } from '@types/guideDashboard'

interface Props {
  booking: DashboardBooking
  /** Show actions (Approve / Reject / Complete / Message) for the guide. */
  showActions?: boolean
}

const statusStyles: Record<
  DashboardBooking['status'],
  { label: string; cls: string; dot: string }
> = {
  pending: { label: 'Chờ duyệt', cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30', dot: 'bg-amber-500' },
  pending_acceptance: { label: 'Chờ duyệt', cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30', dot: 'bg-amber-500' },
  pending_payment: { label: 'Chờ thanh toán', cls: 'bg-orange-500/15 text-orange-700 border-orange-500/30', dot: 'bg-orange-500' },
  confirmed: { label: 'Đã xác nhận', cls: 'bg-green-500/15 text-green-700 border-green-500/30', dot: 'bg-green-500' },
  expired: { label: 'Hết hạn', cls: 'bg-on-surface-variant/10 text-on-surface-variant border-on-surface-variant/30', dot: 'bg-on-surface-variant' },
  completed: { label: 'Đã hoàn thành', cls: 'bg-primary/10 text-primary border-primary/30', dot: 'bg-primary' },
  cancelled: { label: 'Đã huỷ', cls: 'bg-error/10 text-error border-error/30', dot: 'bg-error' },
  rejected: { label: 'Bị từ chối', cls: 'bg-error/10 text-error border-error/30', dot: 'bg-error' },
}

/**
 * Single-row presentation of a booking on the guide dashboard. When
 * `showActions` is set, exposes the lifecycle CTAs the guide may take:
 *  - Pending acceptance → Accept (move to PENDING_PAYMENT) / Reject
 *  - Confirmed         → Complete (settles 90/10 commission)
 *  - Any state         → Message the customer (opens DM)
 */
export function BookingRow({ booking, showActions }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const openDirect = useOpenDirectChat()
  const s = statusStyles[booking.status] ?? statusStyles.pending

  const respond = useMutation({
    mutationFn: (action: 'accept' | 'reject' | 'cancel') =>
      bookingService.respond(booking.id, action),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bookings', 'me', 'guide'] })
      qc.invalidateQueries({ queryKey: ['bookings', 'me', 'traveler'] })
      qc.invalidateQueries({ queryKey: ['wallet', 'me'] })
    },
  })

  const handleChat = () => {
    if (!booking.customerId) {
      navigate('/messages')
      return
    }
    openDirect(booking.customerId).catch(() => navigate('/messages'))
  }

  const handleProfile = () => {
    if (booking.customerId) navigate(userProfilePath(booking.customerId))
  }

  const isAwaiting = booking.status === 'pending' || booking.status === 'pending_acceptance'
  const isConfirmed = booking.status === 'confirmed'

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-editorial border border-outline-variant/10 flex flex-col md:flex-row gap-4 md:items-center">
      <button
        type="button"
        onClick={handleProfile}
        disabled={!booking.customerId}
        className="flex items-center gap-3 md:flex-1 min-w-0 text-left disabled:cursor-default"
      >
        <Avatar src={booking.customerAvatar} alt={booking.customerName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-headline font-bold text-on-surface truncate hover:text-primary transition">
            {booking.customerName}
          </p>
          <p className="text-sm text-on-surface-variant truncate">{booking.tourTitle}</p>
          {booking.message && (
            <p className="text-xs text-on-surface-variant/70 italic truncate mt-0.5">
              "{booking.message}"
            </p>
          )}
        </div>
      </button>

      <div className="grid grid-cols-2 md:flex md:items-center gap-3 md:gap-6 text-sm">
        <Stat icon="event" text={booking.date} />
        <Stat icon="schedule" text={`${booking.durationDays} ngày`} />
        <Stat icon="groups" text={`${booking.groupSize} khách`} />
        <p className="font-headline font-extrabold text-on-surface">
          ₫{booking.amount.toLocaleString('vi-VN')}
        </p>
      </div>

      <div className="flex items-center gap-2 md:ml-auto">
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border',
            s.cls
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
          {s.label}
        </span>
        {showActions && isAwaiting && (
          <>
            <button
              type="button"
              onClick={() => respond.mutate('accept')}
              disabled={respond.isPending}
              aria-label="Xác nhận"
              title="Xác nhận yêu cầu"
              className="w-9 h-9 rounded-full bg-green-500/15 text-green-700 hover:bg-green-500/25 disabled:opacity-50 flex items-center justify-center transition"
            >
              <Icon name="check" size={18} />
            </button>
            <button
              type="button"
              onClick={() => respond.mutate('reject')}
              disabled={respond.isPending}
              aria-label="Từ chối"
              title="Từ chối yêu cầu"
              className="w-9 h-9 rounded-full bg-error/10 text-error hover:bg-error/20 disabled:opacity-50 flex items-center justify-center transition"
            >
              <Icon name="close" size={18} />
            </button>
          </>
        )}
        {showActions && isConfirmed && (
          <button
            type="button"
            onClick={() => navigate(bookingDetailPath(booking.id))}
            title="Xem chi tiết — khách sẽ xác nhận hoàn thành"
            className="inline-flex items-center gap-1 px-3 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 text-xs font-headline font-bold transition"
          >
            <Icon name="task_alt" size={16} />
            Chờ khách xác nhận
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate(bookingDetailPath(booking.id))}
          aria-label="Chi tiết"
          title="Xem chi tiết booking"
          className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center transition"
        >
          <Icon name="open_in_new" size={18} />
        </button>
        <button
          type="button"
          onClick={handleChat}
          aria-label="Nhắn tin"
          title="Nhắn tin với khách"
          className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-primary flex items-center justify-center transition"
        >
          <Icon name="chat" size={18} />
        </button>
      </div>
    </div>
  )
}

function Stat({ icon, text }: { icon: string; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-on-surface-variant">
      <Icon name={icon} size={14} />
      {text}
    </span>
  )
}
