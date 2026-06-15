import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { MultiImageUpload } from '@components/common/ImageUpload'
import { cn } from '@utils/cn'
import type { PostVisibility } from '@types/post'

interface Props {
  avatar: string
  /** Posted with up to 3 images. The first image is used as the cover. */
  onPost: (text: string, images: string[], visibility: PostVisibility) => void
}

const MAX_IMAGES = 3

export function PostComposer({ avatar, onPost }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [visibility, setVisibility] = useState<PostVisibility>('public')
  const [showImageUploader, setShowImageUploader] = useState(false)

  const submit = () => {
    if (!text.trim()) return
    onPost(text, images, visibility)
    setText('')
    setImages([])
    setVisibility('public')
    setShowImageUploader(false)
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

          {(showImageUploader || images.length > 0) && (
            <div className="mt-3">
              <MultiImageUpload
                value={images}
                onChange={setImages}
                max={MAX_IMAGES}
                label="Ảnh đính kèm"
                hint={`Tối đa ${MAX_IMAGES} ảnh, chọn từ máy.`}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1 mt-3 pt-3 border-t border-outline-variant/15">
            <ToolButton
              icon="image"
              label={`Ảnh${images.length ? ` (${images.length}/${MAX_IMAGES})` : ''}`}
              onClick={() => setShowImageUploader((v) => !v)}
            />
            <ToolButton icon="location_on" label="Vị trí" />
            <ToolButton icon="mood" label="Cảm xúc" />
            <ToolButton icon="alternate_email" label="Tag" />

            <span className="w-px h-5 bg-outline-variant/30 mx-1" />

            {/* Visibility toggle */}
            <button
              type="button"
              onClick={() => setVisibility((v) => (v === 'public' ? 'friends' : 'public'))}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition',
                visibility === 'public'
                  ? 'text-primary bg-primary/10 hover:bg-primary/15'
                  : 'text-amber-700 bg-amber-500/15 hover:bg-amber-500/20',
              )}
              title="Chuyển đổi quyền xem bài"
            >
              <Icon name={visibility === 'public' ? 'public' : 'group'} size={16} />
              <span className="hidden sm:inline font-headline font-bold">
                {visibility === 'public' ? 'Công khai' : 'Bạn bè'}
              </span>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setText('')
                  setImages([])
                  setShowImageUploader(false)
                  setVisibility('public')
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
