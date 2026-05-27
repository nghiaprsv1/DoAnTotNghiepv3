import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'

interface Props {
  avatar: string
  onPost: (text: string, image?: string) => void
}

export function PostComposer({ avatar, onPost }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | undefined>()

  const submit = () => {
    if (!text.trim()) return
    onPost(text, image)
    setText('')
    setImage(undefined)
    setOpen(false)
  }

  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low hover:bg-surface-container transition text-left"
        >
          <Avatar src={avatar} size="sm" />
          <span className="flex-1 text-on-surface-variant text-sm">
            Chia sẻ trải nghiệm của bạn…
          </span>
          <span className="text-on-surface-variant">
            <Icon name="image" />
          </span>
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="flex gap-3">
            <Avatar src={avatar} size="sm" />
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Bạn đang ở đâu? Kể cho cộng đồng nghe nào…"
              className="flex-1 bg-surface-container-low rounded-2xl p-3 outline-none resize-none placeholder:text-on-surface-variant/60 text-sm"
            />
          </div>

          {image && (
            <div className="mt-3 relative rounded-2xl overflow-hidden">
              <img src={image} alt="" className="w-full max-h-72 object-cover" />
              <button
                type="button"
                onClick={() => setImage(undefined)}
                aria-label="Xoá ảnh"
                className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              >
                <Icon name="close" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1 mt-3 pt-3 border-t border-outline-variant/15">
            <ToolButton
              icon="image"
              label="Ảnh"
              onClick={() =>
                setImage(
                  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80'
                )
              }
            />
            <ToolButton icon="location_on" label="Vị trí" />
            <ToolButton icon="mood" label="Cảm xúc" />
            <ToolButton icon="alternate_email" label="Tag" />

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setText('')
                  setImage(undefined)
                }}
                className="px-4 py-2 rounded-full text-sm font-headline font-bold text-on-surface-variant hover:bg-surface-container-low"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={!text.trim()}
                className="px-5 py-2 rounded-full editorial-gradient text-on-primary text-sm font-headline font-bold shadow-editorial active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                <Icon name="send" size={16} />
                Đăng
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  )
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: string
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition"
    >
      <Icon name={icon} size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
