import { useState } from 'react'
import { Icon } from '@components/ui/Icon'

interface Props {
  onSend: (text: string) => void
}

export function MessageComposer({ onSend }: Props) {
  const [value, setValue] = useState('')

  const submit = () => {
    if (!value.trim()) return
    onSend(value)
    setValue('')
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="px-4 py-3 border-t border-outline-variant/15 bg-surface-container-lowest"
    >
      <div className="flex items-center gap-2 bg-surface-container-low rounded-full pl-3 pr-1 py-1">
        <button
          type="button"
          aria-label="Đính kèm ảnh"
          className="w-9 h-9 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container flex items-center justify-center transition"
        >
          <Icon name="add_photo_alternate" />
        </button>

        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Nhập tin nhắn…"
          className="flex-1 bg-transparent border-none outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60 py-2"
        />

        <button
          type="button"
          aria-label="Emoji"
          className="w-9 h-9 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container flex items-center justify-center transition"
        >
          <Icon name="mood" />
        </button>

        <button
          type="submit"
          aria-label="Gửi"
          disabled={!value.trim()}
          className="w-10 h-10 rounded-full editorial-gradient text-on-primary flex items-center justify-center shadow-editorial active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icon name="send" />
        </button>
      </div>
    </form>
  )
}
