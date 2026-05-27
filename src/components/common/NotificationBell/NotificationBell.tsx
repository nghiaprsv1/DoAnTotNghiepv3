import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { ROUTES } from '@constants/routes'
import { useDisclosure } from '@hooks/useDisclosure'
import { useNotificationStore } from '@store/notificationStore'
import { NotificationItem } from './NotificationItem'

export function NotificationBell() {
  const { isOpen, toggle, close } = useDisclosure()
  const ref = useRef<HTMLDivElement>(null)

  const items = useNotificationStore((s) => s.items)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)

  const unread = items.filter((n) => !n.read).length

  // Outside click + ESC
  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, close])

  const recent = items.slice(0, 6)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Thông báo"
        className="p-2 text-primary hover:bg-surface-container-low rounded-full transition-all active:scale-95 relative focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <Icon name="notifications" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary text-[10px] font-extrabold flex items-center justify-center border-2 border-surface">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] origin-top-right z-50 bg-surface-container-lowest rounded-3xl shadow-editorial-lg border border-outline-variant/15 overflow-hidden"
        >
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-outline-variant/15">
            <div className="flex items-center gap-2">
              <h3 className="font-headline font-extrabold text-on-surface">Thông báo</h3>
              {unread > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold">
                  {unread} mới
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <Icon name="done_all" size={14} />
                Đánh dấu đã đọc
              </button>
            )}
          </header>

          {/* List */}
          {recent.length === 0 ? (
            <div className="p-10 text-center">
              <Icon name="notifications_off" className="text-3xl text-on-surface-variant mb-2" />
              <p className="text-sm text-on-surface-variant">Bạn không có thông báo nào.</p>
            </div>
          ) : (
            <ul className="max-h-[440px] overflow-y-auto p-2 space-y-1">
              {recent.map((n) => (
                <li key={n.id}>
                  <NotificationItem notification={n} compact onClick={close} />
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          <footer className="p-2 border-t border-outline-variant/15">
            <Link
              to={ROUTES.NOTIFICATIONS}
              onClick={close}
              className="flex items-center justify-center gap-1.5 py-2 rounded-2xl text-sm font-headline font-bold text-primary hover:bg-primary/5 transition"
            >
              Xem tất cả thông báo
              <Icon name="arrow_forward" size={16} />
            </Link>
          </footer>
        </div>
      )}
    </div>
  )
}
