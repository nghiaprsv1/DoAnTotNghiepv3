import { useState } from 'react'
import { Icon } from '@components/ui/Icon'

interface Props {
  images: string[]
  alt?: string
}

export function GalleryCarousel({ images, alt = '' }: Props) {
  const [idx, setIdx] = useState(0)
  if (images.length === 0) return null

  const go = (delta: number) =>
    setIdx((i) => (i + delta + images.length) % images.length)

  return (
    <div className="relative bg-surface-container">
      <img
        src={images[idx]}
        alt={alt}
        className="w-full max-h-[640px] object-cover select-none"
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Ảnh trước"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
          >
            <Icon name="chevron_left" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Ảnh kế"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition"
          >
            <Icon name="chevron_right" />
          </button>

          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/50 text-white text-[11px] font-bold">
            {idx + 1} / {images.length}
          </div>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Đi đến ảnh ${i + 1}`}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  i === idx ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
