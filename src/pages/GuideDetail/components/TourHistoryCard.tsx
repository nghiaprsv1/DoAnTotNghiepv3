import { Icon } from '@components/ui/Icon'
import type { GuideTourHistory } from '@types/guideDashboard'

interface Props {
  tour: GuideTourHistory
}

export function TourHistoryCard({ tour }: Props) {
  return (
    <article className="group bg-surface-container-lowest rounded-3xl overflow-hidden shadow-editorial hover:shadow-editorial-lg transition-all flex flex-col">
      <div className="relative h-44 overflow-hidden">
        <img
          src={tour.coverImage}
          alt={tour.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-primary">
          {tour.category}
        </span>
        <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/45 text-white text-[11px] font-bold backdrop-blur">
          <Icon name="star" size={12} className="fill" />
          {tour.rating.toFixed(1)}
        </span>
        <p className="absolute bottom-3 left-3 right-3 text-white font-headline font-extrabold text-lg leading-tight line-clamp-2">
          {tour.title}
        </p>
      </div>

      <div className="p-4 space-y-2.5">
        <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
          <Icon name="location_on" size={14} />
          <span className="truncate">{tour.destination}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span className="inline-flex items-center gap-1">
            <Icon name="event" size={14} />
            {tour.date}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="schedule" size={14} />
            {tour.durationDays} ngày
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="groups" size={14} />
            {tour.groupSize}
          </span>
        </div>
      </div>
    </article>
  )
}
