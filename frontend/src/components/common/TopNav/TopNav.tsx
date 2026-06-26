import { NavLink, Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { UserMenu } from '@components/common/UserMenu'
import { NotificationBell } from '@components/common/NotificationBell'
import { GlobalUserSearch } from '@components/common/GlobalUserSearch'
import { ROUTES } from '@constants/routes'
import { useAuthStore } from '@store/authStore'
import { cn } from '@utils/cn'

interface NavItem {
  label: string
  to: string
  /** Hide from guests. */
  authOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Home', to: ROUTES.HOME },
  { label: 'Feed', to: ROUTES.SOCIAL },
  { label: 'Places', to: ROUTES.PLACES },
  { label: 'Trips', to: ROUTES.TRIPS },
  { label: 'Guides', to: ROUTES.GUIDES },
  { label: 'Profile', to: ROUTES.PROFILE, authOnly: true },
]

/**
 * Top navigation bar — fixed, glass-blur, editorial.
 */
export function TopNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const visibleNavItems = navItems.filter((item) => !item.authOnly || isAuthenticated)

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-sm safe-top">
      <div className="flex justify-between items-center px-4 md:px-6 py-2.5 md:py-3 max-w-screen-2xl mx-auto relative gap-2">
        <div className="flex items-center gap-4 md:gap-8 min-w-0">
          <Link
            to={ROUTES.HOME}
            className="text-xl md:text-2xl font-extrabold tracking-tight text-primary font-headline italic shrink-0"
          >
            TripMate
          </Link>
          <div className="hidden md:flex items-center space-x-2 font-headline font-semibold">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ROUTES.HOME}
                className={({ isActive }) =>
                  cn(
                    'px-3 py-1 rounded-lg transition-colors',
                    isActive
                      ? 'text-primary border-b-2 border-primary rounded-none pb-1'
                      : 'text-on-surface hover:bg-surface-container-low'
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-4 shrink-0">
          <GlobalUserSearch />
          {isAuthenticated ? (
            <div className="flex items-center gap-1 md:gap-2">
              {/* Messages + Explore are duplicated in BottomNav on mobile, so
                  hide them in the TopNav under md to keep the bar uncluttered. */}
              <Link
                to={ROUTES.MESSAGES}
                className="hidden md:inline-flex p-2 text-primary hover:bg-surface-container-low rounded-full transition-all active:scale-95 relative"
                aria-label="Messages"
              >
                <Icon name="chat_bubble" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
              </Link>
              <NotificationBell />
              <button
                type="button"
                className="hidden md:inline-flex p-2 text-primary hover:bg-surface-container-low rounded-full transition-all active:scale-95"
                aria-label="Explore"
              >
                <Icon name="explore" />
              </button>
              <div className="ml-1 md:ml-2">
                <UserMenu />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 md:gap-2">
              <Link
                to={ROUTES.LOGIN}
                className="px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold text-on-surface hover:bg-surface-container-low transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to={ROUTES.REGISTER}
                className="hidden xs:inline-flex px-3 md:px-4 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-bold bg-primary text-on-primary hover:bg-primary-dim transition-colors shadow-editorial"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>

        <div className="bg-surface-container-low h-px w-full absolute bottom-0 left-0" />
      </div>
    </nav>
  )
}
