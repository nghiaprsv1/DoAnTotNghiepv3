import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { guideService } from '@services/guideService'
import { useMyGuideProfile } from '@hooks/useGuides'
import {
  useMyUnavailability,
  useAddUnavailability,
  useRemoveUnavailability,
} from '@hooks/useGuideUnavailability'
import { cn } from '@utils/cn'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTH_LABEL = (y: number, m: number) => `Tháng ${m + 1}/${y}`

/** yyyy-mm-dd theo giờ địa phương. */
function isoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Bung khoảng [start,end] thành Set ngày (yyyy-mm-dd). */
function expand(ranges: Array<{ startDate: string; endDate: string }>): Set<string> {
  const set = new Set<string>()
  for (const r of ranges) {
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
}

const MONTHS_AHEAD = 3

/**
 * Tab "Lịch làm việc" của HDV trong dashboard. Khác WorkScheduleTab (chỉ xem ở
 * trang công khai): tab này TƯƠNG TÁC — HDV chọn khoảng ngày (click ngày bắt đầu
 * rồi ngày kết thúc) để đăng ký NGHỈ (manual block). Phân biệt:
 *  - Cam: ngày nghỉ tự đánh dấu (gỡ được, qua danh sách bên dưới).
 *  - Đỏ:  bận vì booking / chuyến đi (chỉ xem, hệ thống quản lý).
 */
export function ScheduleTab() {
  const { data: profile } = useMyGuideProfile()
  const guideId = profile?.id

  // Lịch bận tổng hợp (booking + trip + nghỉ thủ công) từ endpoint công khai.
  const { data: busyRanges = [] } = useQuery({
    queryKey: ['guide', guideId, 'busy-dates'],
    queryFn: () => guideService.busyDates(guideId as string),
    enabled: !!guideId,
  })
  // Ngày nghỉ tự đánh dấu (để tô riêng màu cam + cho gỡ).
  const { data: offDays = [] } = useMyUnavailability(!!guideId)
  const addOff = useAddUnavailability(guideId)
  const removeOff = useRemoveUnavailability(guideId)

  const [offset, setOffset] = useState(0)
  const [rangeStart, setRangeStart] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  const offSet = useMemo(() => expand(offDays), [offDays])
  // Ngày bận KHÁC nghỉ thủ công = bận vì booking/trip (đỏ, chỉ xem).
  const bookingBusySet = useMemo(() => {
    const all = expand(busyRanges)
    const out = new Set<string>()
    all.forEach((d) => {
      if (!offSet.has(d)) out.add(d)
    })
    return out
  }, [busyRanges, offSet])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const todayIso = isoLocal(today)

  const months = useMemo(() => {
    const base = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    return Array.from({ length: MONTHS_AHEAD }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() + i, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }, [today, offset])

  const submit = (start: string, end: string) => {
    setError(null)
    const [s, e] = start <= end ? [start, end] : [end, start]
    addOff.mutate(
      { startDate: s, endDate: e, note: note.trim() || undefined },
      {
        onSuccess: () => {
          setRangeStart(null)
          setNote('')
        },
        onError: (err: unknown) => {
          const msg =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Không thể đăng ký nghỉ. Vui lòng thử lại.'
          setError(msg)
          setRangeStart(null)
        },
      },
    )
  }

  const onPickDay = (iso: string) => {
    if (iso < todayIso) return
    if (bookingBusySet.has(iso)) {
      setError('Ngày này đã bận vì booking/chuyến đi, không thể đăng ký nghỉ.')
      return
    }
    if (offSet.has(iso)) {
      setError('Ngày này đã được đánh dấu nghỉ. Gỡ ở danh sách bên dưới nếu muốn bỏ.')
      return
    }
    setError(null)
    if (!rangeStart) {
      setRangeStart(iso)
    } else {
      submit(rangeStart, iso)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-headline font-extrabold text-lg text-on-surface flex items-center gap-2">
              <Icon name="calendar_month" className="text-primary" />
              Lịch làm việc
            </h3>
            <p className="text-[12px] text-on-surface-variant mt-0.5">
              {rangeStart
                ? `Đã chọn ${rangeStart}. Chọn tiếp ngày kết thúc để đăng ký nghỉ.`
                : 'Chọn ngày bắt đầu rồi ngày kết thúc để đăng ký một khoảng nghỉ.'}
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

        {/* Ghi chú + chú thích màu */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ghi chú (vd: Nghỉ phép) — tuỳ chọn"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {rangeStart && (
            <button
              type="button"
              onClick={() => {
                setRangeStart(null)
                setError(null)
              }}
              className="px-3 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
            >
              Huỷ chọn
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 mb-4 text-[12px]">
          <Legend className="bg-primary/15 border-primary/50" label="Ngày nghỉ (gỡ được)" />
          <Legend className="bg-error/15 border-error/40" label="Bận vì booking/chuyến" />
          <Legend className="ring-2 ring-primary" label="Hôm nay" />
        </div>

        {error && (
          <div className="mb-4 text-sm text-error bg-error/10 rounded-xl px-3 py-2">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {months.map((m) => (
            <MonthGrid
              key={`${m.year}-${m.month}`}
              year={m.year}
              month={m.month}
              offSet={offSet}
              bookingBusySet={bookingBusySet}
              todayIso={todayIso}
              rangeStart={rangeStart}
              onPick={onPickDay}
            />
          ))}
        </div>
      </div>

      {/* Danh sách ngày nghỉ đã đăng ký */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-6 md:p-8">
        <h4 className="font-headline font-bold text-on-surface mb-3">
          Ngày nghỉ đã đăng ký ({offDays.length})
        </h4>
        {offDays.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Bạn chưa đăng ký ngày nghỉ nào.</p>
        ) : (
          <ul className="space-y-2">
            {offDays.map((o) => (
              <li
                key={o.id}
                className="flex items-center justify-between gap-3 bg-surface-container-low rounded-xl px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-on-surface">
                    {o.startDate === o.endDate ? o.startDate : `${o.startDate} → ${o.endDate}`}
                  </p>
                  {o.note && (
                    <p className="text-[12px] text-on-surface-variant truncate">{o.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeOff.mutate(o.id)}
                  disabled={removeOff.isPending}
                  className="flex items-center gap-1 text-sm font-semibold text-error hover:bg-error/10 rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  <Icon name="delete" size={16} />
                  Gỡ
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-3.5 h-3.5 rounded-md border', className)} />
      <span className="text-on-surface-variant">{label}</span>
    </span>
  )
}

/** Lưới 1 tháng — ngày bấm được để chọn khoảng nghỉ. */
function MonthGrid({
  year,
  month,
  offSet,
  bookingBusySet,
  todayIso,
  rangeStart,
  onPick,
}: {
  year: number
  month: number
  offSet: Set<string>
  bookingBusySet: Set<string>
  todayIso: string
  rangeStart: string | null
  onPick: (iso: string) => void
}) {
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
          const isOff = offSet.has(iso)
          const isBooking = bookingBusySet.has(iso)
          const isToday = iso === todayIso
          const isPast = iso < todayIso
          const isSelStart = iso === rangeStart
          const clickable = !isPast && !isBooking && !isOff
          return (
            <button
              key={iso}
              type="button"
              disabled={isPast}
              onClick={() => onPick(iso)}
              title={
                isOff
                  ? 'Ngày nghỉ đã đăng ký'
                  : isBooking
                    ? 'Bận vì booking/chuyến đi'
                    : 'Còn trống — bấm để chọn'
              }
              className={cn(
                'aspect-square flex items-center justify-center text-[12px] rounded-md select-none transition-colors',
                isPast && 'opacity-35 cursor-not-allowed',
                isOff && 'bg-primary/15 text-primary font-bold',
                isBooking && 'bg-error/15 text-error font-bold cursor-not-allowed',
                !isOff && !isBooking && !isPast && 'bg-surface-container-low text-on-surface hover:bg-primary/10',
                clickable && 'cursor-pointer',
                isSelStart && 'ring-2 ring-primary ring-offset-1',
                isToday && !isSelStart && 'ring-2 ring-primary',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
