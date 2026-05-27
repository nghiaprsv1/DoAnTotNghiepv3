import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import type { Trip } from '@types/trip'

interface Props {
  trip: Trip
  onJoin: () => void
  isFull: boolean
}

export function JoinPanel({ trip, onJoin, isFull }: Props) {
  return (
    <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-editorial-lg border-t-4 border-primary sticky top-24">
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
        disabled={isFull}
      >
        {isFull ? (
          <>Đã hết chỗ</>
        ) : (
          <>
            <Icon name="flight_takeoff" />
            Tham gia ngay
          </>
        )}
      </Button>
      <Button variant="secondary" size="lg" className="w-full">
        <Icon name="favorite_border" />
        Lưu vào yêu thích
      </Button>
      <p className="text-center text-xs text-on-surface-variant mt-4">
        Bạn sẽ được hoàn tiền 100% nếu huỷ trong 24h.
      </p>
    </section>
  )
}
