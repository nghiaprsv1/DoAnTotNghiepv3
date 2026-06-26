import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'
import type { TravelerBooking } from '@types/booking'

interface Step {
  key: TravelerBooking['status'] | 'created'
  label: string
  icon: string
  at?: string
  done: boolean
  current?: boolean
}

/** Visual state-machine timeline for a booking. */
export function BookingTimeline({ booking }: { booking: TravelerBooking }) {
  const status = booking.status

  // Linear happy-path. Cancelled/rejected/expired show as a side branch.
  const isHappyPath =
    status === 'pending_acceptance' ||
    status === 'pending_payment' ||
    status === 'confirmed' ||
    status === 'completed' ||
    status === 'pending'

  const steps: Step[] = isHappyPath
    ? [
        {
          key: 'created',
          label: 'Gửi yêu cầu',
          icon: 'send',
          at: booking.createdAt,
          done: true,
        },
        {
          key: 'pending_payment',
          label: 'HDV chấp nhận',
          icon: 'check_circle',
          at: booking.acceptedAt,
          done: ['pending_payment', 'confirmed', 'completed'].includes(status),
          current: status === 'pending_acceptance',
        },
        {
          key: 'confirmed',
          label: 'Khách thanh toán',
          icon: 'payments',
          at: booking.paidAt,
          done: ['confirmed', 'completed'].includes(status),
          current: status === 'pending_payment',
        },
        {
          key: 'completed',
          label: 'Hoàn thành (giải ngân 90/10)',
          icon: 'task_alt',
          at: booking.completedAt,
          done: status === 'completed',
          current: status === 'confirmed',
        },
      ]
    : [
        {
          key: 'created',
          label: 'Gửi yêu cầu',
          icon: 'send',
          at: booking.createdAt,
          done: true,
        },
        {
          key: status,
          label:
            status === 'rejected'
              ? 'HDV đã từ chối'
              : status === 'expired'
                ? 'Hết hạn (quá 24h không thanh toán)'
                : 'Đã huỷ',
          icon: status === 'rejected' || status === 'cancelled' ? 'cancel' : 'schedule',
          done: true,
          current: true,
        },
      ]

  return (
    <ol className="relative border-l-2 border-outline-variant/30 ml-3 space-y-5 py-1">
      {steps.map((s, i) => (
        <li key={`${s.key}-${i}`} className="ml-5">
          <span
            className={cn(
              'absolute -left-3.5 flex items-center justify-center w-7 h-7 rounded-full',
              s.done
                ? 'bg-primary text-on-primary shadow-editorial'
                : s.current
                  ? 'bg-amber-500 text-white animate-pulse'
                  : 'bg-surface-container text-on-surface-variant',
            )}
          >
            <Icon name={s.icon} size={14} />
          </span>
          <p
            className={cn(
              'font-headline font-bold',
              s.done ? 'text-on-surface' : 'text-on-surface-variant',
            )}
          >
            {s.label}
          </p>
          {s.at && (
            <p className="text-xs text-on-surface-variant mt-0.5">
              {new Date(s.at).toLocaleString('vi-VN')}
            </p>
          )}
          {!s.at && s.current && (
            <p className="text-xs text-amber-700 mt-0.5 italic">Đang chờ…</p>
          )}
        </li>
      ))}
    </ol>
  )
}
