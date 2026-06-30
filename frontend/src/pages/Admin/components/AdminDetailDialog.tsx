import type { ReactNode } from 'react'
import { Icon } from '@components/ui/Icon'

interface Props {
  title: string
  subtitle?: string
  /** Optional leading visual (avatar / cover thumbnail). */
  media?: ReactNode
  onClose: () => void
  children: ReactNode
  /** Sticky footer actions (buttons). */
  footer?: ReactNode
}

/**
 * Khung modal chi tiết dùng chung cho các trang Admin — bắt chước DetailDialog
 * của duyệt HDV: overlay mờ, hộp max-w-3xl, header + footer sticky, cuộn dọc.
 * Mỗi trang tự đổ nội dung (Section/Row) vào children.
 */
export function AdminDetailDialog({ title, subtitle, media, onClose, children, footer }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
        <header className="sticky top-0 bg-surface-container-lowest/95 backdrop-blur px-6 py-4 border-b border-outline-variant/15 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {media}
            <div className="min-w-0">
              <h3 className="font-headline font-extrabold text-xl text-on-surface truncate">
                {title}
              </h3>
              {subtitle && <p className="text-xs text-on-surface-variant truncate">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center flex-shrink-0"
            aria-label="Đóng"
          >
            <Icon name="close" />
          </button>
        </header>

        <div className="p-6 space-y-5">{children}</div>

        {footer && (
          <footer className="sticky bottom-0 bg-surface-container-lowest/95 backdrop-blur px-6 py-4 border-t border-outline-variant/15 flex items-center justify-end gap-2">
            {footer}
          </footer>
        )}
      </div>
    </div>
  )
}

export function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] uppercase tracking-widest font-bold text-on-surface-variant">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

export function AdminRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm">
      <span className="sm:w-40 text-on-surface-variant flex-shrink-0">{label}</span>
      <span className="text-on-surface font-semibold flex-1 break-words">{value}</span>
    </div>
  )
}
