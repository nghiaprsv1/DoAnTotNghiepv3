import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { ROUTES } from '@constants/routes'
import type { UserRole } from '@types/user'

interface ProtectedRouteProps {
  /** Where to send unauthenticated users. Defaults to the login page. */
  redirectTo?: string
  /**
   * Optional role allow-list. When provided, an authenticated user whose role
   * is not included is bounced to `HOME` (they're logged in, just not
   * permitted here — e.g. a traveler hitting an admin route).
   */
  roles?: UserRole[]
}

/**
 * Guards routes that require authentication (and optionally a specific role).
 *
 * - Not authenticated → redirect to `redirectTo`, remembering the attempted
 *   path in `location.state.from` so the login page can send the user back.
 * - Authenticated but role not allowed → redirect to `HOME`.
 * - Otherwise → render the nested routes via `<Outlet/>`.
 */
export function ProtectedRoute({ redirectTo = ROUTES.LOGIN, roles }: ProtectedRouteProps) {
  const location = useLocation()
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const role = useAuthStore((state) => state.user?.role)

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname + location.search }} />
  }

  if (roles && role && !roles.includes(role)) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
}
