import { useAuthStore } from '@store/authStore'
import { useCurrentUserStore } from '@store/currentUserStore'
import { authService } from '@services/authService'
import type { LoginCredentials, RegisterCredentials } from '@types/user'

/**
 * Hook for authentication actions
 */
export function useAuth() {
  const { user, isAuthenticated, logout: storeLogout, setAuth } = useAuthStore()
  const syncCurrent = useCurrentUserStore((s) => s.syncFromAuth)
  const resetCurrent = useCurrentUserStore((s) => s.reset)

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    if (response.success) {
      setAuth(response.data.user, response.data.tokens)
      syncCurrent(response.data.user)
    }
    return response
  }

  const register = async (credentials: RegisterCredentials) => {
    // Backend now returns { email, requiresVerification } — no tokens until the
    // email OTP is confirmed. The caller routes the user to the verify screen.
    return authService.register(credentials)
  }

  const verifyEmail = async (email: string, code: string) => {
    const response = await authService.verifyEmail(email, code)
    if (response.success) {
      setAuth(response.data.user, response.data.tokens)
      syncCurrent(response.data.user)
    }
    return response
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      storeLogout()
      resetCurrent()
    }
  }

  return { user, isAuthenticated, login, register, verifyEmail, logout }
}
