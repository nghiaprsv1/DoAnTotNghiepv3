import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { uploadService } from '@services/uploadService'
import { cn } from '@utils/cn'

interface Props {
  /** Current list of image URLs. */
  value: string[]
  onChange: (urls: string[]) => void
  /** Maximum total images allowed. */
  max?: number
  label?: string
  hint?: string
}

/**
 * Multi-image picker with thumbnail grid + add tile. Uploads via
 * /upload/images. Caps at `max` images (default 3). Removing one triggers
 * onChange with the new array.
 */
export function MultiImageUpload({
  value,
  onChange,
  max = 3,
  label = 'Ảnh',
  hint,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = max - value.length
    if (remaining <= 0) return
    const subset = Array.from(files).slice(0, remaining)
    setError(null)
    setUploading(true)
    try {
      const urls = await uploadService.uploadMany(subset)
      onChange([...value, ...urls].slice(0, max))
    } catch {
      setError('Tải ảnh thất bại. Vui lòng thử lại.')
    } finally {
      setUploading(false)
    }
  }

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  const canAdd = value.length < max

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 ml-1">
        {label && (
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {label}
          </p>
        )}
        <span className="text-[11px] text-on-surface-variant/70">
          {value.length}/{max}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {value.map((url, idx) => (
          <div
            key={`${url}-${idx}`}
            className="relative aspect-square rounded-2xl overflow-hidden border border-outline-variant/15 group"
          >
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              aria-label="Xoá ảnh"
              className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}

        {canAdd && (
          <label
            className={cn(
              'aspect-square flex flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed cursor-pointer transition',
              'border-outline-variant/40 hover:border-primary/60 bg-surface-container-lowest',
              uploading && 'opacity-60 cursor-progress',
            )}
          >
            <Icon name={uploading ? 'hourglass_empty' : 'add_photo_alternate'} className="text-on-surface-variant" />
            <span className="text-[11px] font-headline font-bold text-on-surface-variant">
              {uploading ? 'Đang tải…' : 'Thêm ảnh'}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => {
                addFiles(e.target.files)
                e.target.value = ''
              }}
              className="hidden"
            />
          </label>
        )}
      </div>

      {hint && <p className="mt-2 text-[11px] text-on-surface-variant ml-1">{hint}</p>}
      {error && (
        <p className="mt-2 text-xs text-error flex items-center gap-1">
          <Icon name="error" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
