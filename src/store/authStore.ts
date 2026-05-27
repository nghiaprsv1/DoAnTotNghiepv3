import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { User, AuthTokens } from '@types/user'

interface AuthStore {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean

  setUser: (user: User) => void
  setTokens: (tokens: AuthTokens) => void
  setAuth: (user: User, tokens: AuthTokens) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,

      setUser: (user) => set({ user }),

      setTokens: (tokens) => set({ tokens }),

      setAuth: (user, tokens) =>
        set({ user, tokens, isAuthenticated: true }),

      logout: () =>
        set({ user: null, tokens: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
