import { useEffect, useRef, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { MultiImageUpload } from '@components/common/ImageUpload'
import { userService } from '@services/userService'
import { cn } from '@utils/cn'
import type { PostVisibility } from '@types/post'
import type { PublicProfile } from '@types/profile'

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
  const [showTagSearch, setShowTagSearch] = useState(false)

  const submit = () => {
    if (!text.trim()) return
    onPost(text, images, visibility)
    setText('')
    setImages([])
    setVisibility('public')
    setShowImageUploader(false)
    setShowTagSearch(false)
    setOpen(false)
  }

  // Insert a "@handle " mention into the post text.
  const addMention = (handle: string) => {
    setText((prev) => {
      const sep = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : ''
      return `${prev}${sep}@${handle} `
    })
    setShowTagSearch(false)
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

          {showTagSearch && (
            <div className="mt-3">
              <TagSearch onPick={addMention} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1 mt-3 pt-3 border-t border-outline-variant/15">
            <ToolButton
              icon="image"
              label={`Ảnh${images.length ? ` (${images.length}/${MAX_IMAGES})` : ''}`}
              onClick={() => setShowImageUploader((v) => !v)}
            />
            <ToolButton
              icon="alternate_email"
              label="Tag"
              active={showTagSearch}
              onClick={() => setShowTagSearch((v) => !v)}
            />

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
                  setShowTagSearch(false)
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
  active,
}: {
  icon: string
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition',
        active
          ? 'text-primary bg-primary/10'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary',
      )}
    >
      <Icon name={icon} size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

/** Inline user picker for @-mentions — debounced live search, click to insert. */
function TagSearch({ onPick }: { onPick: (handle: string) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setResults([])
      return
    }
    setLoading(true)
    const t = window.setTimeout(async () => {
      try {
        setResults(await userService.search(term, 8))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(t)
  }, [q])

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-low overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant/15">
        <Icon name="alternate_email" size={16} className="text-on-surface-variant" />
        <input
          ref={inputRef}
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gắn thẻ ai đó theo tên hoặc handle…"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-on-surface-variant/60"
        />
      </div>
      {q.trim() && (
        <div className="max-h-56 overflow-y-auto">
          {loading ? (
            <div className="px-3 py-3 text-sm text-on-surface-variant">Đang tìm…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-on-surface-variant">
              Không tìm thấy người dùng nào.
            </div>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onPick(u.handle)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-surface-container text-left transition"
              >
                <Avatar src={u.avatar} alt={u.name} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-bold text-on-surface truncate flex items-center gap-1">
                    {u.name}
                    {u.verified && (
                      <Icon name="verified" className="text-primary fill" size={14} />
                    )}
                  </p>
                  <p className="text-xs text-on-surface-variant truncate">@{u.handle}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
