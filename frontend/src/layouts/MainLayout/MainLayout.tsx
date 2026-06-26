import { Navigate, Outlet } from 'react-router-dom'
import { ErrorBoundary, TopNav, BottomNav, Footer, AIChatBubble } from '@components/common'
import { useCurrentUserStore } from '@store/currentUserStore'
import { ROUTES } from '@constants/routes'

/**
 * Main app shell — fixed top nav, mobile bottom nav, footer.
 * Admins are redirected to the Admin Console; they don't see the public app.
 */
export function MainLayout() {
  const role = useCurrentUserStore((s) => s.role)
  if (role === 'admin') return <Navigate to={ROUTES.ADMIN} replace />

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-background">
        <TopNav />

        {/* pt: TopNav height (~64px mobile, ~80px desktop)
            pb: BottomNav height + safe-area on mobile, none on desktop */}
        <main className="flex-1 pt-16 md:pt-20 pb-24 md:pb-0 safe-bottom">
          <Outlet />
        </main>

        <Footer />
        <BottomNav />
        <AIChatBubble />
      </div>
    </ErrorBoundary>
  )
}
