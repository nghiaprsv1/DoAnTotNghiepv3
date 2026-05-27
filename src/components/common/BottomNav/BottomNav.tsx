import { NavLink } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'

interface TabItem {
  label: string
  icon: string
  to: string
  fab?: boolean
}

const items: TabItem[] = [
  { label: 'Home', icon: 'home', to: ROUTES.HOME },
  { label: 'Feed', icon: 'dynamic_feed', to: ROUTES.SOCIAL },
  { label: 'Create', icon: 'add', to: ROUTES.TRIP_CREATE, fab: true },
  { label: 'Chat', icon: 'chat_bubble', to: ROUTES.MESSAGES },
  { label: 'Profile', icon: 'person', to: ROUTES.PROFILE },
]

/**
 * Mobile bottom navigation — glass blur, floating FAB in the middle.
 */
export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-surface-container-lowest/80 glass-header px-6 py-3 flex justify-between items-center z-50 shadow-[0_-12px_40px_rgba(78,33,32,0.06)] rounded-t-3xl">
      {items.map((item) =>
        item.fab ? (
          <NavLink
            key={item.to}
            to={item.to}
            aria-label={item.label}
            className="editorial-gradient p-3 rounded-full text-on-primary -mt-10 editorial-shadow active:scale-95 transition-transform"
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
                'flex flex-col items-center gap-1 transition-colors',
                isActive ? 'text-primary' : 'text-on-surface/70'
              )
            }
          >
            <Icon name={item.icon} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </NavLink>
        )
      )}
    </nav>
  )
}
