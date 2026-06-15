import { useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { ROUTES } from '@constants/routes'
import { useCurrentUserStore, isGuide } from '@store/currentUserStore'
import { useAIAssistantStore } from '@store/aiAssistantStore'
import { useAuth } from '@hooks/useAuth'
import { useDisclosure } from '@hooks/useDisclosure'
import { cn } from '@utils/cn'

interface MenuItem {
  icon: string
  label: string
  to?: string
  onClick?: () => void
  /** Show only for guides */
  guideOnly?: boolean
  /** Show only for non-guides (e.g. "Trở thành HDV") */
  travelerOnly?: boolean
  /** Show only for admin role */
  adminOnly?: boolean
  danger?: boolean
  divider?: boolean
}

export function UserMenu() {
  const { isOpen, toggle, close } = useDisclosure()
  const navigate = useNavigate()
  const { name, email, avatar, role, toggleGuide } = useCurrentUserStore()
  const aiEnabled = useAIAssistantStore((s) => s.enabled)
  const setAIEnabled = useAIAssistantStore((s) => s.setEnabled)
  const { logout } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  const handleLogout = async () => {
    close()
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [isOpen, close])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, close])

  const guide = isGuide(role)
  const isAdmin = role === 'admin'

  const items: MenuItem[] = [
    { icon: 'person', label: 'Hồ sơ của tôi', to: ROUTES.PROFILE },
    { icon: 'edit', label: 'Chỉnh sửa hồ sơ', to: ROUTES.PROFILE_EDIT },
    { icon: 'flight_takeoff', label: 'Chuyến đi của tôi', to: ROUTES.TRIPS },
    { icon: 'luggage', label: 'Booking của tôi', to: ROUTES.MY_BOOKINGS },
    { icon: 'account_balance_wallet', label: 'Ví của tôi', to: ROUTES.WALLET },
    { icon: 'bookmark', label: 'Đã lưu', to: '/saved' },
    { divider: true, icon: '', label: '' },
    {
      icon: 'admin_panel_settings',
      label: 'Bảng điều khiển Admin',
      to: ROUTES.ADMIN,
      adminOnly: true,
    },
    {
      icon: 'workspace_premium',
      label: 'Quản lý Guide',
      to: ROUTES.GUIDE_DASHBOARD,
      guideOnly: true,
    },
    {
      icon: 'tour',
      label: 'Trở thành HDV',
      to: ROUTES.GUIDE_APPLY,
      travelerOnly: true,
    },
    { divider: true, icon: '', label: '' },
    { icon: 'settings', label: 'Cài đặt', to: '/settings' },
    { icon: 'help', label: 'Trợ giúp', to: '/help' },
    {
      icon: 'logout',
      label: 'Đăng xuất',
      onClick: handleLogout,
      danger: true,
    },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Mở menu tài khoản"
        className="active:scale-95 transition-transform rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <Avatar src={avatar} alt={name} size="sm" ring />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 origin-top-right z-50 bg-surface-container-lowest rounded-2xl shadow-editorial-lg border border-outline-variant/15 overflow-hidden"
        >
          {/* User info header */}
          <Link
            to={ROUTES.PROFILE}
            onClick={close}
            className="flex items-center gap-3 p-4 hover:bg-surface-container-low transition"
          >
            <Avatar src={avatar} alt={name} size="md" ring />
            <div className="min-w-0 flex-1">
              <p className="font-headline font-extrabold text-on-surface truncate">{name}</p>
              <p className="text-xs text-on-surface-variant truncate">{email}</p>
              {guide && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  <Icon name="verified" size={12} className="fill" />
                  Hướng dẫn viên
                </span>
              )}
            </div>
          </Link>

          <div className="border-t border-outline-variant/15" />

          {/* Items */}
          <ul className="py-1">
            {items.map((it, i) => {
              if (it.divider) {
                return <li key={`d-${i}`} className="my-1 border-t border-outline-variant/10" />
              }
              if (it.guideOnly && !guide) return null
              if (it.travelerOnly && guide) return null
              if (it.adminOnly && !isAdmin) return null

              const cls = cn(
                'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition',
                it.danger
                  ? 'text-error hover:bg-error/10'
                  : 'text-on-surface hover:bg-surface-container-low'
              )

              const inner = (
                <>
                  <Icon
                    name={it.icon}
                    size={18}
                    className={cn(it.danger ? 'text-error' : 'text-on-surface-variant')}
                  />
                  <span className="flex-1 text-left font-headline font-bold">{it.label}</span>
                  {it.guideOnly && (
                    <Icon name="workspace_premium" size={14} className="text-primary" />
                  )}
                </>
              )

              return (
                <li key={it.label}>
                  {it.to ? (
                    <Link to={it.to} onClick={close} className={cls}>
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        it.onClick?.()
                        close()
                      }}
                      className={cls}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          {/* Demo role toggle (dev preview) */}
          <div className="border-t border-outline-variant/15 p-3 bg-surface-container-low/50 space-y-2">
            <button
              type="button"
              onClick={() => setAIEnabled(!aiEnabled)}
              className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-on-surface-variant hover:bg-surface-container transition"
              title="Bật/tắt bong bóng trợ lý AI"
            >
              <span className="font-bold uppercase tracking-widest inline-flex items-center gap-1.5">
                <Icon name="auto_awesome" size={14} />
                Trợ lý AI
              </span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                  aiEnabled
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface'
                )}
              >
                {aiEnabled ? 'Bật' : 'Tắt'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => toggleGuide()}
              className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs text-on-surface-variant hover:bg-surface-container transition"
              title="Toggle role để xem giao diện HDV"
            >
              <span className="font-bold uppercase tracking-widest">Demo · Vai trò</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                  guide
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-high text-on-surface'
                )}
              >
                {guide ? 'Guide' : 'Traveler'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
