import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'

interface Props {
  /** Visible label above the dropzone */
  label: string
  /** Helper text under label */
  description?: string
  /** Accept attribute, e.g. 'image/*' or '.pdf,image/*' */
  accept?: string
  multiple?: boolean
  /** Max file size in MB (label only — not enforced) */
  maxSizeMB?: number
}

interface PreviewItem {
  id: string
  name: string
  size: number
  url?: string
  isImage: boolean
}

export function FileDropzone({
  label,
  description,
  accept = 'image/*,.pdf',
  multiple = true,
  maxSizeMB = 10,
}: Props) {
  const [items, setItems] = useState<PreviewItem[]>([])
  const [dragOver, setDragOver] = useState(false)

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const next: PreviewItem[] = Array.from(files).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      name: f.name,
      size: f.size,
      isImage: f.type.startsWith('image/'),
      url: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }))
    setItems((prev) => (multiple ? [...prev, ...next] : next.slice(0, 1)))
  }

  const removeItem = (id: string) =>
    setItems((prev) => {
      const removed = prev.find((p) => p.id === id)
      if (removed?.url) URL.revokeObjectURL(removed.url)
      return prev.filter((p) => p.id !== id)
    })

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2 ml-1">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <span className="text-[11px] text-on-surface-variant/70">
          Tối đa {maxSizeMB}MB · {accept.replace('image/*', 'ảnh')}
        </span>
      </div>

      <label
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          addFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-2xl border-2 border-dashed cursor-pointer transition',
          dragOver
            ? 'border-primary bg-primary/5'
            : 'border-outline-variant/40 hover:border-primary/60 bg-surface-container-lowest'
        )}
      >
        <span className="w-11 h-11 rounded-xl editorial-gradient text-on-primary flex items-center justify-center shadow-editorial">
          <Icon name="cloud_upload" />
        </span>
        <p className="text-sm font-headline font-bold text-on-surface text-center">
          Kéo thả tệp vào đây, hoặc <span className="text-primary">bấm để chọn</span>
        </p>
        {description && (
          <p className="text-xs text-on-surface-variant text-center max-w-md">{description}</p>
        )}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => addFiles(e.target.files)}
          className="hidden"
        />
      </label>

      {items.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((it) => (
            <li
              key={it.id}
              className="relative bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant/15 group"
            >
              {it.isImage && it.url ? (
                <img src={it.url} alt={it.name} className="w-full h-28 object-cover" />
              ) : (
                <div className="w-full h-28 flex items-center justify-center bg-surface-container-low">
                  <Icon name="description" className="text-3xl text-on-surface-variant" />
                </div>
              )}
              <div className="px-2 py-1.5">
                <p className="text-[11px] font-semibold text-on-surface truncate" title={it.name}>
                  {it.name}
                </p>
                <p className="text-[10px] text-on-surface-variant">
                  {(it.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  removeItem(it.id)
                }}
                aria-label="Xoá"
                className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
