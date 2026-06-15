import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useNotificationStore } from '@store/notificationStore'
import { useAuthStore } from '@store/authStore'
import {
  useMarkAllNotificationsRead,
  useNotifications,
} from '@hooks/useNotifications'
import { NotificationItem } from '@components/common/NotificationBell/NotificationItem'
import { ROUTES } from '@constants/routes'
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
  const markAllRead = useMarkAllNotificationsRead()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const [filter, setFilter] = useState<FilterKey>('all')

  // Fetches and pushes results into the store automatically.
  const { isLoading } = useNotifications()

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    if (filter === 'unread') return items.filter((n) => !n.read)
    return items.filter((n) => n.type === filter)
  }, [filter, items])

  const groups = useMemo(() => groupByDate(filtered), [filtered])
  const unread = items.filter((n) => !n.read).length

  if (!isAuthenticated) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon="login"
          title="Đăng nhập để xem thông báo"
          description="Đăng nhập để nhận cập nhật về booking, đánh giá và hoạt động cộng đồng."
          action={{ label: 'Đăng nhập', to: ROUTES.LOGIN }}
        />
      </div>
    )
  }

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
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-headline font-bold bg-surface-container-lowest text-on-surface shadow-editorial hover:bg-surface-container-low transition active:scale-95 disabled:opacity-50"
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
      {isLoading ? (
        <LoadingState label="Đang tải thông báo..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="notifications_off"
          title="Không có thông báo"
          description="Khi có hoạt động mới — booking, đánh giá, bình luận — bạn sẽ thấy ở đây."
        />
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
