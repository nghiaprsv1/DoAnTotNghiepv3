import type { RevenueMonth } from '@constants/mockGuideDashboard'

interface Props {
  data: RevenueMonth[]
  /** Active month highlight by index (-1 to disable) */
  activeIndex?: number
  onHover?: (index: number) => void
}

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return `${n}`
}

/**
 * Bar chart for monthly revenue. Pure SVG/CSS — no chart lib dependency.
 */
export function RevenueChart({ data, activeIndex = -1, onHover }: Props) {
  const max = Math.max(...data.map((d) => d.amount), 1)

  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5 md:p-6">
      <header className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-headline font-extrabold text-lg text-on-surface">
            Doanh thu 7 tháng gần đây
          </h3>
          <p className="text-xs text-on-surface-variant">Đơn vị: ₫ (VND)</p>
        </div>
        <select
          defaultValue="7m"
          className="bg-surface-container-low rounded-full px-3 py-1.5 text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="7m">7 tháng</option>
          <option value="12m">12 tháng</option>
          <option value="ytd">Năm nay</option>
        </select>
      </header>

      <div className="flex items-end gap-2 sm:gap-3 h-44 px-1">
        {data.map((d, i) => {
          const pct = (d.amount / max) * 100
          const active = i === activeIndex
          return (
            <button
              key={d.month}
              type="button"
              onMouseEnter={() => onHover?.(i)}
              onMouseLeave={() => onHover?.(-1)}
              className="flex-1 flex flex-col items-center gap-1 group"
            >
              <span
                className={`text-[10px] font-bold transition-colors ${
                  active ? 'text-primary' : 'text-on-surface-variant'
                }`}
              >
                {formatCompact(d.amount)}
              </span>
              <span
                className={`w-full rounded-t-2xl transition-all ${
                  active
                    ? 'editorial-gradient shadow-editorial'
                    : 'bg-primary/15 group-hover:bg-primary/30'
                }`}
                style={{ height: `${Math.max(8, pct)}%` }}
              />
            </button>
          )
        })}
      </div>

      <div className="flex gap-2 sm:gap-3 mt-2 px-1">
        {data.map((d, i) => (
          <span
            key={d.month}
            className={`flex-1 text-center text-xs font-bold transition-colors ${
              i === activeIndex ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            {d.month}
          </span>
        ))}
      </div>
    </div>
  )
}
