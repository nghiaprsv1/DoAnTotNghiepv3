import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { cn } from '@utils/cn'
import type { Booking } from '@constants/mockGuideDashboard'

interface Props {
  booking: Booking
  /** Show actions (Approve / Reject / Message) */
  showActions?: boolean
}

const statusStyles: Record<Booking['status'], { label: string; cls: string; dot: string }> = {
  pending: {
    label: 'Chờ duyệt',
    cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    dot: 'bg-amber-500',
  },
  confirmed: {
    label: 'Đã xác nhận',
    cls: 'bg-green-500/15 text-green-700 border-green-500/30',
    dot: 'bg-green-500',
  },
  completed: {
    label: 'Đã hoàn thành',
    cls: 'bg-primary/10 text-primary border-primary/30',
    dot: 'bg-primary',
  },
  cancelled: {
    label: 'Đã huỷ',
    cls: 'bg-error/10 text-error border-error/30',
    dot: 'bg-error',
  },
}

export function BookingRow({ booking, showActions }: Props) {
  const s = statusStyles[booking.status]

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-editorial border border-outline-variant/10 flex flex-col md:flex-row gap-4 md:items-center">
      <div className="flex items-center gap-3 md:flex-1 min-w-0">
        <Avatar src={booking.customerAvatar} alt={booking.customerName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="font-headline font-bold text-on-surface truncate">
            {booking.customerName}
          </p>
          <p className="text-sm text-on-surface-variant truncate">{booking.tourTitle}</p>
        </div>
      </div>

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
        {showActions && booking.status === 'pending' && (
          <>
            <button
              type="button"
              aria-label="Xác nhận"
              className="w-9 h-9 rounded-full bg-green-500/15 text-green-700 hover:bg-green-500/25 flex items-center justify-center transition"
            >
              <Icon name="check" size={18} />
            </button>
            <button
              type="button"
              aria-label="Từ chối"
              className="w-9 h-9 rounded-full bg-error/10 text-error hover:bg-error/20 flex items-center justify-center transition"
            >
              <Icon name="close" size={18} />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Nhắn tin"
          className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface-variant flex items-center justify-center transition"
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
