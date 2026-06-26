import { Icon } from '@components/ui/Icon'
import { LoadingState } from '@components/common/LoadingState'
import { useAdminDashboard, usePendingGuides, usePendingWithdrawals } from '@hooks/useAdmin'
import { Link } from 'react-router-dom'
import { cn } from '@utils/cn'
import { RegistrationChart } from './components/RegistrationChart'

const formatVnd = (n: number) => `₫${Number(n).toLocaleString('vi-VN')}`

export function AdminOverviewPage() {
  const { data: stats, isLoading } = useAdminDashboard()
  const { data: pendingGuides = [] } = usePendingGuides()
  const { data: pendingWithdrawals = [] } = usePendingWithdrawals()

  if (isLoading) return <LoadingState count={4} />

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-headline font-extrabold text-3xl text-on-surface">Tổng quan</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Bức tranh tức thời về toàn bộ nền tảng TripMate.
        </p>
      </header>

      {/* Stats grid */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Stat icon="group" tone="primary" label="Người dùng" value={stats?.totalUsers ?? 0} />
        <Stat icon="verified" tone="green" label="HDV đã duyệt" value={stats?.totalGuides ?? 0} />
        <Stat
          icon="hourglass_top"
          tone="amber"
          label="HDV chờ duyệt"
          value={stats?.pendingGuides ?? 0}
        />
        <Stat icon="article" tone="blue" label="Bài viết" value={stats?.totalPosts ?? 0} />
        <Stat
          icon="flight_takeoff"
          tone="primary"
          label="Chuyến đi"
          value={stats?.totalTrips ?? 0}
        />
        <Stat
          icon="payments"
          tone="primary"
          label="Hoa hồng"
          value={formatVnd(stats?.commissionRevenue ?? 0)}
        />
      </section>

      {/* Detailed breakdown — users / posts / trips growth this month. */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BreakdownCard
          icon="group_add"
          tone="primary"
          title="Người dùng"
          total={stats?.users.total ?? 0}
          rows={[
            { label: 'Mới tháng này', value: stats?.users.newThisMonth ?? 0 },
            { label: 'Tháng trước', value: stats?.users.newPrevMonth ?? 0 },
            { label: '7 ngày gần đây', value: stats?.users.newLast7Days ?? 0 },
          ]}
          growthPct={stats?.users.growthPct ?? null}
        />
        <BreakdownCard
          icon="article"
          tone="blue"
          title="Bài viết"
          total={stats?.posts.total ?? 0}
          rows={[{ label: 'Mới tháng này', value: stats?.posts.newThisMonth ?? 0 }]}
        />
        <BreakdownCard
          icon="flight_takeoff"
          tone="green"
          title="Chuyến đi"
          total={stats?.trips.total ?? 0}
          rows={[
            { label: 'Đang public', value: stats?.trips.published ?? 0 },
            { label: 'Mới tháng này', value: stats?.trips.newThisMonth ?? 0 },
          ]}
        />
      </section>

      {/* Registration timeline for marketing analytics */}
      <RegistrationChart />

      {/* Quick action cards */}
      <section className="grid md:grid-cols-2 gap-4">
        <ActionCard
          icon="verified"
          title="HDV chờ duyệt"
          count={pendingGuides.length}
          to="/admin/guides"
          hint="Xét duyệt hồ sơ HDV mới đăng ký."
        />
        <ActionCard
          icon="payments"
          title="Yêu cầu rút tiền"
          count={pendingWithdrawals.length}
          to="/admin/withdrawals"
          hint="Phê duyệt hoặc từ chối các giao dịch rút tiền."
        />
      </section>
    </div>
  )
}

const TONES = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-500/15 text-amber-700',
  green: 'bg-green-500/15 text-green-700',
  blue: 'bg-blue-500/15 text-blue-700',
} as const

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: string
  label: string
  value: number | string
  tone: keyof typeof TONES
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-editorial">
      <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-2', TONES[tone])}>
        <Icon name={icon} size={18} />
      </span>
      <p className="font-headline font-extrabold text-2xl text-on-surface leading-tight">
        {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  )
}

function ActionCard({
  icon,
  title,
  count,
  to,
  hint,
}: {
  icon: string
  title: string
  count: number
  to: string
  hint: string
}) {
  return (
    <Link
      to={to}
      className="bg-surface-container-lowest rounded-3xl p-5 shadow-editorial flex items-start gap-4 hover:shadow-editorial-lg transition group"
    >
      <span className="w-12 h-12 rounded-2xl editorial-gradient text-on-primary flex items-center justify-center">
        <Icon name={icon} />
      </span>
      <div className="flex-1">
        <p className="font-headline font-extrabold text-lg text-on-surface">{title}</p>
        <p className="text-sm text-on-surface-variant mt-0.5">{hint}</p>
      </div>
      <div className="text-right">
        <p className="font-headline font-extrabold text-3xl text-on-surface">{count}</p>
        <Icon
          name="arrow_forward"
          size={16}
          className="text-on-surface-variant group-hover:text-primary group-hover:translate-x-0.5 transition"
        />
      </div>
    </Link>
  )
}

/**
 * Breakdown card with totals + small KPI rows; optional MoM growth chip.
 * Used on the overview to surface user / post / trip growth at a glance.
 */
function BreakdownCard({
  icon,
  tone,
  title,
  total,
  rows,
  growthPct,
}: {
  icon: string
  tone: keyof typeof TONES
  title: string
  total: number
  rows: { label: string; value: number }[]
  growthPct?: number | null
}) {
  const positive = (growthPct ?? 0) >= 0
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-5 shadow-editorial">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center',
              TONES[tone],
            )}
          >
            <Icon name={icon} size={18} />
          </span>
          <p className="font-headline font-extrabold text-on-surface">{title}</p>
        </div>
        {growthPct != null && (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
              positive ? 'bg-green-500/15 text-green-700' : 'bg-error/10 text-error',
            )}
          >
            <Icon name={positive ? 'trending_up' : 'trending_down'} size={12} />
            {positive ? '+' : ''}
            {growthPct.toFixed(1)}%
          </span>
        )}
      </div>
      <p className="font-headline font-extrabold text-3xl text-on-surface">
        {total.toLocaleString('vi-VN')}
      </p>
      <div className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span className="text-on-surface-variant">{r.label}</span>
            <span className="font-bold text-on-surface">{r.value.toLocaleString('vi-VN')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
