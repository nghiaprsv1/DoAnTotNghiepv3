import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { ImageUpload } from '@components/common/ImageUpload'
import { LoadingState } from '@components/common/LoadingState'
import { ROUTES, tripDetailPath } from '@constants/routes'
import { useAuthStore } from '@store/authStore'
import { useTrip } from '@hooks/useTrips'
import { tripService, type UpdateTripPayload } from '@services/tripService'
import { placeService } from '@services/placeService'
import { LocationPicker, type LocationValue } from '@pages/CreateTrip/components/LocationPicker'

interface CategoryOption {
  id: string
  key: string
  label: string
  icon?: string
}

function diffDaysInclusive(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start).getTime()
  const e = new Date(end).getTime()
  if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0
  return Math.floor((e - s) / 86400000) + 1
}

export function EditTripPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { data: trip, isLoading } = useTrip(id)

  const [title, setTitle] = useState('')
  const [destination, setDestination] = useState('')
  const [originLoc, setOriginLoc] = useState<LocationValue | null>(null)
  const [destLoc, setDestLoc] = useState<LocationValue | null>(null)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [maxMembers, setMaxMembers] = useState('8')
  const [priceFrom, setPriceFrom] = useState('')
  const [currency, setCurrency] = useState('VND')
  const [description, setDescription] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [accommodation, setAccommodation] = useState('')
  const [transport, setTransport] = useState('')
  const [meals, setMeals] = useState('')

  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoryId, setCategoryId] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedOk, setSavedOk] = useState(false)

  // Load categories.
  useEffect(() => {
    placeService
      .categories()
      .then((list) => setCategories(list as CategoryOption[]))
      .catch(() => undefined)
  }, [])

  // Hydrate form from trip + match category by key.
  useEffect(() => {
    if (!trip) return
    setTitle(trip.title)
    setDestination(trip.destination)
    // Hydrate location pickers from saved coordinates (if any).
    if (trip.originLat != null && trip.originLng != null) {
      setOriginLoc({
        name: trip.originName ?? 'Điểm xuất phát',
        lat: trip.originLat,
        lng: trip.originLng,
      })
    }
    if (trip.destinationLat != null && trip.destinationLng != null) {
      setDestLoc({
        name: trip.destination,
        lat: trip.destinationLat,
        lng: trip.destinationLng,
      })
    }
    setStartDate(trip.startDate)
    setEndDate(trip.endDate)
    setMaxMembers(String(trip.maxMembers))
    setPriceFrom(String(trip.priceFrom ?? ''))
    setCurrency(trip.currency || 'VND')
    setDescription(trip.description)
    setCoverImage(trip.coverImage)
    setTagsInput((trip.tags ?? []).join(', '))
    setAccommodation(trip.inclusions?.accommodation ?? '')
    setTransport(trip.inclusions?.transport ?? '')
    setMeals(trip.inclusions?.meals ?? '')
  }, [trip])

  // Once categories AND trip both loaded, pick the matching category id.
  useEffect(() => {
    if (!trip || categories.length === 0) return
    const match = categories.find((c) => c.key === trip.category)
    if (match) setCategoryId(match.id)
  }, [trip, categories])

  const durationDays = useMemo(() => diffDaysInclusive(startDate, endDate), [startDate, endDate])

  if (!isAuthenticated) return <Navigate to={ROUTES.LOGIN} replace />

  if (isLoading || !trip) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <LoadingState label="Đang tải chuyến đi..." />
      </div>
    )
  }

  // Only the trip owner may edit.
  if (!trip.isOwner) {
    return <Navigate to={tripDetailPath(trip.id)} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !id) return
    if (!title.trim() || !destination.trim() || !categoryId) {
      setError('Tiêu đề, điểm đến và danh mục là bắt buộc.')
      return
    }
    if (durationDays <= 0) {
      setError('Ngày kết thúc phải sau ngày bắt đầu.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const incl = {
        accommodation: accommodation.trim() || undefined,
        transport: transport.trim() || undefined,
        meals: meals.trim() || undefined,
      }
      const hasInclusions = Object.values(incl).some(Boolean)

      const payload: UpdateTripPayload = {
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
        inclusions: hasInclusions ? incl : undefined,
      }
      await tripService.update(id, payload)
      setSavedOk(true)
      setTimeout(() => navigate(tripDetailPath(id)), 800)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string | string[] }>
      const msg = ax.response?.data?.message
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Không lưu được chuyến đi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <header className="mb-8">
        <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-2 block">
          Chỉnh sửa chuyến đi
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline text-on-surface">
          {trip.title}
        </h1>
        <p className="text-on-surface-variant mt-2">
          Mọi thay đổi sẽ được gửi thông báo đến các thành viên đang tham gia.
        </p>
      </header>

      <form className="space-y-8" onSubmit={handleSubmit}>
        <section className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl space-y-5">
          <Input
            label="Tiêu đề"
            tone="highest"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                if (v) setDestination(v.name.split(',')[0].trim())
              }}
              placeholder="Bạn muốn đi đâu?"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tên điểm đến hiển thị"
              tone="highest"
              iconLeft="badge"
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
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Ngày bắt đầu"
              type="date"
              tone="highest"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Ngày kết thúc"
              type="date"
              tone="highest"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Số người tối đa"
              type="number"
              min={1}
              tone="highest"
              value={maxMembers}
              onChange={(e) => setMaxMembers(e.target.value)}
            />
            <Input
              label="Giá ước tính"
              type="number"
              min={0}
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
            hint="Chọn ảnh từ máy của bạn để cập nhật ảnh bìa chuyến đi."
            value={coverImage || null}
            onChange={(url) => setCoverImage(url ?? '')}
            aspect="aspect-[16/9]"
          />
          <Input
            label="Tag (cách nhau bằng dấu phẩy)"
            tone="highest"
            iconLeft="sell"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Lưu trú"
              tone="highest"
              iconLeft="hotel"
              value={accommodation}
              onChange={(e) => setAccommodation(e.target.value)}
            />
            <Input
              label="Di chuyển"
              tone="highest"
              iconLeft="directions_boat"
              value={transport}
              onChange={(e) => setTransport(e.target.value)}
            />
            <Input
              label="Bữa ăn"
              tone="highest"
              iconLeft="restaurant"
              value={meals}
              onChange={(e) => setMeals(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
              Mô tả
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/40 focus:outline-none text-on-surface resize-none"
            />
          </div>
        </section>

        {error && (
          <div className="rounded-2xl bg-error/10 border border-error/20 px-6 py-4 text-error text-sm flex items-start gap-3">
            <Icon name="error" />
            <span>{error}</span>
          </div>
        )}
        {savedOk && (
          <div className="rounded-2xl bg-green-500/10 border border-green-500/20 px-6 py-4 text-green-700 text-sm flex items-start gap-3">
            <Icon name="check_circle" />
            <span>Đã lưu, đang quay lại trang chi tiết...</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="flex-1"
            onClick={() => navigate(tripDetailPath(trip.id))}
          >
            Huỷ
          </Button>
          <Button type="submit" size="lg" className="flex-[2]" isLoading={submitting}>
            <Icon name="check" />
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </div>
  )
}
