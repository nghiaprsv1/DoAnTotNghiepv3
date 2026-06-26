import { Link } from 'react-router-dom'
import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { guideDetailPath } from '@constants/routes'
import { useToggleSaved } from '@hooks/useSaved'
import { cn } from '@utils/cn'
import type { HireableGuide } from '@types/trip'

interface Props {
  guide: HireableGuide
}

const availabilityStyles: Record<HireableGuide['availability'], string> = {
  available: 'bg-green-500/15 text-green-700 border-green-500/30',
  busy: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  'fully-booked': 'bg-error/10 text-error border-error/30',
}

const availabilityDot: Record<HireableGuide['availability'], string> = {
  available: 'bg-green-500',
  busy: 'bg-amber-500',
  'fully-booked': 'bg-error',
}

export function GuideListingCard({ guide }: Props) {
  const isFullyBooked = guide.availability === 'fully-booked'
  const [saved, setSaved] = useState(!!(guide as HireableGuide & { isSaved?: boolean }).isSaved)
  const toggleSaved = useToggleSaved()

  const onToggleSave = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !saved
    setSaved(next)
    toggleSaved.mutate(
      { type: 'guide', id: guide.id },
      { onError: () => setSaved(!next) },
    )
  }

  return (
    <Link
      to={guideDetailPath(guide.id)}
      className="block bg-surface-container-lowest rounded-3xl overflow-hidden shadow-editorial hover:shadow-editorial-lg transition-all duration-300 flex flex-col group focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {/* Cover — gradient banner (no cover photo) */}
      <div className="relative h-44 overflow-hidden editorial-gradient">
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />

        <span
          className={cn(
            'absolute top-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border backdrop-blur',
            availabilityStyles[guide.availability]
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', availabilityDot[guide.availability])} />
          {guide.availabilityLabel ??
            (guide.availability === 'available' ? 'Còn lịch' : 'Bận')}
        </span>

        <button
          type="button"
          onClick={onToggleSave}
          aria-label={saved ? 'Bỏ lưu hướng dẫn viên' : 'Lưu hướng dẫn viên'}
          className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-surface-container-lowest/85 backdrop-blur-md text-on-surface hover:text-primary flex items-center justify-center shadow transition-colors"
        >
          <Icon name="favorite" size={18} filled={saved} />
        </button>

        <div className="absolute -bottom-7 left-5">
          <Avatar src={guide.avatar} alt={guide.name} size="lg" ring className="border-4 border-surface-container-lowest" />
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-9 pb-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <h3 className="font-headline font-extrabold text-lg text-on-surface truncate group-hover:text-primary transition-colors">
                {guide.name}
              </h3>
              {guide.verified && (
                <Icon name="verified" size={16} className="text-primary fill" />
              )}
            </div>
            <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
              <Icon name="location_on" size={14} />
              {guide.region}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-secondary-container px-2 py-1 rounded-lg flex-shrink-0">
            <Icon name="star" size={12} className="text-on-secondary-container fill" />
            <span className="text-xs font-bold text-on-secondary-container">
              {guide.rating.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Specialties */}
        {guide.specialties && guide.specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {guide.specialties.slice(0, 3).map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 rounded-full bg-primary/8 text-primary text-[11px] font-semibold"
              >
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <Stat icon="reviews" value={`${guide.reviewCount ?? 0}`} label="đánh giá" />
          <Stat icon="luggage" value={`${guide.toursCompleted ?? 0}`} label="tours" />
        </div>

        {/* CTA */}
        <div className="mt-auto pt-4 flex items-end justify-between gap-3 border-t border-outline-variant/15 mt-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
              Từ
            </p>
            <p className="text-lg font-extrabold text-on-surface font-headline">
              {guide.currency}
              {guide.pricePerDay.toLocaleString('vi-VN')}
              <span className="text-xs font-medium text-on-surface-variant">/ngày</span>
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-headline font-bold transition',
              isFullyBooked
                ? 'bg-surface-container-low text-on-surface-variant opacity-60'
                : 'editorial-gradient text-on-primary shadow-editorial group-hover:scale-105'
            )}
          >
            {isFullyBooked ? 'Hết lịch' : 'Xem chi tiết'}
            {!isFullyBooked && <Icon name="arrow_forward" size={16} />}
          </span>
        </div>
      </div>
    </Link>
  )
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-surface-container-low rounded-xl py-2 px-1">
      <Icon name={icon} size={14} className="text-on-surface-variant" />
      <p className="text-[12px] font-bold text-on-surface mt-0.5 leading-tight truncate">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-on-surface-variant truncate">
        {label}
      </p>
    </div>
  )
}
