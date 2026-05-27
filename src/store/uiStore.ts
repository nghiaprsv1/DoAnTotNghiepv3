import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface UIStore {
  theme: Theme
  sidebarOpen: boolean
  isLoading: boolean

  setTheme: (theme: Theme) => void
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setLoading: (loading: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  theme: 'system',
  sidebarOpen: true,
  isLoading: false,

  setTheme: (theme) => set({ theme }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setLoading: (loading) => set({ isLoading: loading }),
}))
