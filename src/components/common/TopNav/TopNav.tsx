import { NavLink, Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { UserMenu } from '@components/common/UserMenu'
import { NotificationBell } from '@components/common/NotificationBell'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'

interface NavItem {
  label: string
  to: string
}

const navItems: NavItem[] = [
  { label: 'Home', to: ROUTES.HOME },
  { label: 'Feed', to: ROUTES.SOCIAL },
  { label: 'Places', to: ROUTES.PLACES },
  { label: 'Trips', to: ROUTES.TRIPS },
  { label: 'Guides', to: ROUTES.GUIDES },
  { label: 'Profile', to: ROUTES.PROFILE },
]

/**
 * Top navigation bar — fixed, glass-blur, editorial.
 */
export function TopNav() {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-sm">
      <div className="flex justify-between items-center px-6 py-3 max-w-screen-2xl mx-auto relative">
        <div className="flex items-center gap-8">
          <Link
            to={ROUTES.HOME}
            className="text-2xl font-extrabold tracking-tight text-primary font-headline italic"
          >
            ViệtVibe
          </Link>
          <div className="hidden md:flex items-center space-x-2 font-headline font-semibold">
            {navItems.map((item) => (
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

        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center bg-surface-container-highest px-4 py-2 rounded-full gap-2">
            <Icon name="search" className="text-on-surface-variant text-sm" />
            <input
              type="text"
              placeholder="Search experiences..."
              className="bg-transparent border-none focus:ring-0 text-sm w-48 placeholder:text-on-surface-variant/50 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={ROUTES.MESSAGES}
              className="p-2 text-primary hover:bg-surface-container-low rounded-full transition-all active:scale-95 relative"
              aria-label="Messages"
            >
              <Icon name="chat_bubble" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
            </Link>
            <NotificationBell />
            <button
              type="button"
              className="p-2 text-primary hover:bg-surface-container-low rounded-full transition-all active:scale-95"
              aria-label="Explore"
            >
              <Icon name="explore" />
            </button>
            <div className="ml-2">
              <UserMenu />
            </div>
          </div>
        </div>

        <div className="bg-surface-container-low h-px w-full absolute bottom-0 left-0" />
      </div>
    </nav>
  )
}
