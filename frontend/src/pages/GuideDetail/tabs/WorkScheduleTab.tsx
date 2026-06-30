import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { guideService } from '@services/guideService'
import { cn } from '@utils/cn'

interface Props {
  guideId: string
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTH_LABEL = (y: number, m: number) => `Tháng ${m + 1}/${y}`

/** yyyy-mm-dd theo giờ địa phương (tránh lệch do toISOString dùng UTC). */
function isoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Tab "Lịch làm việc" của HDV: hiển thị lịch các tháng tới, ĐÁNH DẤU những ngày
 * HDV đã có lịch (bận) từ /guides/:id/busy-dates (gộp booking đang hoạt động +
 * chuyến đi HDV tham gia). Người thuê nhìn vào biết ngày nào còn trống.
 */
export function WorkScheduleTab({ guideId }: Props) {
  // Số tháng hiển thị (từ tháng hiện tại). 3 tháng đủ để lên kế hoạch.
  const MONTHS_AHEAD = 3
  const [offset, setOffset] = useState(0)

  const { data: busyRanges = [], isLoading } = useQuery({
    queryKey: ['guide', guideId, 'busy-dates'],
    queryFn: () => guideService.busyDates(guideId),
  })

  // Bung mọi khoảng [startDate, endDate] thành Set các ngày bận (yyyy-mm-dd).
  const busyDays = useMemo(() => {
    const set = new Set<string>()
    for (const r of busyRanges) {
      const start = new Date(r.startDate)
      const end = new Date(r.endDate || r.startDate)
      if (isNaN(start.getTime()) || isNaN(end.getTime())) continue
      const cur = new Date(start)
      let guard = 0
      while (cur <= end && guard < 400) {
        set.add(isoLocal(cur))
        cur.setDate(cur.getDate() + 1)
        guard++
      }
    }
    return set
  }, [busyRanges])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayIso = isoLocal(today)

  // Danh sách các tháng cần render (theo offset trang).
  const months = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    return Array.from({ length: MONTHS_AHEAD }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }, [today, offset])

  const busyCount = busyDays.size

  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-6 md:p-8">
      {/* Header: tiêu đề + chú thích màu + điều hướng tháng */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-headline font-extrabold text-lg text-on-surface flex items-center gap-2">
            <Icon name="calendar_month" className="text-primary" />
            Lịch làm việc
          </h3>
          <p className="text-[12px] text-on-surface-variant mt-0.5">
            {busyCount > 0
              ? `HDV đã có lịch ở ${busyCount} ngày (đánh dấu đỏ). Các ngày còn lại đang trống.`
              : 'HDV hiện chưa có lịch nào — còn trống toàn bộ.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOffset((o) => Math.max(0, o - MONTHS_AHEAD))}
            disabled={offset === 0}
            className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center disabled:opacity-40"
            aria-label="Tháng trước"
          >
            <Icon name="chevron_left" size={20} />
          </button>
          <button
            type="button"
            onClick={() => setOffset((o) => o + MONTHS_AHEAD)}
            className="w-9 h-9 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center justify-center"
            aria-label="Tháng sau"
          >
            <Icon name="chevron_right" size={20} />
          </button>
        </div>
      </div>

      {/* Chú thích màu */}
      <div className="flex flex-wrap items-center gap-4 mb-5 text-[12px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-error/15 border border-error/40" />
          <span className="text-on-surface-variant">Đã có lịch (bận)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md bg-surface-container-low border border-outline-variant/40" />
          <span className="text-on-surface-variant">Còn trống</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 rounded-md ring-2 ring-primary" />
          <span className="text-on-surface-variant">Hôm nay</span>
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-on-surface-variant py-8 text-center">Đang tải lịch…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {months.map((m) => (
            <MonthGrid
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              busyDays={busyDays}
              todayIso={todayIso}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/** Lưới 1 tháng — ô ngày bận tô đỏ, hôm nay viền primary, ngày quá khứ mờ. */
function MonthGrid({
  year,
  month,
  busyDays,
  todayIso,
}: {
  year: number
  month: number
  busyDays: Set<string>
  todayIso: string
}) {
  // Ô trống đầu tháng: JS getDay() CN=0 → quy về thứ 2 đầu tuần (T2=0…CN=6).
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="border border-outline-variant/20 rounded-2xl p-3">
      <p className="text-center font-headline font-bold text-sm text-on-surface mb-2">
        {MONTH_LABEL(year, month)}
      </p>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-[10px] font-bold text-on-surface-variant">
            {w}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`e-${i}`} />
          const m = String(month + 1).padStart(2, '0')
          const d = String(day).padStart(2, '0')
          const iso = `${year}-${m}-${d}`
          const busy = busyDays.has(iso)
          const isToday = iso === todayIso
          const isPast = iso < todayIso
          return (
            <span
              key={iso}
              title={busy ? 'HDV đã có lịch ngày này' : 'Còn trống'}
              className={cn(
                'aspect-square flex items-center justify-center text-[12px] rounded-md select-none',
                isPast && 'opacity-35',
                busy
                  ? 'bg-error/15 text-error font-bold'
                  : 'bg-surface-container-low text-on-surface',
                isToday && 'ring-2 ring-primary',
              )}
            >
              {day}
            </span>
          )
        })}
      </div>
    </div>
  )
}
