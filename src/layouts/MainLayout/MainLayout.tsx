import { Outlet } from 'react-router-dom'
import { ErrorBoundary, TopNav, BottomNav, Footer } from '@components/common'

/**
 * Main app shell — fixed top nav, mobile bottom nav, footer.
 */
export function MainLayout() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background">
        <TopNav />

        <main className="flex-1 pt-20 pb-24 md:pb-0">
          <Outlet />
        </main>

        <Footer />
        <BottomNav />
      </div>
    </ErrorBoundary>
  )
}
