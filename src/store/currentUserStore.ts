import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@types/user'

/**
 * "Current user" store — UI-friendly slice (id/name/email/avatar/role).
 * Empty until the user authenticates; populated by `useAuth.login/register`
 * via `syncFromAuth(user)`. Reset on logout.
 *
 * Components must guard render with `id !== null` (or use `useAuthStore.isAuthenticated`)
 * to avoid showing empty placeholders to guests.
 */
interface CurrentUserStore {
  id: string | null
  name: string
  email: string
  avatar: string
  role: UserRole
  setRole: (role: UserRole) => void
  toggleGuide: () => void
  /** Sync from a User returned by the backend. */
  syncFromAuth: (user: User) => void
  /** Partial update — used after a profile-edit save. */
  update: (patch: Partial<Pick<CurrentUserStore, 'name' | 'avatar'>>) => void
  /** Reset to the unauthenticated state. */
  reset: () => void
}

const EMPTY_STATE = {
  id: null as string | null,
  name: '',
  email: '',
  avatar: '',
  role: 'user' as UserRole,
}

export const useCurrentUserStore = create<CurrentUserStore>()(
  persist(
    (set) => ({
      ...EMPTY_STATE,
      setRole: (role) => set({ role }),
      toggleGuide: () =>
        set((s) => ({ role: s.role === 'guide' ? 'user' : 'guide' })),
      syncFromAuth: (user) =>
        set({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || '',
          role: user.role,
        }),
      update: (patch) => set(patch),
      reset: () => set(EMPTY_STATE),
    }),
    { name: 'travelsocial-current-user-v2' }
  )
)

export const isGuide = (role: UserRole) => role === 'guide' || role === 'admin'
