import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { useAuthStore } from '@store/authStore'
import { useCurrentUserStore } from '@store/currentUserStore'
import { useAuth } from '@hooks/useAuth'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'

const NAV = [
  { to: '/admin', icon: 'dashboard', label: 'Tổng quan', end: true },
  { to: '/admin/users', icon: 'group', label: 'Người dùng' },
  { to: '/admin/guides', icon: 'verified', label: 'Duyệt HDV' },
  { to: '/admin/posts', icon: 'article', label: 'Bài viết' },
  { to: '/admin/trips', icon: 'travel_explore', label: 'Chuyến đi' },
  { to: '/admin/places', icon: 'place', label: 'Địa điểm' },
  { to: '/admin/rag', icon: 'smart_toy', label: 'Kho tri thức AI' },
  { to: '/admin/withdrawals', icon: 'payments', label: 'Rút tiền' },
  { to: '/admin/revenue', icon: 'trending_up', label: 'Doanh thu' },
  { to: '/admin/notifications', icon: 'campaign', label: 'Gửi thông báo' },
]

/**
 * Top-level shell for the Admin Dashboard. Gates access to admin role.
 * Uses its own chrome (no global TopNav/Footer) — by design admins live
 * exclusively inside this console after sign-in.
 */
export function AdminLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useCurrentUserStore((s) => s.role)
  const navigate = useNavigate()
  const { logout } = useAuth()

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />
  if (role !== 'admin') return <Navigate to={ROUTES.HOME} replace />

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <div className="min-h-screen flex bg-surface-container-low">
      {/* Sidebar */}
      <aside className="w-64 bg-surface-container-lowest border-r border-outline-variant/15 flex flex-col">
        <div className="px-6 py-5 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <span className="w-9 h-9 rounded-2xl editorial-gradient flex items-center justify-center text-on-primary">
              <Icon name="admin_panel_settings" />
            </span>
            <div>
              <p className="font-headline font-extrabold text-on-surface leading-tight">TripMate</p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                Admin Console
              </p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-headline font-bold transition',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-low',
                )
              }
            >
              <Icon name={it.icon} size={18} />
              <span>{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-outline-variant/15">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-headline font-bold text-on-surface-variant hover:bg-error/10 hover:text-error transition"
          >
            <Icon name="logout" size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
