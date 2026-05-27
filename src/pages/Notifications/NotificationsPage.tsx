import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { useNotificationStore } from '@store/notificationStore'
import { NotificationItem } from '@components/common/NotificationBell/NotificationItem'
import type { Notification, NotificationType } from '@types/notification'
import { cn } from '@utils/cn'

type FilterKey = 'all' | 'unread' | NotificationType

const filters: { key: FilterKey; label: string; icon: string }[] = [
  { key: 'all', label: 'Tất cả', icon: 'inbox' },
  { key: 'unread', label: 'Chưa đọc', icon: 'mark_email_unread' },
  { key: 'booking_new', label: 'Đặt chỗ', icon: 'event_available' },
  { key: 'review_new', label: 'Đánh giá', icon: 'star' },
  { key: 'comment', label: 'Bình luận', icon: 'chat_bubble' },
  { key: 'like', label: 'Lượt thích', icon: 'favorite' },
  { key: 'follow', label: 'Theo dõi', icon: 'person_add' },
  { key: 'payout', label: 'Thanh toán', icon: 'payments' },
  { key: 'system', label: 'Hệ thống', icon: 'campaign' },
]

export function NotificationsPage() {
  const items = useNotificationStore((s) => s.items)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'unread') return items.filter((n) => !n.read)
    return items.filter((n) => n.type === filter)
  }, [filter, items])

  const groups = useMemo(() => groupByDate(filtered), [filtered])
  const unread = items.filter((n) => !n.read).length

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-1 block">
            Hộp thông báo
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight text-on-surface">
            Thông báo
          </h1>
          <p className="text-on-surface-variant mt-1">
            {unread > 0 ? (
              <>
                Bạn có <strong className="text-primary">{unread} thông báo chưa đọc</strong>.
              </>
            ) : (
              'Bạn đã đọc hết thông báo.'
            )}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-headline font-bold bg-surface-container-lowest text-on-surface shadow-editorial hover:bg-surface-container-low transition active:scale-95"
          >
            <Icon name="done_all" size={18} />
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </header>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 mb-6">
        {filters.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-headline font-bold whitespace-nowrap transition border',
                active
                  ? 'bg-primary text-on-primary border-primary shadow-editorial'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40 hover:text-primary'
              )}
            >
              <Icon name={f.icon} size={16} />
              {f.label}
            </button>
          )
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto mb-4">
            <Icon name="notifications_off" className="text-2xl" />
          </div>
          <h3 className="font-headline font-extrabold text-xl text-on-surface mb-1">
            Không có thông báo
          </h3>
          <p className="text-on-surface-variant max-w-sm mx-auto">
            Khi có hoạt động mới — booking, đánh giá, bình luận — bạn sẽ thấy ở đây.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
                {g.label}
              </h2>
              <ul className="space-y-2">
                {g.items.map((n) => (
                  <li key={n.id}>
                    <NotificationItem notification={n} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const today: Notification[] = []
  const week: Notification[] = []
  const earlier: Notification[] = []

  for (const n of items) {
    const lower = n.createdAt.toLowerCase()
    if (lower.includes('giờ') || lower.includes('phút') || lower.includes('vừa')) {
      today.push(n)
    } else if (lower.includes('ngày')) {
      week.push(n)
    } else {
      earlier.push(n)
    }
  }

  const groups = []
  if (today.length) groups.push({ label: 'Hôm nay', items: today })
  if (week.length) groups.push({ label: 'Tuần này', items: week })
  if (earlier.length) groups.push({ label: 'Trước đó', items: earlier })
  return groups
}
