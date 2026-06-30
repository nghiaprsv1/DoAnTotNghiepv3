import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { uploadService } from '@services/uploadService'
import { cn } from '@utils/cn'

interface SingleProps {
  /** Current image URL (after upload) — null/undefined means no image yet. */
  value?: string | null
  onChange: (url: string | null) => void
  label?: string
  /** Helper text */
  hint?: string
  /** Aspect class, default 'aspect-video'. */
  aspect?: string
}

/**
 * Single-image picker with file dialog + drag-n-drop. Posts to /upload/image
 * and returns the absolute URL via onChange. Shows a preview when set.
 */
export function ImageUpload({
  value,
  onChange,
  label = 'Ảnh',
  hint,
  aspect = 'aspect-video',
}: SingleProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const upload = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const url = await uploadService.uploadOne(file)
      onChange(url)
    } catch {
      setError('Tải ảnh thất bại. Vui lòng thử lại.')
    } finally {
      setUploading(false)
    }
  }

  /** Pull the first image file out of a paste event's clipboard items. */
  const handlePaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find((it) => it.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file) {
      e.preventDefault()
      upload(file)
    }
  }

  return (
    <div>
      {label && (
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          {label}
        </p>
      )}

      {value ? (
        <div className={cn('relative rounded-2xl overflow-hidden border border-outline-variant/15', aspect)}>
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Xoá ảnh"
            className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
          >
            <Icon name="close" />
          </button>
        </div>
      ) : (
        <label
          tabIndex={0}
          onPaste={handlePaste}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const file = e.dataTransfer.files?.[0]
            if (file) upload(file)
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition outline-none focus:border-primary focus:ring-2 focus:ring-primary/30',
            aspect,
            dragOver
              ? 'border-primary bg-primary/5'
              : 'border-outline-variant/40 hover:border-primary/60 bg-surface-container-lowest',
          )}
        >
          <span className="w-11 h-11 rounded-xl editorial-gradient text-on-primary flex items-center justify-center shadow-editorial">
            <Icon name={uploading ? 'hourglass_empty' : 'cloud_upload'} />
          </span>
          <p className="text-sm font-headline font-bold text-on-surface text-center">
            {uploading ? 'Đang tải lên…' : (
              <>Kéo thả, dán ảnh (Ctrl+V), hoặc <span className="text-primary">bấm để chọn</span></>
            )}
          </p>
          {hint && (
            <p className="text-xs text-on-surface-variant text-center max-w-md">{hint}</p>
          )}
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) upload(file)
            }}
            className="hidden"
          />
        </label>
      )}

      {error && (
        <p className="mt-2 text-xs text-error flex items-center gap-1">
          <Icon name="error" size={14} />
          {error}
        </p>
      )}
    </div>
  )
}
