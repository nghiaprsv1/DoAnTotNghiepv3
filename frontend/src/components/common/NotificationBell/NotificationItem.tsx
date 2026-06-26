import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { cn } from '@utils/cn'
import { NOTIFICATION_ICON, NOTIFICATION_TONE } from '@constants/notifications'
import { notificationDetailPath } from '@constants/routes'
import { useDeleteNotification, useMarkNotificationRead } from '@hooks/useNotifications'
import type { Notification } from '@types/notification'

interface Props {
  notification: Notification
  /** Compact variant for the bell dropdown */
  compact?: boolean
  onClick?: () => void
}

export function NotificationItem({ notification, compact, onClick }: Props) {
  const markRead = useMarkNotificationRead()
  const removeMut = useDeleteNotification()

  const handleClick = () => {
    if (!notification.read) markRead.mutate(notification.id)
    onClick?.()
  }

  return (
    <Link
      to={notificationDetailPath(notification.id)}
      onClick={handleClick}
      className={cn(
        'group flex gap-3 transition rounded-2xl',
        compact ? 'p-3 hover:bg-surface-container-low' : 'p-4 bg-surface-container-lowest hover:shadow-editorial border border-outline-variant/10',
        !notification.read && (compact ? 'bg-primary/5' : 'border-l-4 border-l-primary')
      )}
    >
      {/* Avatar / icon */}
      <div className="relative flex-shrink-0">
        {notification.actor ? (
          <Avatar src={notification.actor.avatar} alt={notification.actor.name} size="md" />
        ) : (
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              NOTIFICATION_TONE[notification.type]
            )}
          >
            <Icon name={NOTIFICATION_ICON[notification.type]} />
          </div>
        )}
        {notification.actor && (
          <span
            className={cn(
              'absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface-container-lowest',
              NOTIFICATION_TONE[notification.type]
            )}
          >
            <Icon name={NOTIFICATION_ICON[notification.type]} size={11} />
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-headline leading-tight',
            compact ? 'text-sm' : 'text-base',
            notification.read ? 'font-bold text-on-surface' : 'font-extrabold text-on-surface'
          )}
        >
          {notification.title}
        </p>
        <p
          className={cn(
            'text-on-surface-variant mt-0.5',
            compact ? 'text-xs line-clamp-2' : 'text-sm line-clamp-2'
          )}
        >
          {notification.preview}
        </p>
        <p className="text-[11px] text-on-surface-variant/70 mt-1">{notification.createdAt}</p>
      </div>

      {/* Unread dot + delete */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {!notification.read && (
          <span className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5" aria-label="Chưa đọc" />
        )}
        {!compact && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              removeMut.mutate(notification.id)
            }}
            aria-label="Xoá thông báo"
            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-full hover:bg-error/10 hover:text-error text-on-surface-variant flex items-center justify-center transition"
          >
            <Icon name="close" size={16} />
          </button>
        )}
      </div>
    </Link>
  )
}
