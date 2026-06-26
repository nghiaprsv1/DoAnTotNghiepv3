import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { messageThreadPath } from '@constants/routes'
import { Link } from 'react-router-dom'
import type { TripGuide } from '@types/trip'

interface Props {
  guide: TripGuide
  /** When true, shows actions like "Nhắn tin"; otherwise CTA "Liên hệ sau khi tham gia" */
  isJoined?: boolean
  /** Current user id. When matches guide.id, hide "message guide" CTA (you are the guide). */
  currentUserId?: string | null
}

export function TripGuidePanel({ guide, isJoined, currentUserId }: Props) {
  const isSelf = !!currentUserId && currentUserId === guide.id
  return (
    <section className="bg-surface-container-lowest p-6 md:p-7 rounded-3xl shadow-editorial border border-outline-variant/15">
      <div className="flex items-center justify-between mb-5">
        <h4 className="text-xl font-bold flex items-center gap-2 font-headline text-on-surface">
          <Icon name="tour" className="text-primary" />
          Hướng dẫn viên
        </h4>
        {guide.verified && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
            <Icon name="verified" size={12} className="fill" />
            Đã xác minh
          </span>
        )}
      </div>

      <div className="flex items-start gap-4 mb-5">
        <Avatar src={guide.avatar} alt={guide.name} size="lg" ring />
        <div className="flex-1 min-w-0">
          <p className="font-headline font-extrabold text-lg text-on-surface leading-tight">
            {guide.name}
          </p>
          <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
            <Icon name="location_on" size={14} />
            {guide.region}
          </p>
          <div className="flex items-center gap-3 mt-2 text-sm">
            <span className="flex items-center gap-1 text-on-surface">
              <Icon name="star" size={14} className="text-primary fill" />
              <span className="font-bold">{guide.rating.toFixed(2)}</span>
              {guide.reviewCount && (
                <span className="text-on-surface-variant">({guide.reviewCount})</span>
              )}
            </span>
            {guide.yearsExperience && (
              <span className="text-on-surface-variant">• {guide.yearsExperience} năm kinh nghiệm</span>
            )}
          </div>
        </div>
      </div>

      {guide.bio && (
        <p className="text-sm text-on-surface/80 leading-relaxed mb-5 italic">"{guide.bio}"</p>
      )}

      {guide.languages && guide.languages.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
            Ngôn ngữ
          </p>
          <div className="flex flex-wrap gap-2">
            {guide.languages.map((lang) => (
              <span
                key={lang}
                className="px-2.5 py-1 bg-surface-container-low rounded-full text-xs font-semibold text-on-surface"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      )}

      {guide.specialties && guide.specialties.length > 0 && (
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
            Chuyên môn
          </p>
          <div className="flex flex-wrap gap-2">
            {guide.specialties.map((s) => (
              <span
                key={s}
                className="px-2.5 py-1 bg-primary/10 rounded-full text-xs font-semibold text-primary"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {isSelf ? (
        <p className="text-center text-xs text-on-surface-variant/80">
          Bạn là hướng dẫn viên của chuyến đi này.
        </p>
      ) : isJoined ? (
        <Link
          to={messageThreadPath(guide.id)}
          className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-headline font-bold transition active:scale-[0.98]"
        >
          <Icon name="chat" />
          Nhắn tin với hướng dẫn viên
        </Link>
      ) : (
        <p className="text-center text-xs text-on-surface-variant/80">
          Bạn sẽ liên hệ được hướng dẫn viên sau khi tham gia chuyến đi.
        </p>
      )}
    </section>
  )
}
