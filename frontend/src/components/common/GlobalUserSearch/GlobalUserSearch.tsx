import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { userService } from '@services/userService'
import { userProfilePath } from '@constants/routes'
import type { PublicProfile } from '@types/profile'

/**
 * Global user-search popover: debounced live results, keyboard-friendly,
 * mounts in TopNav. Clicking a result navigates to that user's public profile.
 */
export function GlobalUserSearch() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<PublicProfile[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  // Debounce search calls so we don't hammer the BE on every keystroke.
  useEffect(() => {
    const term = q.trim()
    if (!term) {
      setResults([])
      return
    }
    setLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const list = await userService.search(term, 8)
        setResults(list)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => window.clearTimeout(t)
  }, [q])

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pick = (id: string) => {
    setOpen(false)
    setQ('')
    navigate(userProfilePath(id))
  }

  return (
    <div ref={wrapperRef} className="relative hidden lg:block">
      <div className="flex items-center bg-surface-container-highest px-4 py-2 rounded-full gap-2">
        <Icon name="search" className="text-on-surface-variant text-sm" />
        <input
          type="text"
          value={q}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQ(e.target.value)
            setOpen(true)
          }}
          placeholder="Tìm người dùng theo tên hoặc handle…"
          className="bg-transparent border-none focus:ring-0 text-sm w-56 placeholder:text-on-surface-variant/50 outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ('')
              setResults([])
            }}
            aria-label="Xoá"
            className="text-on-surface-variant hover:text-on-surface"
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      {open && q.trim() && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-container-lowest rounded-2xl shadow-editorial-lg border border-outline-variant/15 overflow-hidden z-50">
          {loading ? (
            <div className="p-4 text-sm text-on-surface-variant">Đang tìm…</div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-on-surface-variant">
              Không tìm thấy người dùng nào.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => pick(u.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-container-low text-left transition"
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
                    {u.role === 'guide' && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        HDV
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
