import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Badge } from '@components/ui/Badge'
import { tripDetailPath } from '@constants/routes'
import { useToggleSaved } from '@hooks/useSaved'
import { tripService } from '@services/tripService'
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

  // Đồng bộ khi dữ liệu trip refetch (vd bỏ lưu ở trang chi tiết → list mới về).
  useEffect(() => {
    setSaved(!!trip.isSaved)
  }, [trip.isSaved])

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
      onClick={() => void tripService.trackClick(trip.id)}
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
          className={`absolute top-4 right-4 backdrop-blur-md p-2 rounded-full transition-colors ${
            saved
              ? 'bg-white text-rose-500 shadow-editorial'
              : 'bg-surface-container-lowest/80 text-on-surface hover:text-rose-500'
          }`}
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
            <span className="text-xs font-bold text-on-secondary-container">
              {Number(trip.rating) > 0 ? Number(trip.rating).toFixed(1) : 'Mới'}
            </span>
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

        {/* DEBUG: thông số tính điểm gợi ý — hiển thị cho mọi chuyến để kiểm tra. */}
        <div className="mt-3 pt-3 border-t border-dashed border-surface-container text-[11px] font-mono text-on-surface-variant space-y-1">
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            <span title="Lượt xem chi tiết">👁 view: {trip.viewCount ?? 0}</span>
            <span title="Lượt click thẻ">🖱 click: {trip.clickCount ?? 0}</span>
            <span title="Lượt yêu cầu tham gia">✋ req: {trip.requestCount ?? 0}</span>
            <span title="Số thành viên">👥 mem: {trip.memberCount}/{trip.maxMembers}</span>
          </div>
          {trip.scoreBreakdown && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-primary">
              <span title="Hợp sở thích (30%)">match: {trip.scoreBreakdown.match.toFixed(3)}</span>
              <span title="Tương tác cá nhân (30%)">inter: {trip.scoreBreakdown.interaction.toFixed(3)}</span>
              <span title="Độ hot toàn hệ thống (40%)">hot: {trip.scoreBreakdown.hot.toFixed(3)}</span>
              <span className="font-bold" title="0.3·match + 0.3·inter + 0.4·hot">
                = {trip.recommendScore?.toFixed(3)}
              </span>
            </div>
          )}
          {trip.recommendReasons && trip.recommendReasons.length > 0 && (
            <div className="text-on-surface-variant/80">
              💡 {trip.recommendReasons.join(' · ')}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
