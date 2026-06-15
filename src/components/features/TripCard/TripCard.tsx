import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Badge } from '@components/ui/Badge'
import { tripDetailPath } from '@constants/routes'
import { useToggleSaved } from '@hooks/useSaved'
import {
  computeTripStatus,
  tripStatusLabel,
  tripStatusTone,
  tripStatusIcon,
} from '@utils/tripStatus'
import type { Trip } from '@types/trip'

interface TripCardProps {
  trip: Trip
}

/**
 * Editorial-style trip card used in Trips list page.
 */
export function TripCard({ trip }: TripCardProps) {
  const status = computeTripStatus(trip)
  const [saved, setSaved] = useState(!!trip.isSaved)
  const toggleSaved = useToggleSaved()

  const onToggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !saved
    setSaved(next) // optimistic
    toggleSaved.mutate(
      { type: 'trip', id: trip.id },
      { onError: () => setSaved(!next) },
    )
  }
  return (
    <Link
      to={tripDetailPath(trip.id)}
      className="group bg-surface-container-lowest rounded-xl overflow-hidden hover:shadow-editorial-lg transition-all duration-300 flex flex-col"
    >
      <div className="relative h-64 overflow-hidden">
        <img
          src={trip.coverImage}
          alt={trip.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute top-4 left-4 flex items-center gap-2 flex-wrap">
          <Badge variant="outline" size="sm">
            {trip.destination}
          </Badge>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${tripStatusTone(status)}`}
          >
            <Icon name={tripStatusIcon(status)} size={12} />
            {tripStatusLabel(status)}
          </span>
          {trip.isJoined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary text-on-primary text-[10px] font-bold uppercase tracking-wider shadow-editorial">
              <Icon name="check_circle" size={12} />
              Đã tham gia
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggleSave}
          className="absolute top-4 right-4 bg-surface-container-lowest/80 backdrop-blur-md p-2 rounded-full text-on-surface hover:text-primary transition-colors"
          aria-label={saved ? 'Bỏ lưu chuyến đi' : 'Lưu chuyến đi'}
        >
          <Icon name="favorite" size={20} filled={saved} />
        </button>
      </div>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-3 gap-2">
          <h3 className="text-xl font-bold font-headline leading-tight group-hover:text-primary transition-colors">
            {trip.title}
          </h3>
          <div className="flex items-center gap-1 bg-secondary-container px-2 py-1 rounded-lg flex-shrink-0">
            <Icon name="star" className="text-on-secondary-container text-xs fill" size={14} />
            <span className="text-xs font-bold text-on-secondary-container">{trip.rating}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6 text-on-surface-variant text-sm">
          <div className="flex items-center gap-1">
            <Icon name="calendar_today" size={16} />
            <span>
              {trip.startDate} - {trip.endDate}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Icon name="group" size={16} />
            <span>
              {trip.memberCount}/{trip.maxMembers}
            </span>
          </div>
        </div>

        <div className="mt-auto pt-6 flex items-center justify-between border-t border-surface-container">
          <div className="flex items-center gap-3">
            <Avatar src={trip.creator.avatar} size="sm" />
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant">Created by</span>
              <span className="text-sm font-semibold">{trip.creator.name}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-on-surface-variant block">From</span>
            <span className="text-lg font-extrabold text-primary">
              {trip.currency}
              {trip.priceFrom}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
