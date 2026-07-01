import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { guideDetailPath } from '@constants/routes'
import type { Guide } from '@types/post'

interface GuideCardProps {
  guide: Guide
}

/**
 * Featured guide / hướng dẫn viên card (trang chủ).
 * Thẻ chân dung bấm được → trang chi tiết HDV.
 */
export function GuideCard({ guide }: GuideCardProps) {
  return (
    <Link
      to={guideDetailPath(guide.id)}
      className="group block bg-surface-container-lowest rounded-3xl p-3 editorial-shadow border border-surface-container hover:border-primary/30 hover:shadow-editorial-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40"
    >
      {/* Ảnh chân dung + overlay tên */}
      <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
        <img
          src={guide.avatar}
          alt={guide.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Rating */}
        <div className="absolute top-3 right-3 bg-surface-container-lowest/90 backdrop-blur-md px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Icon name="star" className="text-[#ffb000] fill" size={14} />
          <span className="text-xs font-bold text-on-surface">
            {guide.rating ? guide.rating.toFixed(1) : 'Mới'}
          </span>
        </div>

        {/* Tên + địa điểm trên ảnh */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h4 className="text-lg font-headline font-extrabold text-white leading-tight line-clamp-1">
            {guide.name}
          </h4>
          <div className="flex items-center gap-1 text-white/85 text-sm mt-0.5">
            <Icon name="location_on" size={15} />
            <span className="line-clamp-1">{guide.location}</span>
          </div>
        </div>
      </div>

      {/* Thân thẻ */}
      <div className="px-2 pt-3 pb-1">
        {/* Chuyên môn */}
        <div className="flex flex-wrap gap-1.5 min-h-[26px] mb-3">
          {guide.specialties && guide.specialties.length > 0 ? (
            guide.specialties.slice(0, 2).map((s) => (
              <span
                key={s}
                className="px-2.5 py-0.5 rounded-full bg-primary/8 text-primary text-[11px] font-semibold"
              >
                {s}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-on-surface-variant">Hướng dẫn viên địa phương</span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-on-surface-variant flex items-center gap-1">
            <Icon name="reviews" size={14} />
            {guide.reviewCount ? `${guide.reviewCount} đánh giá` : 'Chưa có đánh giá'}
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-headline font-bold text-primary group-hover:gap-2 transition-all">
            Xem hồ sơ
            <Icon name="arrow_forward" size={16} />
          </span>
        </div>
      </div>
    </Link>
  )
}
