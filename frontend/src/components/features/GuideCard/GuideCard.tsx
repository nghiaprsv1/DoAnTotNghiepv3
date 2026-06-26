import { Icon } from '@components/ui/Icon'
import type { Guide } from '@types/post'

interface GuideCardProps {
  guide: Guide
}

/**
 * Featured guide / hướng dẫn viên card.
 */
export function GuideCard({ guide }: GuideCardProps) {
  return (
    <div className="bg-surface-container-lowest rounded-3xl p-4 editorial-shadow group border border-surface-container hover:border-primary/30 transition-all">
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden mb-5">
        <img
          src={guide.avatar}
          alt={guide.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute top-4 right-4 bg-surface-container-lowest/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Icon name="star" className="text-[#ffb000] fill" size={16} />
          <span className="text-xs font-bold text-on-surface">{guide.rating}</span>
        </div>
      </div>
      <div className="px-2">
        <h4 className="text-xl font-headline font-bold text-on-surface mb-1">{guide.name}</h4>
        <div className="flex items-center gap-1.5 text-on-surface-variant text-sm mb-6">
          <Icon name="location_on" size={18} />
          <span>{guide.location}</span>
        </div>
        <button
          type="button"
          className="w-full py-3 rounded-xl border-2 border-primary text-primary font-headline font-bold hover:bg-primary hover:text-on-primary transition-all active:scale-95"
        >
          View Profile
        </button>
      </div>
    </div>
  )
}
