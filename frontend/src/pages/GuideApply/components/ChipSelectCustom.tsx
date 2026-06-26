import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'
import type { ChipOption } from '../../EditProfile/components/ChipSelect'

interface Props {
  options: ChipOption[]
  value: string[]
  onChange: (next: string[]) => void
  /** Placeholder cho ô nhập tự do. */
  placeholder?: string
}

/**
 * Giống ChipSelect (multi-select) nhưng CHO PHÉP NHẬP THÊM giá trị tự do ngoài
 * danh sách có sẵn. Giá trị tự do (không nằm trong `options`) hiển thị thành
 * chip riêng có nút xoá. Dùng cho Ngôn ngữ / Chuyên môn ở form đăng ký HDV.
 */
export function ChipSelectCustom({ options, value, onChange, placeholder = 'Nhập thêm rồi Enter…' }: Props) {
  const [draft, setDraft] = useState('')

  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v])

  const addCustom = () => {
    const v = draft.trim()
    if (!v) return
    // Tránh trùng (so sánh không phân biệt hoa/thường) với value sẵn có.
    const dup = value.some((x) => x.toLowerCase() === v.toLowerCase())
    if (!dup) onChange([...value, v])
    setDraft('')
  }

  const optionValues = new Set(options.map((o) => o.value))
  // Giá trị tự do = các value đang chọn nhưng KHÔNG thuộc options.
  const customValues = value.filter((v) => !optionValues.has(v))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-headline font-bold transition active:scale-95 border',
                active
                  ? 'bg-primary text-on-primary border-primary shadow-editorial'
                  : 'bg-surface-container-lowest text-on-surface border-outline-variant/30 hover:border-primary/40 hover:text-primary'
              )}
            >
              {opt.icon && (
                <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden>
                  {opt.icon}
                </span>
              )}
              {opt.label}
            </button>
          )
        })}

        {/* Chip cho các giá trị tự do đã thêm */}
        {customValues.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-headline font-bold border bg-primary text-on-primary border-primary shadow-editorial"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              aria-label={`Xoá ${v}`}
              className="hover:opacity-80"
            >
              <Icon name="close" size={14} />
            </button>
          </span>
        ))}
      </div>

      {/* Ô nhập tự do */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-surface-container-highest border-none rounded-2xl px-4 py-2.5 text-sm text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/40"
        />
        <button
          type="button"
          onClick={addCustom}
          className="inline-flex items-center gap-1 px-4 py-2.5 rounded-2xl text-sm font-headline font-bold bg-primary/10 text-primary hover:bg-primary/20 transition whitespace-nowrap"
        >
          <Icon name="add" size={16} />
          Thêm
        </button>
      </div>
    </div>
  )
}
