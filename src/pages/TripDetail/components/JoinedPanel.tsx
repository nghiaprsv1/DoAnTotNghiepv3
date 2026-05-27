import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { messageThreadPath } from '@constants/routes'
import type { Trip } from '@types/trip'

interface Props {
  trip: Trip
  onLeave: () => void
}

export function JoinedPanel({ trip, onLeave }: Props) {
  return (
    <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-editorial-lg border-t-4 border-primary sticky top-24">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-widest mb-4">
        <Icon name="check_circle" size={14} className="fill" />
        Bạn đang tham gia
      </div>

      <h4 className="text-2xl font-extrabold text-on-surface font-headline mb-1">
        Hành trình của bạn
      </h4>
      <p className="text-sm text-on-surface-variant mb-5">
        {trip.startDate} – {trip.endDate} · {trip.destination}
      </p>

      <div className="space-y-3 mb-6">
        {[
          ['event', `Khởi hành ${trip.startDate}`],
          ['groups', `${trip.memberCount}/${trip.maxMembers} thành viên`],
          ['payments', `Đã thanh toán ${trip.currency}${trip.priceFrom}`],
        ].map(([icon, text]) => (
          <div key={text} className="flex items-center gap-3 text-on-surface/85">
            <Icon name={icon} className="text-primary" size={18} />
            <span className="text-sm">{text}</span>
          </div>
        ))}
      </div>

      <Link to={messageThreadPath('c1')} className="block mb-3">
        <Button size="lg" className="w-full">
          <Icon name="chat" />
          Mở nhóm chat
        </Button>
      </Link>

      <button
        type="button"
        onClick={onLeave}
        className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-surface-container-low hover:bg-error/10 hover:text-error text-on-surface-variant font-headline font-bold transition active:scale-[0.98]"
      >
        <Icon name="logout" />
        Rời khỏi chuyến
      </button>

      <p className="text-center text-xs text-on-surface-variant mt-4">
        Cần hỗ trợ? Liên hệ hướng dẫn viên qua chat.
      </p>
    </section>
  )
}
