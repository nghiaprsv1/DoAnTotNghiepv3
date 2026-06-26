import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { useRegistrationStats } from '@hooks/useAdmin'
import { cn } from '@utils/cn'

type Granularity = 'day' | 'week' | 'month'

const GRANULARITY: { key: Granularity; label: string }[] = [
  { key: 'day', label: 'Ngày' },
  { key: 'week', label: 'Tuần' },
  { key: 'month', label: 'Tháng' },
]

/** Format an ISO date for the x-axis tick based on granularity. */
function tickLabel(iso: string, g: Granularity): string {
  const d = new Date(iso)
  if (g === 'month') return d.toLocaleDateString('vi-VN', { month: 'short', year: '2-digit' })
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
}

/**
 * Registration timeline — a lightweight pure-SVG bar chart so we don't pull in
 * a charting dependency. Lets admins gauge marketing effectiveness over time.
 */
export function RegistrationChart() {
  const [granularity, setGranularity] = useState<Granularity>('day')
  const { data, isLoading } = useRegistrationStats(granularity)

  const series = data?.series ?? []
  const max = Math.max(1, ...series.map((p) => p.count))
  // Keep the chart readable — show at most the latest 30 buckets.
  const points = series.slice(-30)

  return (
    <section className="bg-surface-container-lowest rounded-3xl p-5 shadow-editorial">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Icon name="trending_up" size={18} />
          </span>
          <div>
            <p className="font-headline font-extrabold text-on-surface">Lượt đăng ký</p>
            <p className="text-xs text-on-surface-variant">
              Tổng {data?.total?.toLocaleString('vi-VN') ?? 0} người dùng
            </p>
          </div>
        </div>
        <div className="flex gap-1 bg-surface-container-low rounded-full p-1">
          {GRANULARITY.map((g) => (
            <button
              key={g.key}
              type="button"
              onClick={() => setGranularity(g.key)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-bold transition',
                granularity === g.key
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:text-primary',
              )}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-40 rounded-2xl bg-surface-container-low animate-pulse" />
      ) : points.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-sm text-on-surface-variant">
          Chưa có dữ liệu đăng ký trong khoảng này.
        </div>
      ) : (
        <div className="flex items-end gap-1 h-40 overflow-x-auto pb-1">
          {points.map((p) => (
            <div
              key={p.date}
              className="flex-1 min-w-[14px] flex flex-col items-center justify-end h-full group"
              title={`${tickLabel(p.date, granularity)}: ${p.count} đăng ký`}
            >
              <span className="text-[10px] font-bold text-on-surface-variant mb-1 opacity-0 group-hover:opacity-100 transition">
                {p.count}
              </span>
              <div
                className="w-full rounded-t-md editorial-gradient transition-all"
                style={{ height: `${Math.max(4, (p.count / max) * 100)}%` }}
              />
              <span className="text-[9px] text-on-surface-variant mt-1 whitespace-nowrap rotate-0">
                {tickLabel(p.date, granularity)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
