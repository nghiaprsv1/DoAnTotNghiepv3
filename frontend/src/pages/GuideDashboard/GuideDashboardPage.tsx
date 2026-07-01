import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { ROUTES } from '@constants/routes'
import { useCurrentUserStore, isGuide } from '@store/currentUserStore'
import { cn } from '@utils/cn'
import { OverviewTab } from './OverviewTab'
import { RevenueTab } from './RevenueTab'
import { BookingsTab } from './BookingsTab'
import { ToursTab } from './ToursTab'
import { ScheduleTab } from './ScheduleTab'
import { ReviewsManageTab } from './ReviewsManageTab'
import { GuideProfileTab } from './GuideProfileTab'

const TABS = [
  { key: 'overview', label: 'Tổng quan', icon: 'dashboard' },
  { key: 'revenue', label: 'Doanh thu', icon: 'payments' },
  { key: 'bookings', label: 'Đặt chỗ', icon: 'event_available' },
  { key: 'schedule', label: 'Lịch làm việc', icon: 'calendar_month' },
  { key: 'tours', label: 'Tour của tôi', icon: 'tour' },
  { key: 'reviews', label: 'Đánh giá', icon: 'reviews' },
  { key: 'profile', label: 'Hồ sơ HDV', icon: 'badge' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function GuideDashboardPage() {
  const [tab, setTab] = useState<TabKey>('overview')
  const { name, avatar, role, toggleGuide } = useCurrentUserStore()

  // Role gate
  if (!isGuide(role)) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <div className="w-20 h-20 rounded-3xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto mb-6">
          <Icon name="lock" className="text-3xl" />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline text-on-surface mb-2">
          Khu vực dành cho Hướng dẫn viên
        </h1>
        <p className="text-on-surface-variant mb-8">
          Bạn cần là HDV đã được duyệt để truy cập trang này. Hãy đăng ký để bắt đầu.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to={ROUTES.GUIDE_APPLY}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full editorial-gradient text-on-primary font-headline font-bold shadow-editorial active:scale-95 transition"
          >
            <Icon name="workspace_premium" />
            Đăng ký làm HDV
          </Link>
          <button
            type="button"
            onClick={() => toggleGuide()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-surface-container-low text-on-surface font-headline font-bold hover:bg-surface-container transition"
          >
            <Icon name="bug_report" />
            Demo: bật vai trò Guide
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-3">
            <div className="flex items-center gap-3 p-3">
              <Avatar src={avatar} alt={name} size="md" ring />
              <div className="min-w-0">
                <p className="font-headline font-extrabold text-on-surface truncate">{name}</p>
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                  <Icon name="verified" size={12} className="fill" />
                  Hướng dẫn viên
                </span>
              </div>
            </div>

            <nav className="mt-2 space-y-1">
              {TABS.map((t) => {
                const active = tab === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm transition',
                      active
                        ? 'bg-primary/10 text-primary font-headline font-extrabold'
                        : 'text-on-surface hover:bg-surface-container-low'
                    )}
                  >
                    <Icon name={t.icon} size={18} />
                    <span className="flex-1 text-left font-headline font-bold">{t.label}</span>
                    {active && <Icon name="chevron_right" size={16} />}
                  </button>
                )
              })}
            </nav>

            <div className="mt-3 pt-3 border-t border-outline-variant/15">
              <Link
                to={ROUTES.GUIDES}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm text-on-surface-variant hover:bg-surface-container-low transition"
              >
                <Icon name="storefront" size={18} />
                <span className="font-headline font-bold">Xem trang HDV (public)</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0">
          {tab === 'overview' && <OverviewTab />}
          {tab === 'revenue' && <RevenueTab />}
          {tab === 'bookings' && <BookingsTab />}
          {tab === 'schedule' && <ScheduleTab />}
          {tab === 'tours' && <ToursTab />}
          {tab === 'reviews' && <ReviewsManageTab />}
          {tab === 'profile' && <GuideProfileTab />}
        </main>
      </div>
    </div>
  )
}
