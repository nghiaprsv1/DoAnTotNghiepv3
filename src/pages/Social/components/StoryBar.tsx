import { Icon } from '@components/ui/Icon'
import type { Story } from '@types/post'

interface Props {
  stories: Story[]
}

export function StoryBar({ stories }: Props) {
  return (
    <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-4">
      <div className="flex gap-3 overflow-x-auto -mx-1 px-1 pb-1 scrollbar-thin">
        {/* Add story */}
        <button
          type="button"
          className="flex-shrink-0 w-20 sm:w-24 h-32 sm:h-36 rounded-2xl bg-surface-container-low flex flex-col items-center justify-end pb-3 hover:bg-surface-container transition group"
          aria-label="Thêm story mới"
        >
          <span className="w-9 h-9 rounded-full editorial-gradient text-on-primary flex items-center justify-center mb-2 shadow-editorial group-hover:scale-110 transition">
            <Icon name="add" />
          </span>
          <span className="text-[11px] font-bold text-on-surface text-center px-1">
            Story của bạn
          </span>
        </button>

        {stories.map((s) => (
          <button
            key={s.id}
            type="button"
            className="relative flex-shrink-0 w-20 sm:w-24 h-32 sm:h-36 rounded-2xl overflow-hidden group active:scale-95 transition"
          >
            <img
              src={s.preview}
              alt={s.authorName}
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div
              className={`absolute top-2 left-2 w-9 h-9 rounded-full p-0.5 ${
                s.seen ? 'bg-on-surface-variant/40' : 'editorial-gradient'
              }`}
            >
              <img
                src={s.authorAvatar}
                alt={s.authorName}
                className="w-full h-full rounded-full border-2 border-surface-container-lowest object-cover"
              />
            </div>
            <span className="absolute bottom-2 left-2 right-2 text-[11px] font-bold text-white truncate text-left">
              {s.authorName}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
