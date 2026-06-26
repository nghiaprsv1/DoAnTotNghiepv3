import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { placeDetailPath } from '@constants/routes'
import { cn } from '@utils/cn'
import type { Place } from '@types/place'

interface Props {
  place: Place
  /** Compact horizontal variant for similar/related list */
  compact?: boolean
}

export function PlaceCard({ place, compact }: Props) {
  if (compact) {
    return (
      <Link
        to={placeDetailPath(place.id)}
        className="flex items-center gap-3 p-2 rounded-2xl bg-surface-container-lowest hover:bg-surface-container-low transition group"
      >
        <img
          src={place.coverImage}
          alt={place.name}
          className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-headline font-extrabold text-on-surface truncate group-hover:text-primary transition">
            {place.name}
          </p>
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <Icon name="location_on" size={12} />
            {place.province}
          </p>
          <p className="text-xs text-on-surface-variant inline-flex items-center gap-1 mt-0.5">
            <Icon name="star" size={12} className="text-primary fill" />
            <strong className="text-on-surface">{place.rating.toFixed(1)}</strong>
            <span>({place.reviewCount})</span>
          </p>
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={placeDetailPath(place.id)}
      className="group flex flex-col bg-surface-container-lowest rounded-3xl overflow-hidden shadow-editorial hover:shadow-editorial-lg transition-all duration-300"
    >
      <div className="relative h-56 overflow-hidden">
        <img
          src={place.coverImage}
          alt={place.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold uppercase tracking-wider text-primary shadow">
          {place.province}
        </span>
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          aria-label="Lưu địa điểm"
          className={cn(
            'absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur flex items-center justify-center transition',
            place.isSaved
              ? 'bg-primary text-on-primary'
              : 'bg-white/85 text-on-surface hover:text-primary'
          )}
        >
          <Icon name="favorite" size={18} filled={place.isSaved} />
        </button>
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <h3 className="text-white font-headline font-extrabold text-2xl tracking-tight leading-tight line-clamp-2 drop-shadow">
            {place.name}
          </h3>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 text-white text-xs font-bold backdrop-blur flex-shrink-0">
            <Icon name="star" size={12} className="text-amber-400 fill" />
            {place.rating.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <p className="text-sm text-on-surface/85 line-clamp-2 mb-4">{place.description}</p>

        <div className="flex items-center justify-between gap-2 text-sm text-on-surface-variant mt-auto">
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <Icon name="location_on" size={16} className="text-primary" />
            <span className="font-bold text-on-surface truncate">{place.province}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 flex-shrink-0">
            <Icon name="reviews" size={16} />
            {place.reviewCount > 0 ? `${place.reviewCount} đánh giá` : 'Chưa có'}
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-outline-variant/15 flex items-center gap-1.5 text-sm">
          <Icon name="payments" size={16} className="text-primary" />
          <span className="font-bold text-on-surface">{place.entranceFee ?? 'Miễn phí'}</span>
          <span className="text-xs text-on-surface-variant">phí vào cổng</span>
        </div>
      </div>
    </Link>
  )
}
