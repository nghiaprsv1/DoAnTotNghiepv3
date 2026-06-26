import { useState } from 'react'
import { cn } from '@utils/cn'

export interface ChipOption {
  value: string
  label: string
  icon?: string
}

interface Props {
  options: ChipOption[]
  value: string[]
  onChange: (next: string[]) => void
  /** Chỉ chọn 1, false = multi-select */
  single?: boolean
}

/**
 * Multi/single-select chip group used across EditProfile sections.
 */
export function ChipSelect({ options, value, onChange, single = false }: Props) {
  const [localValue, setLocalValue] = useState(value)

  const toggle = (v: string) => {
    let next: string[]
    if (single) {
      next = [v]
    } else if (localValue.includes(v)) {
      next = localValue.filter((x) => x !== v)
    } else {
      next = [...localValue, v]
    }
    setLocalValue(next)
    onChange(next)
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = localValue.includes(opt.value)
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
    </div>
  )
}
