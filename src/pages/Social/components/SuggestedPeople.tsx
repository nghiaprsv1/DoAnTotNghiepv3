import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'

interface Suggested {
  id: string
  name: string
  handle: string
  avatar: string
  reason: string
}

const suggested: Suggested[] = [
  {
    id: 's1',
    name: 'Captain Đức',
    handle: '@captain.duc',
    avatar:
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    reason: 'HDV tại Hạ Long',
  },
  {
    id: 's2',
    name: 'Chị Hoa',
    handle: '@hoian.hoa',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    reason: 'Ẩm thực Hội An',
  },
  {
    id: 's3',
    name: 'Sùng A Páo',
    handle: '@apao.sapa',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    reason: 'Trekking Sapa',
  },
]

export function SuggestedPeople() {
  const [following, setFollowing] = useState<Record<string, boolean>>({})

  return (
    <section className="bg-surface-container-lowest rounded-3xl shadow-editorial p-5">
      <header className="flex items-center justify-between mb-4">
        <h3 className="font-headline font-extrabold text-on-surface">Gợi ý theo dõi</h3>
        <button type="button" className="text-xs font-bold text-primary hover:underline">
          Xem tất cả
        </button>
      </header>

      <ul className="space-y-3">
        {suggested.map((s) => {
          const isFollowing = !!following[s.id]
          return (
            <li key={s.id} className="flex items-center gap-3">
              <Avatar src={s.avatar} alt={s.name} size="sm" ring />
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-sm text-on-surface truncate">
                  {s.name}
                </p>
                <p className="text-[11px] text-on-surface-variant truncate">{s.reason}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setFollowing((prev) => ({ ...prev, [s.id]: !prev[s.id] }))
                }
                className={`px-3 py-1.5 rounded-full text-xs font-headline font-bold transition active:scale-95 ${
                  isFollowing
                    ? 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'
                    : 'editorial-gradient text-on-primary'
                }`}
              >
                {isFollowing ? (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="check" size={14} />
                    Đang theo dõi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="add" size={14} />
                    Theo dõi
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
