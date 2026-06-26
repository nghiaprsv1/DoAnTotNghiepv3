import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useAdminRevenue } from '@hooks/useAdmin'
import { useGuides } from '@hooks/useGuides'
import { bookingDetailPath, userProfilePath } from '@constants/routes'
import { cn } from '@utils/cn'
import { GuideRevenueDialog } from './components/GuideRevenueDialog'

const formatVnd = (n: number) => `₫${Math.round(Number(n)).toLocaleString('vi-VN')}`

function presetRange(days: number) {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - days)
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  }
}

/**
 * Admin revenue dashboard. Surfaces the *full* breakdown the spec asks for —
 * commission per booking, top earners, daily commission timeline, plus the
 * raw money-flow totals (top-ups, payments, payouts) so admin can audit the
 * numbers behind every aggregate.
 */
export function AdminRevenuePage() {
  const [range, setRange] = useState(() => presetRange(180))
  const { data, isLoading } = useAdminRevenue(range.start, range.end)
  // Guide lookup for the per-guide revenue drill-down.
  const [guideQuery, setGuideQuery] = useState('')
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)
  const { data: guideList = [] } = useGuides()

  const matchedGuides = useMemo(() => {
    const q = guideQuery.trim().toLowerCase()
    if (!q) return []
    return guideList
      .filter(
        (g) =>
          g.name.toLowerCase().includes(q) || (g.region ?? '').toLowerCase().includes(q),
      )
      .slice(0, 6)
  }, [guideQuery, guideList])

  const daily = data?.daily ?? []
  const maxGross = useMemo(() => daily.reduce((m, b) => Math.max(m, b.gross), 0), [daily])

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">
            Doanh thu chi tiết
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Hoa hồng theo từng booking, top HDV và toàn bộ dòng tiền nạp/rút trên hệ thống.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Preset label="7 ngày" onClick={() => setRange(presetRange(7))} />
          <Preset label="30 ngày" onClick={() => setRange(presetRange(30))} />
          <Preset label="90 ngày" onClick={() => setRange(presetRange(90))} />
          <Preset label="Tất cả" onClick={() => setRange(presetRange(3650))} />
        </div>
      </header>

      <div className="flex items-center gap-2 text-sm flex-wrap">
        <DateInput
          label="Từ"
          value={range.start}
          onChange={(v) => setRange((r) => ({ ...r, start: v }))}
        />
        <DateInput
          label="Đến"
          value={range.end}
          onChange={(v) => setRange((r) => ({ ...r, end: v }))}
        />
      </div>

      {/* Per-guide revenue drill-down */}
      <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
        <h2 className="font-headline font-extrabold text-lg text-on-surface mb-1">
          Tra cứu doanh thu theo HDV
        </h2>
        <p className="text-sm text-on-surface-variant mb-3">
          Tìm một hướng dẫn viên để xem doanh thu, hoa hồng và toàn bộ lịch sử booking.
        </p>
        <div className="flex items-center gap-2 bg-surface-container-low rounded-full px-4 py-2.5 max-w-md">
          <Icon name="search" className="text-on-surface-variant" size={18} />
          <input
            value={guideQuery}
            onChange={(e) => setGuideQuery(e.target.value)}
            placeholder="Nhập tên HDV hoặc khu vực…"
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/60"
          />
          {guideQuery && (
            <button
              type="button"
              onClick={() => setGuideQuery('')}
              aria-label="Xoá"
              className="text-on-surface-variant hover:text-primary"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>
        {matchedGuides.length > 0 && (
          <ul className="mt-3 divide-y divide-outline-variant/10 border border-outline-variant/15 rounded-2xl overflow-hidden">
            {matchedGuides.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => setSelectedGuideId(g.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low transition text-left"
                >
                  <Avatar src={g.avatar} alt={g.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-headline font-bold text-on-surface truncate">{g.name}</p>
                    <p className="text-xs text-on-surface-variant truncate">{g.region}</p>
                  </div>
                  <span className="text-xs font-bold text-primary inline-flex items-center gap-1">
                    Xem doanh thu
                    <Icon name="arrow_forward" size={14} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isLoading ? (
        <LoadingState count={3} />
      ) : !data ? (
        <EmptyState icon="error_outline" title="Không tải được dữ liệu" />
      ) : (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <KPI
              icon="payments"
              tone="primary"
              label="GMV (đã hoàn thành)"
              value={formatVnd(data.totals.gross)}
              hint={`${data.totals.bookingsCompleted} booking`}
            />
            <KPI
              icon="trending_up"
              tone="green"
              label="Hoa hồng nền tảng"
              value={formatVnd(data.totals.commission)}
              hint="10% GMV"
            />
            <KPI
              icon="account_balance_wallet"
              tone="amber"
              label="Net chuyển HDV"
              value={formatVnd(data.totals.net)}
              hint="GMV − hoa hồng"
            />
            <KPI
              icon="add_circle"
              tone="green"
              label="Đã nạp cho user"
              value={formatVnd(data.moneyFlow.topUp.total)}
              hint={`${data.moneyFlow.topUp.count} lệnh top-up`}
            />
          </section>

          {/* Money flow grid */}
          <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
            <h2 className="font-headline font-extrabold text-lg text-on-surface mb-3">
              Nguồn gốc dòng tiền
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <FlowRow icon="add_circle" label="Tiền nạp (TOPUP)" entry={data.moneyFlow.topUp} positive />
              <FlowRow icon="shopping_cart_checkout" label="Thanh toán booking" entry={data.moneyFlow.payment} />
              <FlowRow icon="percent" label="Hoa hồng" entry={data.moneyFlow.commission} positive />
              <FlowRow icon="check_circle" label="Đã rút (HDV nhận)" entry={data.moneyFlow.withdrawSuccess} />
              <FlowRow icon="schedule" label="Đang chờ rút" entry={data.moneyFlow.withdrawPending} />
              <FlowRow icon="undo" label="Đã hoàn tiền" entry={data.moneyFlow.refund} />
            </div>
          </section>

          {/* Daily timeline */}
          <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
            <h2 className="font-headline font-extrabold text-lg text-on-surface mb-3">
              Doanh thu theo ngày
            </h2>
            {daily.length === 0 ? (
              <EmptyState
                icon="bar_chart"
                title="Không có dữ liệu"
                description="Chưa có booking hoàn thành trong khoảng này."
              />
            ) : (
              <div className="space-y-2">
                {daily.map((b) => (
                  <div key={b.day} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 text-on-surface-variant text-xs">
                      {new Date(b.day).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                      })}
                    </span>
                    <div className="flex-1 bg-surface-container-low rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full editorial-gradient rounded-full"
                        style={{ width: `${(b.gross / Math.max(1, maxGross)) * 100}%` }}
                      />
                    </div>
                    <span className="w-28 text-right font-headline font-bold text-on-surface">
                      {formatVnd(b.gross)}
                    </span>
                    <span className="w-20 text-right text-xs text-primary font-bold">
                      +{formatVnd(b.commission)}
                    </span>
                    <span className="w-12 text-right text-xs text-on-surface-variant">
                      {b.bookings} BK
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Top guides */}
          <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
            <h2 className="font-headline font-extrabold text-lg text-on-surface mb-3">
              Top HDV doanh thu
            </h2>
            {data.topGuides.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">Chưa có dữ liệu.</p>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {data.topGuides.map((g, i) => (
                  <li
                    key={g.userId ?? i}
                    className="py-3 flex items-center gap-3"
                  >
                    <span className="w-6 text-center font-headline font-extrabold text-primary">
                      #{i + 1}
                    </span>
                    <Link to={g.userId ? userProfilePath(g.userId) : '#'} className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80">
                      <Avatar src={g.avatar ?? ''} alt={g.name} size="sm" />
                      <span className="font-headline font-bold text-on-surface truncate">
                        {g.name}
                      </span>
                    </Link>
                    <span className="text-sm text-on-surface-variant">
                      {g.bookings} tour
                    </span>
                    <span className="font-headline font-extrabold text-on-surface w-32 text-right">
                      {formatVnd(g.gross)}
                    </span>
                    <span className="font-headline font-bold text-primary w-28 text-right">
                      +{formatVnd(g.commission)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Booking-level breakdown */}
          <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
            <h2 className="font-headline font-extrabold text-lg text-on-surface mb-3">
              Chi tiết theo booking ({data.breakdown.length})
            </h2>
            {data.breakdown.length === 0 ? (
              <p className="text-sm text-on-surface-variant italic">Không có booking.</p>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="min-w-full text-sm">
                  <thead className="text-on-surface-variant text-xs uppercase tracking-widest">
                    <tr>
                      <th className="text-left p-2">Tour · Ngày</th>
                      <th className="text-left p-2">HDV</th>
                      <th className="text-left p-2">Khách</th>
                      <th className="text-right p-2">Gross</th>
                      <th className="text-right p-2">Hoa hồng</th>
                      <th className="text-right p-2">Net</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.breakdown.map((r) => (
                      <tr key={r.bookingId} className="border-t border-outline-variant/10">
                        <td className="p-2">
                          <p className="font-headline font-bold text-on-surface truncate max-w-[14rem]">
                            {r.tourTitle}
                          </p>
                          <p className="text-xs text-on-surface-variant">
                            {new Date(r.completedAt).toLocaleDateString('vi-VN')}
                          </p>
                        </td>
                        <td className="p-2">
                          <PartyCell name={r.guide.name} avatar={r.guide.avatar} />
                        </td>
                        <td className="p-2">
                          <PartyCell name={r.traveler.name} avatar={r.traveler.avatar} />
                        </td>
                        <td className="p-2 text-right font-bold text-on-surface">
                          {formatVnd(r.gross)}
                        </td>
                        <td className="p-2 text-right font-bold text-primary">
                          +{formatVnd(r.commission)}
                        </td>
                        <td className="p-2 text-right text-on-surface">
                          {formatVnd(r.net)}
                        </td>
                        <td className="p-2 text-right">
                          <Link
                            to={bookingDetailPath(r.bookingId)}
                            className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                          >
                            Xem
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <GuideRevenueDialog
        open={!!selectedGuideId}
        onClose={() => setSelectedGuideId(null)}
        guideId={selectedGuideId ?? undefined}
      />
    </div>
  )
}

const TONES = {
  primary: 'bg-primary/10 text-primary',
  amber: 'bg-amber-500/15 text-amber-700',
  green: 'bg-green-500/15 text-green-700',
} as const

function KPI({ icon, label, value, hint, tone }: { icon: string; label: string; value: string; hint: string; tone: keyof typeof TONES }) {
  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
      <span className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-3', TONES[tone])}>
        <Icon name={icon} />
      </span>
      <p className="text-xs uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="font-headline font-extrabold text-2xl text-on-surface mt-1">{value}</p>
      <p className="text-xs text-on-surface-variant mt-1">{hint}</p>
    </div>
  )
}

function FlowRow({ icon, label, entry, positive }: { icon: string; label: string; entry: { total: number; count: number }; positive?: boolean }) {
  return (
    <div className="bg-surface-container-low rounded-2xl px-4 py-3 flex items-center gap-3">
      <Icon name={icon} className={cn(positive ? 'text-green-700' : 'text-on-surface-variant')} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-on-surface-variant">{label}</p>
        <p className="font-headline font-extrabold text-on-surface text-base">{formatVnd(entry.total)}</p>
      </div>
      <span className="text-xs text-on-surface-variant">{entry.count} lệnh</span>
    </div>
  )
}

function PartyCell({ name, avatar }: { name?: string; avatar?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Avatar src={avatar ?? ''} alt={name ?? '—'} size="xs" />
      <span className="text-on-surface text-sm truncate max-w-[10rem]">{name ?? '—'}</span>
    </span>
  )
}

function Preset({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" rounded="full" onClick={onClick}>
      {label}
    </Button>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-on-surface-variant">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 outline-none focus:border-primary"
      />
    </label>
  )
}
