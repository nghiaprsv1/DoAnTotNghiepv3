import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import type { JoinRequestStatus, Trip } from '@types/trip'

interface Props {
  trip: Trip
  onJoin: () => void
  isFull: boolean
  /** Set when a join request action is in flight. */
  pending?: boolean
  /** Status of the viewer's existing join request, if any. */
  requestStatus?: JoinRequestStatus | null
}

interface CtaState {
  label: string
  icon: string
  disabled: boolean
  helper?: string
}

function buildCta(
  isFull: boolean,
  status: JoinRequestStatus | null | undefined,
  pending: boolean,
): CtaState {
  if (pending) {
    return { label: 'Đang gửi yêu cầu...', icon: 'hourglass_top', disabled: true }
  }
  if (status === 'pending') {
    return {
      label: 'Đang chờ duyệt',
      icon: 'pending',
      disabled: true,
      helper: 'Yêu cầu của bạn đã gửi tới chủ chuyến. Bạn sẽ được thông báo khi có phản hồi.',
    }
  }
  if (status === 'rejected') {
    return {
      label: 'Yêu cầu đã bị từ chối',
      icon: 'block',
      disabled: true,
      helper: 'Chủ chuyến đã từ chối yêu cầu của bạn lần trước.',
    }
  }
  if (isFull) {
    return { label: 'Đã hết chỗ', icon: 'event_busy', disabled: true }
  }
  return { label: 'Gửi yêu cầu tham gia', icon: 'flight_takeoff', disabled: false }
}

export function JoinPanel({ trip, onJoin, isFull, pending = false, requestStatus }: Props) {
  const cta = buildCta(isFull, requestStatus, pending)

  return (
    <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-editorial-lg border-t-4 border-primary">
      <div className="flex justify-between items-start mb-6">
        <div>
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
            Khởi điểm từ
          </span>
          <h4 className="text-4xl font-extrabold text-on-surface font-headline">
            {trip.currency}
            {trip.priceFrom}
            <span className="text-lg font-medium text-on-surface-variant">/người</span>
          </h4>
        </div>
        <Badge variant="outline" size="sm" className="uppercase">
          {isFull ? 'Đã đủ' : 'Còn chỗ'}
        </Badge>
      </div>

      <div className="space-y-3 mb-6">
        {[
          ['route', `${trip.durationDays} ngày tại ${trip.destination}`],
          ['groups', `Tối đa ${trip.maxMembers} người`],
          ['verified_user', 'Bảo hiểm du lịch & thiết bị'],
          ['support_agent', 'Hướng dẫn viên địa phương'],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-3 text-on-surface/85">
            <Icon name={icon} className="text-primary" size={18} />
            <span className="text-sm">{text}</span>
          </div>
        ))}
      </div>

      <Button
        size="lg"
        className="w-full mb-3"
        onClick={onJoin}
        disabled={cta.disabled}
      >
        <Icon name={cta.icon} />
        {cta.label}
      </Button>
      <Button variant="secondary" size="lg" className="w-full">
        <Icon name="favorite_border" />
        Lưu vào yêu thích
      </Button>
      <p className="text-center text-xs text-on-surface-variant mt-4">
        {cta.helper ?? 'Chủ chuyến cần duyệt trước khi bạn vào nhóm.'}
      </p>
    </section>
  )
}
