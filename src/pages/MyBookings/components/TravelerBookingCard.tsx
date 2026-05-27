import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Avatar } from '@components/ui/Avatar'
import { ReviewModal } from '@components/features/ReviewModal'
import type { ReviewTarget } from '@components/features/ReviewModal'
import { guideDetailPath, messageThreadPath } from '@constants/routes'
import { cn } from '@utils/cn'
import type { TravelerBooking, BookingStatus } from '@types/booking'

interface Props {
  booking: TravelerBooking
  onCancel?: (id: string) => void
  onMarkReviewed?: (id: string) => void
}

const STATUS: Record<
  BookingStatus,
  { label: string; cls: string; dot: string; icon: string; helper: string }
> = {
  pending: {
    label: 'Chờ HDV phản hồi',
    cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
    dot: 'bg-amber-500',
    icon: 'hourglass_top',
    helper: 'HDV thường phản hồi trong 24 giờ. Nếu không, yêu cầu sẽ tự huỷ.',
  },
  confirmed: {
    label: 'Đã xác nhận',
    cls: 'bg-green-500/15 text-green-700 border-green-500/30',
    dot: 'bg-green-500',
    icon: 'check_circle',
    helper: 'HDV đã xác nhận. Hẹn gặp bạn trong chuyến đi!',
  },
  completed: {
    label: 'Đã hoàn thành',
    cls: 'bg-primary/10 text-primary border-primary/30',
    dot: 'bg-primary',
    icon: 'task_alt',
    helper: 'Hành trình kết thúc. Đánh giá để giúp HDV và cộng đồng.',
  },
  cancelled: {
    label: 'Đã huỷ',
    cls: 'bg-error/10 text-error border-error/30',
    dot: 'bg-error',
    icon: 'event_busy',
    helper: '',
  },
}

export function TravelerBookingCard({ booking, onCancel, onMarkReviewed }: Props) {
  const [openReview, setOpenReview] = useState(false)
  const s = STATUS[booking.status]
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed'
  const canReview = booking.status === 'completed' && !booking.hasReview

  const target: ReviewTarget = {
    kind: 'guide',
    name: booking.guide.name,
    image: booking.guide.avatar,
    context: `Tour: ${booking.tourTitle}`,
  }

  return (
    <article className="bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden flex flex-col md:flex-row">
      {/* Cover */}
      <Link
        to={guideDetailPath(booking.guide.id)}
        className="md:w-56 h-44 md:h-auto relative flex-shrink-0 overflow-hidden group"
      >
        <img
          src={booking.tourCover}
          alt={booking.tourTitle}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent md:bg-gradient-to-r" />
        <span
          className={cn(
            'absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur',
            s.cls
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
          {s.label}
        </span>
      </Link>

      {/* Body */}
      <div className="flex-1 p-5 md:p-6 flex flex-col">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-headline font-extrabold text-lg text-on-surface leading-tight">
              {booking.tourTitle}
            </h3>
            <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
              <Icon name="location_on" size={14} />
              {booking.destination}
              <span className="text-on-surface-variant/40 mx-1">·</span>
              <span>Đặt {booking.createdAt}</span>
            </p>
          </div>
          <p className="font-headline font-extrabold text-xl text-on-surface whitespace-nowrap">
            {booking.currency}
            {booking.amount.toLocaleString('vi-VN')}
          </p>
        </div>

        {/* Guide chip */}
        <Link
          to={guideDetailPath(booking.guide.id)}
          className="inline-flex items-center gap-2 p-2 -ml-2 rounded-2xl hover:bg-surface-container-low transition w-fit mb-3"
        >
          <Avatar src={booking.guide.avatar} alt={booking.guide.name} size="xs" ring />
          <span className="font-headline font-bold text-sm text-on-surface">
            {booking.guide.name}
          </span>
          <Icon name="star" size={12} className="text-primary fill" />
          <span className="text-xs text-on-surface-variant">{booking.guide.rating.toFixed(2)}</span>
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-on-surface-variant mb-3">
          <span className="inline-flex items-center gap-1">
            <Icon name="event" size={14} />
            {booking.startDate}
            {booking.endDate && booking.endDate !== booking.startDate && ` → ${booking.endDate}`}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="schedule" size={14} />
            {booking.durationDays} ngày
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="groups" size={14} />
            {booking.groupSize} khách
          </span>
        </div>

        {/* Helper / message */}
        {(s.helper || booking.message || booking.cancelReason) && (
          <div
            className={cn(
              'rounded-2xl p-3 text-xs mb-3 flex items-start gap-2',
              booking.status === 'cancelled'
                ? 'bg-error/5 text-error'
                : 'bg-surface-container-low text-on-surface-variant'
            )}
          >
            <Icon name={s.icon} size={14} className="mt-0.5 flex-shrink-0" />
            <div className="leading-relaxed">
              {booking.cancelReason && (
                <p>
                  <strong>Lý do huỷ:</strong> {booking.cancelReason}
                </p>
              )}
              {booking.message && (
                <p className="italic">"{booking.message}"</p>
              )}
              {!booking.cancelReason && !booking.message && s.helper && <p>{s.helper}</p>}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 mt-auto pt-3 border-t border-outline-variant/15">
          <Link to={messageThreadPath(booking.guide.id)}>
            <Button variant="ghost" size="md" rounded="full">
              <Icon name="chat" size={16} />
              Nhắn HDV
            </Button>
          </Link>
          {canReview && (
            <Button size="md" rounded="full" onClick={() => setOpenReview(true)}>
              <Icon name="rate_review" size={16} />
              Viết đánh giá
            </Button>
          )}
          {booking.hasReview && booking.status === 'completed' && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-primary bg-primary/10">
              <Icon name="check_circle" size={14} className="fill" />
              Đã đánh giá
            </span>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => onCancel?.(booking.id)}
              className="ml-auto inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm text-error font-bold hover:bg-error/10 transition"
            >
              <Icon name="close" size={16} />
              Huỷ booking
            </button>
          )}
        </div>
      </div>

      <ReviewModal
        open={openReview}
        onClose={() => setOpenReview(false)}
        target={target}
        onSubmit={() => onMarkReviewed?.(booking.id)}
      />
    </article>
  )
}
