import { useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { ROUTES } from '@constants/routes'
import { NOTIFICATION_ICON, NOTIFICATION_TONE } from '@constants/notifications'
import { useNotificationStore } from '@store/notificationStore'
import {
  useDeleteNotification,
  useMarkNotificationRead,
} from '@hooks/useNotifications'
import { cn } from '@utils/cn'

export function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const items = useNotificationStore((s) => s.items)
  const markRead = useMarkNotificationRead()
  const removeMut = useDeleteNotification()

  const notification = items.find((n) => n.id === id)

  // Auto mark as read on open — persists to BE so the badge stays cleared
  // after refresh.
  useEffect(() => {
    if (notification && !notification.read) markRead.mutate(notification.id)
    // markRead is stable from React Query; intentionally omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notification?.id, notification?.read])

  if (!notification) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <Icon name="notifications_off" className="text-3xl text-on-surface-variant mb-2" />
        <h1 className="font-headline font-extrabold text-2xl text-on-surface mb-2">
          Không tìm thấy thông báo
        </h1>
        <p className="text-on-surface-variant mb-6">
          Có thể thông báo đã bị xoá hoặc đường link không đúng.
        </p>
        <Link
          to={ROUTES.NOTIFICATIONS}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full editorial-gradient text-on-primary font-headline font-bold shadow-editorial"
        >
          <Icon name="arrow_back" size={18} />
          Về danh sách
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      {/* Back link */}
      <Link
        to={ROUTES.NOTIFICATIONS}
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-6"
      >
        <Icon name="arrow_back" size={18} />
        Về tất cả thông báo
      </Link>

      <article className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg overflow-hidden">
        {/* Hero image (if any) */}
        {notification.image && (
          <div className="relative h-48 md:h-64 overflow-hidden">
            <img
              src={notification.image}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <span
              className={cn(
                'absolute top-4 left-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur',
                NOTIFICATION_TONE[notification.type],
                notification.type === 'guide_application' && 'shadow-editorial'
              )}
            >
              <Icon name={NOTIFICATION_ICON[notification.type]} size={14} />
              {notification.type.replace(/_/g, ' ')}
            </span>
          </div>
        )}

        <div className="p-6 md:p-8 space-y-5">
          {/* Header */}
          <header className="flex items-start gap-4">
            {notification.actor ? (
              <Avatar
                src={notification.actor.avatar}
                alt={notification.actor.name}
                size="lg"
                ring
              />
            ) : (
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0',
                  NOTIFICATION_TONE[notification.type]
                )}
              >
                <Icon name={NOTIFICATION_ICON[notification.type]} className="text-2xl" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-on-surface leading-tight">
                {notification.title}
              </h1>
              <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-2 flex-wrap">
                <Icon name="schedule" size={14} />
                {notification.createdAt}
                {notification.isoDate && (
                  <>
                    <span className="text-on-surface-variant/40">·</span>
                    {new Date(notification.isoDate).toLocaleString('vi-VN', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                removeMut.mutate(notification.id)
                navigate(ROUTES.NOTIFICATIONS)
              }}
              aria-label="Xoá thông báo"
              className="w-10 h-10 rounded-full hover:bg-error/10 hover:text-error text-on-surface-variant flex items-center justify-center transition flex-shrink-0"
            >
              <Icon name="delete" />
            </button>
          </header>

          {/* Body */}
          <div className="prose-editorial">
            <p className="text-on-surface/85 leading-relaxed text-base">
              {notification.body ?? notification.preview}
            </p>
          </div>

          {/* Meta chips */}
          {notification.meta && notification.meta.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {notification.meta.map((m) => (
                <li
                  key={m.label}
                  className="flex items-center gap-3 p-3 bg-surface-container-low rounded-2xl"
                >
                  {m.icon && (
                    <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon name={m.icon} size={18} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      {m.label}
                    </p>
                    <p className="font-headline font-bold text-on-surface truncate">{m.value}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* CTA */}
          {notification.ctaHref && (
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Link to={notification.ctaHref} className="flex-1">
                <Button size="lg" className="w-full" rounded="full">
                  <Icon name="arrow_forward" />
                  {notification.ctaLabel ?? 'Xem chi tiết'}
                </Button>
              </Link>
              <Link to={ROUTES.NOTIFICATIONS} className="sm:w-48">
                <Button variant="secondary" size="lg" className="w-full" rounded="full">
                  Đóng
                </Button>
              </Link>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}
