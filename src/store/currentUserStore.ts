import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@types/user'

/**
 * Demo "current user" store — used for UI gating until real auth is wired.
 * Allows toggling role between 'user' and 'guide' to preview gated screens.
 */
interface CurrentUserStore {
  name: string
  email: string
  avatar: string
  role: UserRole
  setRole: (role: UserRole) => void
  toggleGuide: () => void
}

const DEMO_AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'

export const useCurrentUserStore = create<CurrentUserStore>()(
  persist(
    (set) => ({
      name: 'Linh Nguyễn',
      email: 'linh.nguyen@travel.com',
      avatar: DEMO_AVATAR,
      role: 'user',
      setRole: (role) => set({ role }),
      toggleGuide: () =>
        set((s) => ({ role: s.role === 'guide' ? 'user' : 'guide' })),
    }),
    { name: 'travelsocial-current-user' }
  )
)

export const isGuide = (role: UserRole) => role === 'guide' || role === 'admin'
