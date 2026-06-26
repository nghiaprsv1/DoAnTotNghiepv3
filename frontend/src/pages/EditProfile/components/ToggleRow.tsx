import { useState } from 'react'
import { Icon } from '@components/ui/Icon'

interface Props {
  label: string
  description?: string
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
}

export function ToggleRow({ label, description, defaultChecked, onChange }: Props) {
  const [checked, setChecked] = useState(!!defaultChecked)

  const toggle = () => {
    const next = !checked
    setChecked(next)
    onChange?.(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-surface-container-lowest/60 transition text-left"
    >
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-on-surface">{label}</p>
        {description && (
          <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <span
        aria-pressed={checked}
        className={`relative w-12 h-7 rounded-full flex-shrink-0 transition-colors ${
          checked ? 'bg-primary' : 'bg-surface-container-high'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow flex items-center justify-center transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        >
          {checked && <Icon name="check" className="text-primary" size={14} />}
        </span>
      </span>
    </button>
  )
}
