import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@store/authStore'
import { ROUTES } from '@constants/routes'

interface ProtectedRouteProps {
  redirectTo?: string
}

/**
 * Wraps routes that require authentication.
 * Redirects to login if the user is not authenticated.
 */
export function ProtectedRoute({ redirectTo = ROUTES.LOGIN }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}
