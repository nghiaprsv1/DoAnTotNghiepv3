import { useEffect, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { tripService } from '@services/tripService'
import type { ItineraryDay } from '@types/trip'

interface DraftActivity {
  time: string
  title: string
  description?: string
}

interface DraftDay {
  dayNumber: number
  date: string
  title: string
  activities: DraftActivity[]
}

interface Props {
  open: boolean
  tripId: string
  initialItinerary: ItineraryDay[]
  tripStartDate?: string
  onClose: () => void
  onSaved: () => void
}

const toIsoDate = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (iso: string, n: number) => {
  const base = new Date(iso)
  base.setDate(base.getDate() + n)
  return toIsoDate(base)
}

/**
 * Owner-only modal that edits a trip's full itinerary in place. Submitting
 * replaces the existing days/activities via PUT /trips/:id/itinerary.
 */
export function ItineraryEditorModal({
  open,
  tripId,
  initialItinerary,
  tripStartDate,
  onClose,
  onSaved,
}: Props) {
  const [days, setDays] = useState<DraftDay[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setDays(
      initialItinerary.length > 0
        ? initialItinerary.map((d) => ({
            dayNumber: d.dayNumber,
            date: d.date,
            title: d.title,
            activities: (d.activities ?? []).map((a) => ({
              time: a.time,
              title: a.title,
              description: a.description,
            })),
          }))
        : [
            {
              dayNumber: 1,
              date: tripStartDate ?? toIsoDate(new Date()),
              title: 'Ngày 1',
              activities: [],
            },
          ],
    )
  }, [open, initialItinerary, tripStartDate])

  if (!open) return null

  const updateDay = (idx: number, patch: Partial<DraftDay>) =>
    setDays((prev) => prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)))

  const addDay = () => {
    const last = days[days.length - 1]
    const nextNumber = (last?.dayNumber ?? 0) + 1
    const baseDate = last?.date ?? tripStartDate ?? toIsoDate(new Date())
    setDays((prev) => [
      ...prev,
      {
        dayNumber: nextNumber,
        date: addDays(baseDate, last ? 1 : 0),
        title: `Ngày ${nextNumber}`,
        activities: [],
      },
    ])
  }

  const removeDay = (idx: number) =>
    setDays((prev) => prev.filter((_, i) => i !== idx).map((d, i) => ({ ...d, dayNumber: i + 1 })))

  const addActivity = (idx: number) =>
    updateDay(idx, {
      activities: [...days[idx].activities, { time: '08:00', title: '', description: '' }],
    })

  const updateActivity = (di: number, ai: number, patch: Partial<DraftActivity>) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i !== di
          ? d
          : { ...d, activities: d.activities.map((a, j) => (j === ai ? { ...a, ...patch } : a)) },
      ),
    )

  const removeActivity = (di: number, ai: number) =>
    setDays((prev) =>
      prev.map((d, i) =>
        i !== di ? d : { ...d, activities: d.activities.filter((_, j) => j !== ai) },
      ),
    )

  const handleSave = async () => {
    setError(null)
    setSaving(true)
    try {
      // Drop empty activities (no title) so we don't bloat the BE.
      const payload = days.map((d) => ({
        dayNumber: d.dayNumber,
        date: d.date,
        title: d.title.trim() || `Ngày ${d.dayNumber}`,
        activities: d.activities
          .filter((a) => a.title.trim())
          .map((a) => ({
            time: a.time.trim() || '08:00',
            title: a.title.trim(),
            description: a.description?.trim() || undefined,
          })),
      }))
      await tripService.saveItinerary(tripId, payload)
      onSaved()
      onClose()
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Không lưu được lịch trình.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 bg-on-surface/40 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest rounded-t-3xl md:rounded-3xl shadow-editorial-lg w-full max-w-3xl max-h-[95vh] md:max-h-[90vh] flex flex-col safe-bottom"
      >
        <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-outline-variant/15">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Owner only
            </p>
            <h2 className="font-headline font-extrabold text-xl text-on-surface">
              Chỉnh lịch trình chuyến đi
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {days.map((d, di) => (
            <div
              key={di}
              className="rounded-2xl border border-outline-variant/20 bg-surface-container-low p-4 space-y-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-xl editorial-gradient text-on-primary flex items-center justify-center font-headline font-extrabold">
                  {d.dayNumber}
                </span>
                <input
                  value={d.title}
                  onChange={(e) => updateDay(di, { title: e.target.value })}
                  placeholder={`Ngày ${d.dayNumber}`}
                  className="flex-1 bg-surface-container-lowest rounded-xl px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/40"
                />
                <input
                  type="date"
                  value={d.date}
                  onChange={(e) => updateDay(di, { date: e.target.value })}
                  className="bg-surface-container-lowest rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                />
                <button
                  type="button"
                  onClick={() => removeDay(di)}
                  aria-label="Xoá ngày"
                  className="w-9 h-9 rounded-xl bg-error/10 text-error hover:bg-error/20 flex items-center justify-center"
                >
                  <Icon name="delete" size={18} />
                </button>
              </div>

              <div className="space-y-2">
                {d.activities.map((a, ai) => (
                  <div key={ai} className="grid grid-cols-12 gap-2">
                    <input
                      value={a.time}
                      onChange={(e) => updateActivity(di, ai, { time: e.target.value })}
                      placeholder="08:00"
                      className="col-span-2 bg-surface-container-lowest rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      value={a.title}
                      onChange={(e) => updateActivity(di, ai, { title: e.target.value })}
                      placeholder="Hoạt động"
                      className="col-span-4 bg-surface-container-lowest rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      value={a.description ?? ''}
                      onChange={(e) => updateActivity(di, ai, { description: e.target.value })}
                      placeholder="Mô tả ngắn (tuỳ chọn)"
                      className="col-span-5 bg-surface-container-lowest rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <button
                      type="button"
                      onClick={() => removeActivity(di, ai)}
                      aria-label="Xoá hoạt động"
                      className="col-span-1 rounded-lg bg-error/10 text-error hover:bg-error/20 flex items-center justify-center"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addActivity(di)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary hover:bg-primary/15"
                >
                  <Icon name="add" size={14} />
                  Thêm hoạt động
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addDay}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-outline-variant/40 hover:border-primary/60 hover:text-primary text-on-surface-variant text-sm font-headline font-bold transition"
          >
            <Icon name="add" />
            Thêm ngày
          </button>
        </div>

        {error && (
          <div className="px-6 pb-2 text-error text-sm flex items-center gap-2">
            <Icon name="error" size={16} />
            {error}
          </div>
        )}

        <footer className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
          <Button type="button" variant="ghost" rounded="full" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button type="button" rounded="full" onClick={handleSave} disabled={saving}>
            <Icon name={saving ? 'hourglass_empty' : 'save'} />
            {saving ? 'Đang lưu…' : 'Lưu lịch trình'}
          </Button>
        </footer>
      </div>
    </div>
  )
}
