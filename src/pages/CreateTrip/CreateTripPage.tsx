import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { ImageUpload } from '@components/common/ImageUpload'
import { ROUTES, tripDetailPath } from '@constants/routes'
import { useAuthStore } from '@store/authStore'
import { tripService, type CreateTripPayload } from '@services/tripService'
import { placeService } from '@services/placeService'
import { LocationPicker, type LocationValue } from './components/LocationPicker'

const HERO =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80'

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80'

interface ActivityDraft {
  time: string
  title: string
  description: string
}

interface DayDraft {
  title: string
  date: string
  activities: ActivityDraft[]
}

interface CategoryOption {
  id: string
  key: string
  label: string
  icon?: string
}

interface SectionHeaderProps {
  icon: string
  title: string
}

function SectionHeader({ icon, title }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 rounded-full editorial-gradient flex items-center justify-center text-on-primary">
        <Icon name={icon} />
      </div>
      <h2 className="font-headline text-2xl font-bold">{title}</h2>
    </div>
  )
}

/** Difference in inclusive days between two ISO dates. Returns 0 if invalid. */
function diffDaysInclusive(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0
  return Math.floor((e - s) / 86400000) + 1
}

/** ISO date string (YYYY-MM-DD) for `base` shifted by `n` days. */
function isoPlusDays(base: string, n: number): string {
  const d = base ? new Date(base) : new Date()
  if (Number.isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

export function CreateTripPage() {
  const navigate = useNavigate()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Basic fields
  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  // Toạ độ địa điểm chọn từ bản đồ (Leaflet/OSM). null = chưa chọn.
  const [originLoc, setOriginLoc] = useState<LocationValue | null>(null)
  const [destLoc, setDestLoc] = useState<LocationValue | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [maxMembers, setMaxMembers] = useState('8')
  const [priceFrom, setPriceFrom] = useState('')
  const [currency, setCurrency] = useState('VND')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState(DEFAULT_COVER)
  const [tagsInput, setTagsInput] = useState('')
  // Inclusions (Lưu trú / Di chuyển / Bữa ăn)
  const [accommodation, setAccommodation] = useState('')
  const [transport, setTransport] = useState('')
  const [meals, setMeals] = useState('')

  // Category
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoryId, setCategoryId] = useState('')

  // Itinerary days
  const [days, setDays] = useState<DayDraft[]>([
    { title: 'Ngày khởi hành', date: '', activities: [] },
  ])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch trip categories on mount.
  useEffect(() => {
    placeService
      .categories()
      .then((list) => {
        setCategories(list as CategoryOption[])
        if (list.length && !categoryId) setCategoryId(list[0].id)
      })
      .catch(() => {
        // Non-fatal: form still works once user picks a category manually.
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const durationDays = useMemo(() => diffDaysInclusive(startDate, endDate), [startDate, endDate])

  // When the start date is chosen/changed, backfill any itinerary day that
  // doesn't yet have a date (day N → startDate + N). Days the user manually
  // set are left untouched.
  useEffect(() => {
    if (!startDate) return
    setDays((prev) => {
      let changed = false
      const next = prev.map((d, i) => {
        if (d.date) return d
        changed = true
        return { ...d, date: isoPlusDays(startDate, i) }
      })
      return changed ? next : prev
    })
  }, [startDate])

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />

  const updateDay = (idx: number, patch: Partial<DayDraft>) =>
    setDays((d) => d.map((day, i) => (i === idx ? { ...day, ...patch } : day)))

  const addDay = () =>
    setDays((d) => [
      ...d,
      {
        title: `Ngày ${d.length + 1}`,
        // Auto-fill the next calendar day so the date is never left blank
        // (blank dates were silently dropped from the payload before).
        date: startDate ? isoPlusDays(startDate, d.length) : '',
        activities: [],
      },
    ])

  const removeDay = (idx: number) => setDays((d) => d.filter((_, i) => i !== idx))

  const addActivity = (dayIdx: number) =>
    updateDay(dayIdx, {
      activities: [
        ...days[dayIdx].activities,
        { time: '09:00', title: '', description: '' },
      ],
    })

  const updateActivity = (
    dayIdx: number,
    actIdx: number,
    patch: Partial<ActivityDraft>,
  ) =>
    updateDay(dayIdx, {
      activities: days[dayIdx].activities.map((a, i) =>
        i === actIdx ? { ...a, ...patch } : a,
      ),
    })

  const removeActivity = (dayIdx: number, actIdx: number) =>
    updateDay(dayIdx, {
      activities: days[dayIdx].activities.filter((_, i) => i !== actIdx),
    })

  const validate = (): string | null => {
    if (!title.trim()) return 'Vui lòng nhập tiêu đề chuyến đi.'
    if (!destination.trim()) return 'Vui lòng nhập điểm đến.'
    if (!categoryId) return 'Vui lòng chọn danh mục.'
    if (!startDate || !endDate) return 'Vui lòng chọn ngày bắt đầu và kết thúc.'
    if (durationDays <= 0) return 'Ngày kết thúc phải sau ngày bắt đầu.'
    if (!description.trim()) return 'Vui lòng mô tả chuyến đi.'
    const max = Number(maxMembers)
    if (!Number.isFinite(max) || max < 1) return 'Số thành viên tối đa phải >= 1.'
    if (!coverImage.trim()) return 'Vui lòng cung cấp ảnh bìa.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const inclusions = {
        accommodation: accommodation.trim() || undefined,
        transport: transport.trim() || undefined,
        meals: meals.trim() || undefined,
      }
      const hasInclusions = Object.values(inclusions).some(Boolean)

      const payload: CreateTripPayload = {
        title: title.trim(),
        description: description.trim(),
        destination: destination.trim(),
        originName: originLoc?.name,
        originLat: originLoc?.lat,
        originLng: originLoc?.lng,
        destinationLat: destLoc?.lat,
        destinationLng: destLoc?.lng,
        categoryId,
        coverImage: coverImage.trim(),
        startDate,
        endDate,
        durationDays,
        priceFrom: priceFrom ? Number(priceFrom) : undefined,
        currency,
        maxMembers: Number(maxMembers),
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        inclusions: hasInclusions ? inclusions : undefined,
        itinerary: days
          // Keep any day that has a title — the date is backfilled from
          // startDate when the user didn't pick one explicitly.
          .filter((d) => d.title.trim())
          .map((d, i) => ({
            dayNumber: i + 1,
            date: d.date || isoPlusDays(startDate, i),
            title: d.title.trim(),
            activities: d.activities
              .filter((a) => a.title.trim())
              .map((a) => ({
                time: a.time || '09:00',
                title: a.title.trim(),
                description: a.description.trim() || undefined,
              })),
          })),
      }
      const trip = await tripService.create(payload)
      navigate(tripDetailPath(trip.id))
    } catch (err2) {
      const ax = err2 as AxiosError<{ message?: string | string[] }>
      const msg = ax.response?.data?.message
      setError(
        Array.isArray(msg)
          ? msg.join(', ')
          : msg ?? 'Không tạo được chuyến đi. Vui lòng thử lại.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="mb-12 relative overflow-hidden rounded-2xl h-64 flex items-end p-8">
        <div className="absolute inset-0 z-0">
          <img src={HERO} alt="Sapa" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        </div>
        <div className="relative z-10 text-on-primary">
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
            Tạo chuyến đi mới
          </h1>
          <p className="text-on-primary/90 max-w-xl">
            Lên ý tưởng cho hành trình của bạn. Điền các thông tin dưới đây để mời cộng đồng cùng
            tham gia.
          </p>
        </div>
      </div>

      <form className="grid grid-cols-1 lg:grid-cols-12 gap-12" onSubmit={handleSubmit}>
        {/* Form column */}
        <div className="lg:col-span-8 space-y-12">

          {/* Section 1: Basics */}
          <section className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm">
            <SectionHeader icon="edit_note" title="Thông tin cơ bản" />
            <div className="space-y-6">
              <Input
                label="Tiêu đề chuyến đi"
                placeholder="vd: Khám phá Ninh Bình ẩn giấu"
                tone="highest"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LocationPicker
                  label="Điểm xuất phát (tuỳ chọn)"
                  icon="trip_origin"
                  value={originLoc}
                  onChange={setOriginLoc}
                  placeholder="Khởi hành từ đâu?"
                />
                <LocationPicker
                  label="Điểm đến"
                  icon="location_on"
                  value={destLoc}
                  onChange={(v) => {
                    setDestLoc(v)
                    // Đồng bộ tên điểm đến vào field text dùng cho tiêu đề/preview.
                    if (v) setDestination(v.name.split(',')[0].trim())
                  }}
                  placeholder="Bạn muốn đi đâu?"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Tên điểm đến hiển thị"
                  placeholder="VD: Đà Lạt"
                  iconLeft="badge"
                  tone="highest"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  required
                />
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                    Danh mục
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-primary/40 text-on-surface font-medium"
                  >
                    {categories.length === 0 && <option value="">Đang tải...</option>}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Ngày bắt đầu"
                  type="date"
                  tone="highest"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
                <Input
                  label="Ngày kết thúc"
                  type="date"
                  tone="highest"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Số người tối đa"
                  type="number"
                  min={1}
                  placeholder="8"
                  tone="highest"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  required
                />
                <Input
                  label="Giá ước tính"
                  type="number"
                  min={0}
                  placeholder="1500000"
                  tone="highest"
                  value={priceFrom}
                  onChange={(e) => setPriceFrom(e.target.value)}
                />
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                    Đơn vị tiền tệ
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-primary/40 text-on-surface font-medium"
                  >
                    <option value="VND">VND</option>
                    <option value="USD">USD</option>
                  </select>
                </div>
              </div>
              <ImageUpload
                label="Ảnh bìa"
                hint="Chọn ảnh từ máy của bạn (JPG, PNG…)."
                value={coverImage && coverImage !== DEFAULT_COVER ? coverImage : null}
                onChange={(url) => setCoverImage(url ?? DEFAULT_COVER)}
                aspect="aspect-[16/9]"
              />
              <Input
                label="Tag (cách nhau bằng dấu phẩy)"
                placeholder="biển, gia đình, chụp ảnh"
                iconLeft="sell"
                tone="highest"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Input
                  label="Lưu trú"
                  placeholder="vd: Resort 5*"
                  iconLeft="hotel"
                  tone="highest"
                  value={accommodation}
                  onChange={(e) => setAccommodation(e.target.value)}
                />
                <Input
                  label="Di chuyển"
                  placeholder="vd: Du thuyền riêng"
                  iconLeft="directions_boat"
                  tone="highest"
                  value={transport}
                  onChange={(e) => setTransport(e.target.value)}
                />
                <Input
                  label="Bữa ăn"
                  placeholder="vd: Trọn gói"
                  iconLeft="restaurant"
                  tone="highest"
                  value={meals}
                  onChange={(e) => setMeals(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-on-surface-variant uppercase mb-2 ml-1">
                  Mô tả chuyến đi
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/40 focus:outline-none text-on-surface transition-all resize-none"
                  placeholder="Kể cho cộng đồng về chuyến đi của bạn..."
                />
              </div>
            </div>
          </section>

          {/* Section 2: Itinerary */}
          <section className="space-y-6">
            <div className="flex justify-between items-center px-2">
              <SectionHeader icon="calendar_today" title="Lịch trình" />
              <button
                type="button"
                onClick={addDay}
                className="flex items-center gap-2 text-primary font-bold px-4 py-2 hover:bg-surface-container-low rounded-full transition-all"
              >
                <Icon name="add_circle" />
                Thêm ngày
              </button>
            </div>

            {days.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="bg-surface-container-low px-8 py-4 flex justify-between items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-headline font-bold text-lg shrink-0">
                      Ngày {dayIdx + 1}:
                    </span>
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => updateDay(dayIdx, { title: e.target.value })}
                      placeholder="Tiêu đề ngày"
                      className="bg-transparent border-none p-0 focus:ring-0 outline-none font-headline font-bold text-lg flex-1"
                    />
                    <input
                      type="date"
                      value={day.date}
                      onChange={(e) => updateDay(dayIdx, { date: e.target.value })}
                      className="bg-surface-container-highest text-sm rounded-lg px-3 py-1.5 border-none focus:ring-2 focus:ring-primary/40 outline-none"
                    />
                  </div>
                  {days.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDay(dayIdx)}
                      className="text-on-surface-variant hover:text-error transition-colors"
                      aria-label="Xoá ngày"
                    >
                      <Icon name="delete" />
                    </button>
                  )}
                </div>
                <div className="p-8 space-y-4">
                  {day.activities.map((act, actIdx) => (
                    <div key={actIdx} className="flex gap-4 items-start">
                      <input
                        type="time"
                        value={act.time}
                        onChange={(e) => updateActivity(dayIdx, actIdx, { time: e.target.value })}
                        className="bg-surface-container-low rounded-lg px-3 py-2 text-sm font-bold text-primary border-none focus:ring-2 focus:ring-primary/40 outline-none w-28"
                      />
                      <div className="flex-1 bg-surface-container-low/50 p-4 rounded-xl space-y-2">
                        <input
                          type="text"
                          placeholder="Tên hoạt động"
                          value={act.title}
                          onChange={(e) =>
                            updateActivity(dayIdx, actIdx, { title: e.target.value })
                          }
                          className="bg-transparent border-none p-0 focus:ring-0 outline-none font-bold text-on-surface w-full"
                        />
                        <textarea
                          rows={2}
                          placeholder="Chi tiết hoạt động (tuỳ chọn)"
                          value={act.description}
                          onChange={(e) =>
                            updateActivity(dayIdx, actIdx, { description: e.target.value })
                          }
                          className="bg-transparent border-none p-0 focus:ring-0 outline-none text-sm text-on-surface-variant w-full resize-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeActivity(dayIdx, actIdx)}
                        className="text-on-surface-variant hover:text-error transition-colors mt-2"
                        aria-label="Xoá hoạt động"
                      >
                        <Icon name="close" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addActivity(dayIdx)}
                    className="w-full border-2 border-dashed border-outline-variant/30 p-4 rounded-xl hover:bg-surface-container-low transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-2 text-on-surface-variant/60 group-hover:text-primary transition-colors">
                      <Icon name="add" />
                      <span className="font-bold text-sm uppercase tracking-widest">
                        Thêm hoạt động
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            ))}
          </section>

          {error && (
            <div className="rounded-2xl bg-error/10 border border-error/20 px-6 py-4 text-error text-sm flex items-start gap-3">
              <Icon name="error" />
              <span>{error}</span>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-4 py-4">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              size="lg"
              onClick={() => navigate(ROUTES.TRIPS)}
            >
              Huỷ
            </Button>
            <Button type="submit" className="flex-[2]" size="lg" isLoading={submitting}>
              <Icon name="check" />
              Đăng chuyến đi
            </Button>
          </div>
        </div>

        {/* Right: progress sidebar */}
        <aside className="lg:col-span-4">
          <div className="sticky top-28 bg-surface-container-low p-6 rounded-2xl space-y-4">
            <h4 className="font-headline font-bold">Tổng quan</h4>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface-container-highest">
              {coverImage ? (
                <img src={coverImage} alt="Cover preview" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
                  <Icon name="image" />
                </div>
              )}
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center justify-between">
                <span className="text-on-surface-variant">Số ngày</span>
                <span className="font-bold">{durationDays || '—'}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-on-surface-variant">Số ngày trong lịch</span>
                <span className="font-bold">{days.length}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-on-surface-variant">Hoạt động</span>
                <span className="font-bold">
                  {days.reduce((acc, d) => acc + d.activities.length, 0)}
                </span>
              </li>
            </ul>
            <ul className="space-y-2 text-sm pt-2 border-t border-outline-variant/20">
              {[
                ['Tiêu đề & điểm đến', !!(title && destination)],
                ['Ngày & danh mục', !!(startDate && endDate && categoryId)],
                ['Mô tả & ảnh bìa', !!(description && coverImage)],
                ['Có lịch trình', days.some((d) => d.title && d.date)],
              ].map(([label, done]) => (
                <li key={String(label)} className="flex items-center gap-2">
                  <Icon
                    name={done ? 'check_circle' : 'radio_button_unchecked'}
                    className={done ? 'text-primary' : 'text-on-surface-variant'}
                    size={20}
                  />
                  <span className={done ? 'text-on-surface' : 'text-on-surface-variant'}>
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </form>
    </div>
  )
}
