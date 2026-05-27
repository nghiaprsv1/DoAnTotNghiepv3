import { useAuthStore } from '@store/authStore'
import { authService } from '@services/authService'
import type { LoginCredentials, RegisterCredentials } from '@types/user'

/**
 * Hook for authentication actions
 */
export function useAuth() {
  const { user, isAuthenticated, logout: storeLogout, setAuth } = useAuthStore()

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    if (response.success) {
      setAuth(response.data.user, response.data.tokens)
    }
    return response
  }

  const register = async (credentials: RegisterCredentials) => {
    const response = await authService.register(credentials)
    if (response.success) {
      setAuth(response.data.user, response.data.tokens)
    }
    return response
  }

  const logout = async () => {
    try {
      await authService.logout()
    } finally {
      storeLogout()
    }
  }

  return { user, isAuthenticated, login, register, logout }
}
