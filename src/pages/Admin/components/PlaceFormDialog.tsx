import { useEffect, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { ImageUpload } from '@components/common/ImageUpload'
import {
  useCreatePlace,
  useUpdatePlace,
  usePlaceCategories,
  usePlaceProvinces,
} from '@hooks/useAdminPlaces'
import type { AdminPlaceRow, AdminPlacePayload } from '@services/placeService'

interface Props {
  open: boolean
  /** Row to edit; null = create mode. */
  place: AdminPlaceRow | null
  onClose: () => void
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const empty = {
  name: '',
  slug: '',
  description: '',
  longDescription: '',
  categoryId: '',
  provinceId: '',
  city: '',
  address: '',
  coverImage: '',
  duration: '',
  bestTime: '',
  entranceFee: '',
  tags: '',
  highlights: '',
}

/** Create / edit a place. Reused for both modes via the `place` prop. */
export function PlaceFormDialog({ open, place, onClose }: Props) {
  const isEdit = !!place
  const [form, setForm] = useState({ ...empty })
  const [error, setError] = useState<string | null>(null)

  const { data: categories = [] } = usePlaceCategories()
  const { data: provinces = [] } = usePlaceProvinces()
  const create = useCreatePlace()
  const update = useUpdatePlace()
  const saving = create.isPending || update.isPending

  useEffect(() => {
    if (!open) return
    setError(null)
    if (place) {
      setForm({
        name: place.name,
        slug: place.slug,
        description: place.description,
        longDescription: place.longDescription ?? '',
        categoryId: place.categoryId ?? '',
        provinceId: place.provinceId ?? '',
        city: place.city ?? '',
        address: place.address ?? '',
        coverImage: place.coverImage,
        duration: place.duration ?? '',
        bestTime: place.bestTime ?? '',
        entranceFee: place.entranceFee ?? '',
        tags: place.tags.join(', '),
        highlights: place.highlights.join(', '),
      })
    } else {
      setForm({ ...empty })
    }
  }, [open, place])

  if (!open) return null

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (!form.name.trim()) return setError('Vui lòng nhập tên địa điểm.')
    if (!form.categoryId) return setError('Vui lòng chọn danh mục.')
    if (!form.provinceId) return setError('Vui lòng chọn tỉnh/thành.')
    if (!form.coverImage.trim()) return setError('Vui lòng chọn ảnh bìa.')
    const payload: AdminPlacePayload = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      description: form.description.trim() || form.name.trim(),
      longDescription: form.longDescription.trim() || undefined,
      categoryId: form.categoryId,
      provinceId: form.provinceId,
      city: form.city.trim() || undefined,
      address: form.address.trim() || undefined,
      coverImage: form.coverImage.trim(),
      duration: form.duration.trim() || undefined,
      bestTime: form.bestTime.trim() || undefined,
      entranceFee: form.entranceFee.trim() || undefined,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      highlights: form.highlights.split(',').map((t) => t.trim()).filter(Boolean),
    }
    try {
      if (isEdit && place) await update.mutateAsync({ id: place.id, payload })
      else await create.mutateAsync(payload)
      onClose()
    } catch (e) {
      const err = e as { response?: { data?: { message?: string | string[] } } }
      const m = err.response?.data?.message
      setError(Array.isArray(m) ? m.join(', ') : m ?? 'Không lưu được địa điểm.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur p-0 md:p-4">
      <div className="bg-surface-container-lowest rounded-t-3xl md:rounded-3xl shadow-editorial-lg w-full max-w-2xl max-h-[92vh] overflow-y-auto safe-bottom">
        <header className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur flex items-center justify-between px-5 md:px-6 py-4 border-b border-outline-variant/15">
          <h3 className="font-headline font-extrabold text-lg text-on-surface">
            {isEdit ? 'Chỉnh sửa địa điểm' : 'Thêm địa điểm'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
          >
            <Icon name="close" />
          </button>
        </header>
        <div className="p-5 md:p-6 space-y-4">
          {/* fields injected below */}
          <PlaceFormFields
            form={form}
            set={set}
            categories={categories}
            provinces={provinces}
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" size="lg" className="flex-1" onClick={onClose}>
              Huỷ
            </Button>
            <Button size="lg" className="flex-1" onClick={submit} isLoading={saving}>
              <Icon name="save" />
              {isEdit ? 'Lưu thay đổi' : 'Tạo địa điểm'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** The scrollable field set — split out to keep the dialog component small. */
function PlaceFormFields({
  form,
  set,
  categories,
  provinces,
}: {
  form: Record<string, string>
  set: (k: never, v: string) => void
  categories: { id: string; label: string }[]
  provinces: { id: string; name: string }[]
}) {
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    (set as unknown as (k: string, v: string) => void)(k, e.target.value)
  return (
    <>
      <Input label="Tên địa điểm" tone="highest" value={form.name} onChange={f('name')} required />
      <Input
        label="Slug (để trống sẽ tự tạo)"
        tone="highest"
        value={form.slug}
        onChange={f('slug')}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
            Danh mục
          </label>
          <select
            value={form.categoryId}
            onChange={f('categoryId')}
            className="w-full bg-surface-container-highest border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-primary/40 text-on-surface font-medium"
          >
            <option value="">— Chọn —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
            Tỉnh / Thành
          </label>
          <select
            value={form.provinceId}
            onChange={f('provinceId')}
            className="w-full bg-surface-container-highest border-none rounded-2xl py-3.5 px-4 outline-none focus:ring-2 focus:ring-primary/40 text-on-surface font-medium"
          >
            <option value="">— Chọn —</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Thành phố/Quận (tuỳ chọn)" tone="highest" value={form.city} onChange={f('city')} />
        <Input label="Địa chỉ (tuỳ chọn)" tone="highest" value={form.address} onChange={f('address')} />
      </div>
      <ImageUpload
        label="Ảnh bìa"
        value={form.coverImage || null}
        onChange={(url) => (set as unknown as (k: string, v: string) => void)('coverImage', url ?? '')}
        aspect="aspect-[16/9]"
      />
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Mô tả ngắn
        </label>
        <textarea
          rows={2}
          value={form.description}
          onChange={f('description')}
          className="w-full px-4 py-3 rounded-2xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/40 outline-none resize-none text-on-surface"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Mô tả chi tiết (tuỳ chọn)
        </label>
        <textarea
          rows={4}
          value={form.longDescription}
          onChange={f('longDescription')}
          className="w-full px-4 py-3 rounded-2xl bg-surface-container-highest border-none focus:ring-2 focus:ring-primary/40 outline-none resize-none text-on-surface"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Thời lượng" tone="highest" value={form.duration} onChange={f('duration')} />
        <Input label="Thời điểm đẹp" tone="highest" value={form.bestTime} onChange={f('bestTime')} />
        <Input label="Vé vào cửa" tone="highest" value={form.entranceFee} onChange={f('entranceFee')} />
      </div>
      <Input
        label="Tags (cách nhau dấu phẩy)"
        tone="highest"
        value={form.tags}
        onChange={f('tags')}
      />
      <Input
        label="Điểm nổi bật (cách nhau dấu phẩy)"
        tone="highest"
        value={form.highlights}
        onChange={f('highlights')}
      />
    </>
  )
}
