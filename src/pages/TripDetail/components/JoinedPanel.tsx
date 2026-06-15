import { useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { messageThreadPath, tripEditPath } from '@constants/routes'
import { useConversations } from '@hooks/useMessages'
import type { Trip } from '@types/trip'

interface Props {
  trip: Trip
  /** Caller is the trip creator. Hides "Rời khỏi" + shows "Chỉnh sửa". */
  isOwner?: boolean
  onLeave: () => void
  /** Owner-only: cancel the whole trip. */
  onCancel?: () => void
  /** Owner-only: cancel request in flight. */
  cancelling?: boolean
}

/**
 * Sidebar panel shown to anyone who is currently a member of the trip
 * (including the creator). Lets the user jump into the trip's group chat,
 * leave the trip, or — for the owner — edit the trip.
 */
export function JoinedPanel({ trip, isOwner, onLeave, onCancel, cancelling }: Props) {
  const navigate = useNavigate()
  const { data: conversations = [] } = useConversations()
  // Trip-bound group chats are auto-created by the BE when the trip is
  // created (see TripsService.create + ensureTripGroup). Look it up so
  // "Mở nhóm chat" jumps straight to the right thread.
  const groupConv = conversations.find((c) => c.tripId === trip.id)
  return (
    <section className="bg-surface-container-lowest p-8 rounded-3xl shadow-editorial-lg border-t-4 border-primary">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-widest mb-4">
        <Icon name={isOwner ? 'workspace_premium' : 'check_circle'} size={14} className="fill" />
        {isOwner ? 'Chủ chuyến đi' : 'Bạn đang tham gia'}
      </div>

      <h4 className="text-2xl font-extrabold text-on-surface font-headline mb-1">
        {isOwner ? 'Bạn là chủ chuyến' : 'Hành trình của bạn'}
      </h4>
      <p className="text-sm text-on-surface-variant mb-5">
        {trip.startDate} – {trip.endDate} · {trip.destination}
      </p>

      <div className="space-y-3 mb-6">
        {[
          ['event', `Khởi hành ${trip.startDate}`],
          ['groups', `${trip.memberCount}/${trip.maxMembers} thành viên`],
          ['payments', `Từ ${Number(trip.priceFrom).toLocaleString('vi-VN')} ${trip.currency}`],
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
        onClick={() => groupConv && navigate(messageThreadPath(groupConv.id))}
        disabled={!groupConv}
        title={groupConv ? 'Mở nhóm chat' : 'Đang khởi tạo nhóm chat...'}
      >
        <Icon name="chat" />
        {groupConv ? 'Mở nhóm chat' : 'Đang chuẩn bị nhóm chat…'}
      </Button>

      {isOwner ? (
        <button
          type="button"
          onClick={() => navigate(tripEditPath(trip.id))}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-primary/10 hover:bg-primary/20 text-primary font-headline font-bold transition active:scale-[0.98]"
        >
          <Icon name="edit" />
          Chỉnh sửa chuyến đi
        </button>
      ) : (
        <button
          type="button"
          onClick={onLeave}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-surface-container-low hover:bg-error/10 hover:text-error text-on-surface-variant font-headline font-bold transition active:scale-[0.98]"
        >
          <Icon name="logout" />
          Rời khỏi chuyến
        </button>
      )}

      {/* Owner: cancel the whole trip — only while it's still live. */}
      {isOwner && trip.status !== 'cancelled' && trip.status !== 'completed' && (
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelling}
          className="w-full inline-flex items-center justify-center gap-2 py-3 mt-3 rounded-full bg-surface-container-low hover:bg-error/10 hover:text-error text-on-surface-variant font-headline font-bold transition active:scale-[0.98] disabled:opacity-60"
        >
          <Icon name={cancelling ? 'hourglass_top' : 'cancel'} />
          {cancelling ? 'Đang huỷ…' : 'Huỷ chuyến đi'}
        </button>
      )}

      <p className="text-center text-xs text-on-surface-variant mt-4">
        {isOwner
          ? 'Mọi thay đổi sẽ được gửi thông báo tới thành viên.'
          : 'Cần hỗ trợ? Liên hệ hướng dẫn viên qua chat.'}
      </p>
    </section>
  )
}
