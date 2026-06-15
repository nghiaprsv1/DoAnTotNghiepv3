import { NavLink } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { ROUTES } from '@constants/routes'
import { useAuthStore } from '@store/authStore'
import { cn } from '@utils/cn'

interface TabItem {
  label: string
  icon: string
  to: string
  fab?: boolean
  /** Hide for guests. */
  authOnly?: boolean
}

const items: TabItem[] = [
  { label: 'Home', icon: 'home', to: ROUTES.HOME },
  { label: 'Feed', icon: 'dynamic_feed', to: ROUTES.SOCIAL },
  { label: 'Create', icon: 'add', to: ROUTES.TRIP_CREATE, fab: true, authOnly: true },
  { label: 'Chat', icon: 'chat_bubble', to: ROUTES.MESSAGES, authOnly: true },
  { label: 'Profile', icon: 'person', to: ROUTES.PROFILE, authOnly: true },
]

/**
 * Mobile bottom navigation — glass blur, floating FAB in the middle.
 * Auth-only entries are replaced with a Login link for guests.
 */
export function BottomNav() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const visible = items.filter((item) => !item.authOnly || isAuthenticated)

  return (
    <nav
      className={cn(
        'md:hidden fixed bottom-0 left-0 w-full z-50',
        'bg-surface-container-lowest/85 glass-header',
        'px-4 pt-2 pb-2 safe-bottom',
        'flex justify-between items-center',
        'shadow-[0_-12px_40px_rgba(78,33,32,0.06)] rounded-t-3xl'
      )}
    >
      {visible.map((item) =>
        item.fab ? (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className="editorial-gradient p-3 rounded-full text-on-primary -mt-8 editorial-shadow active:scale-95 transition-transform"
          >
            <Icon name={item.icon} />
          </NavLink>
        ) : (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ROUTES.HOME}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 transition-colors px-2 py-1',
                isActive ? 'text-primary' : 'text-on-surface/70'
              )
            }
          >
            <Icon name={item.icon} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </NavLink>
        )
      )}
      {!isAuthenticated && (
        <NavLink
          to={ROUTES.LOGIN}
          className="flex flex-col items-center gap-0.5 text-primary px-2 py-1"
        >
          <Icon name="login" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Đăng nhập</span>
        </NavLink>
      )}
    </nav>
  )
}
