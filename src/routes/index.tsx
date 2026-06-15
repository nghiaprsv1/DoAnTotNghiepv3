import { createBrowserRouter } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import { MainLayout } from '@layouts/MainLayout'
import { AuthLayout } from '@layouts/AuthLayout'
import { ProtectedRoute } from '@components/common/ProtectedRoute'
import { ROUTES } from '@constants/routes'

// Lazy-loaded pages
const HomePage = lazy(() => import('@pages/Home').then((m) => ({ default: m.HomePage })))
const LoginPage = lazy(() => import('@pages/Login').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() =>
  import('@pages/Register').then((m) => ({ default: m.RegisterPage }))
)
const ForgotPasswordPage = lazy(() =>
  import('@pages/ForgotPassword').then((m) => ({ default: m.ForgotPasswordPage }))
)
const TripsPage = lazy(() => import('@pages/Trips').then((m) => ({ default: m.TripsPage })))
const TripDetailPage = lazy(() =>
  import('@pages/TripDetail').then((m) => ({ default: m.TripDetailPage }))
)
const CreateTripPage = lazy(() =>
  import('@pages/CreateTrip').then((m) => ({ default: m.CreateTripPage }))
)
const EditTripPage = lazy(() =>
  import('@pages/EditTrip').then((m) => ({ default: m.EditTripPage }))
)
const ProfilePage = lazy(() => import('@pages/Profile').then((m) => ({ default: m.ProfilePage })))
const EditProfilePage = lazy(() =>
  import('@pages/EditProfile').then((m) => ({ default: m.EditProfilePage }))
)
const NotFoundPage = lazy(() =>
  import('@pages/NotFound').then((m) => ({ default: m.NotFoundPage }))
)
const MessagesPage = lazy(() =>
  import('@pages/Messages').then((m) => ({ default: m.MessagesPage }))
)
const SocialPage = lazy(() =>
  import('@pages/Social').then((m) => ({ default: m.SocialPage }))
)
const GuidesPage = lazy(() =>
  import('@pages/Guides').then((m) => ({ default: m.GuidesPage }))
)
const GuideApplyPage = lazy(() =>
  import('@pages/GuideApply').then((m) => ({ default: m.GuideApplyPage }))
)
const GuideDetailPage = lazy(() =>
  import('@pages/GuideDetail').then((m) => ({ default: m.GuideDetailPage }))
)
const GuideDashboardPage = lazy(() =>
  import('@pages/GuideDashboard').then((m) => ({ default: m.GuideDashboardPage }))
)
const NotificationsPage = lazy(() =>
  import('@pages/Notifications').then((m) => ({ default: m.NotificationsPage }))
)
const NotificationDetailPage = lazy(() =>
  import('@pages/Notifications').then((m) => ({ default: m.NotificationDetailPage }))
)
const PlacesPage = lazy(() =>
  import('@pages/Places').then((m) => ({ default: m.PlacesPage }))
)
const PlaceDetailPage = lazy(() =>
  import('@pages/Places').then((m) => ({ default: m.PlaceDetailPage }))
)
const MyBookingsPage = lazy(() =>
  import('@pages/MyBookings').then((m) => ({ default: m.MyBookingsPage }))
)
const BookingDetailPage = lazy(() =>
  import('@pages/BookingDetail').then((m) => ({ default: m.BookingDetailPage }))
)
const WalletPage = lazy(() =>
  import('@pages/Wallet').then((m) => ({ default: m.WalletPage }))
)
const UserProfilePage = lazy(() =>
  import('@pages/UserProfile').then((m) => ({ default: m.UserProfilePage }))
)
const FollowListPage = lazy(() =>
  import('@pages/UserProfile').then((m) => ({ default: m.FollowListPage }))
)
const AdminLayout = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminLayout }))
)
const AdminOverviewPage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminOverviewPage }))
)
const AdminUsersPage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminUsersPage }))
)
const AdminGuidesPage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminGuidesPage }))
)
const AdminWithdrawalsPage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminWithdrawalsPage }))
)
const AdminRevenuePage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminRevenuePage }))
)
const AdminNotificationsPage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminNotificationsPage }))
)
const AdminPostsPage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminPostsPage }))
)
const AdminTripsPage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminTripsPage }))
)
const AdminPlacesPage = lazy(() =>
  import('@pages/Admin').then((m) => ({ default: m.AdminPlacesPage }))
)

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
)

const withSuspense = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      // ── Public routes (khách chưa đăng nhập vẫn xem được) ──
      { path: ROUTES.HOME, element: withSuspense(HomePage) },
      { path: ROUTES.TRIPS, element: withSuspense(TripsPage) },
      { path: ROUTES.TRIP_DETAIL, element: withSuspense(TripDetailPage) },
      { path: ROUTES.SOCIAL, element: withSuspense(SocialPage) },
      { path: ROUTES.GUIDES, element: withSuspense(GuidesPage) },
      { path: ROUTES.GUIDE_DETAIL, element: withSuspense(GuideDetailPage) },
      { path: ROUTES.PLACES, element: withSuspense(PlacesPage) },
      { path: ROUTES.PLACE_DETAIL, element: withSuspense(PlaceDetailPage) },
      { path: ROUTES.USER_PROFILE, element: withSuspense(UserProfilePage) },
      {
        path: ROUTES.USER_FOLLOWERS,
        element: (
          <Suspense fallback={<PageLoader />}>
            <FollowListPage initial="followers" />
          </Suspense>
        ),
      },
      {
        path: ROUTES.USER_FOLLOWING,
        element: (
          <Suspense fallback={<PageLoader />}>
            <FollowListPage initial="following" />
          </Suspense>
        ),
      },
      // ── Protected routes (yêu cầu đăng nhập) ──
      {
        element: <ProtectedRoute />,
        children: [
          { path: ROUTES.TRIP_CREATE, element: withSuspense(CreateTripPage) },
          { path: ROUTES.TRIP_EDIT, element: withSuspense(EditTripPage) },
          { path: ROUTES.PROFILE, element: withSuspense(ProfilePage) },
          { path: ROUTES.PROFILE_EDIT, element: withSuspense(EditProfilePage) },
          { path: ROUTES.MESSAGES, element: withSuspense(MessagesPage) },
          { path: ROUTES.MESSAGE_THREAD, element: withSuspense(MessagesPage) },
          { path: ROUTES.GUIDE_APPLY, element: withSuspense(GuideApplyPage) },
          { path: ROUTES.GUIDE_DASHBOARD, element: withSuspense(GuideDashboardPage) },
          { path: ROUTES.NOTIFICATIONS, element: withSuspense(NotificationsPage) },
          { path: ROUTES.NOTIFICATION_DETAIL, element: withSuspense(NotificationDetailPage) },
          { path: ROUTES.MY_BOOKINGS, element: withSuspense(MyBookingsPage) },
          { path: ROUTES.BOOKING_DETAIL, element: withSuspense(BookingDetailPage) },
          { path: ROUTES.WALLET, element: withSuspense(WalletPage) },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      { path: ROUTES.LOGIN, element: withSuspense(LoginPage) },
      { path: ROUTES.REGISTER, element: withSuspense(RegisterPage) },
      { path: ROUTES.FORGOT_PASSWORD, element: withSuspense(ForgotPasswordPage) },
    ],
  },
  {
    // Admin Dashboard — its own chrome (sidebar) instead of the public TopNav.
    // Guarded by role: chỉ user role 'admin' mới vào được, còn lại bị đẩy về Home.
    element: <ProtectedRoute roles={['admin']} />,
    children: [
      {
        element: withSuspense(AdminLayout),
        children: [
          { path: ROUTES.ADMIN, element: withSuspense(AdminOverviewPage) },
          { path: ROUTES.ADMIN_USERS, element: withSuspense(AdminUsersPage) },
          { path: ROUTES.ADMIN_GUIDES, element: withSuspense(AdminGuidesPage) },
          { path: ROUTES.ADMIN_WITHDRAWALS, element: withSuspense(AdminWithdrawalsPage) },
          { path: ROUTES.ADMIN_REVENUE, element: withSuspense(AdminRevenuePage) },
          { path: ROUTES.ADMIN_NOTIFICATIONS, element: withSuspense(AdminNotificationsPage) },
          { path: ROUTES.ADMIN_POSTS, element: withSuspense(AdminPostsPage) },
          { path: ROUTES.ADMIN_TRIPS, element: withSuspense(AdminTripsPage) },
          { path: ROUTES.ADMIN_PLACES, element: withSuspense(AdminPlacesPage) },
        ],
      },
    ],
  },
  {
    path: ROUTES.NOT_FOUND,
    element: withSuspense(NotFoundPage),
  },
], {
  // Opt in to React Router v7 behaviour early to silence the upgrade warnings.
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
})
