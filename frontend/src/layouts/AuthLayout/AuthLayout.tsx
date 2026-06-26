import { Outlet } from 'react-router-dom'

/**
 * Magazine-style split-screen layout for auth pages (login/register).
 * Child pages render their own visual-left + form-right content via <Outlet />.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface relative overflow-hidden">
      {/* Decorative ambient blobs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-primary-container/10 blur-[120px] rounded-full -z-10 translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-tertiary-container/10 blur-[100px] rounded-full -z-10 -translate-x-1/2 translate-y-1/2" />

      <Outlet />
    </div>
  )
}
