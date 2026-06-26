import { Icon } from '@components/ui/Icon'
import { TripCard } from '@components/features'
import { useRecommendedTrips } from '@hooks/useTrips'
import { useAuthStore } from '@store/authStore'
import { cn } from '@utils/cn'
import type { Trip } from '@types/trip'

/**
 * Highlight strip pinned to the top of the explore tab. Shows up to 6 trips
 * scored by the BE recommender (uses User.preferences). Each card is wrapped
 * in a "Gợi ý cho bạn" frame that surfaces the match reasons returned by the
 * BE so reviewers can see clearly *why* a trip was suggested.
 */
export function RecommendedTripsSection() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { data, isLoading } = useRecommendedTrips(6)

  if (isLoading) {
    return (
      <section className="mb-10 animate-pulse">
        <div className="h-6 w-64 bg-surface-container-low rounded mb-3" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-80 rounded-xl bg-surface-container-low" />
          ))}
        </div>
      </section>
    )
  }

  if (!data || data.length === 0) return null

  const headline = isAuthenticated ? 'Gợi ý cho bạn' : 'Gợi ý nổi bật'
  const subline = isAuthenticated
    ? 'Dựa trên sở thích & gu du lịch bạn đã chọn ở trang hồ sơ.'
    : 'Đăng nhập và cập nhật sở thích trong hồ sơ để nhận gợi ý cá nhân hoá hơn.'

  return (
    <section
      className={cn(
        'mb-10 rounded-3xl bg-gradient-to-br from-primary/8 via-surface-container-lowest to-surface-container-low p-6 ring-1 ring-primary/15',
      )}
      aria-label="Gợi ý chuyến đi"
    >
      <header className="flex items-end justify-between gap-3 mb-5 flex-wrap">
        <div>
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary text-on-primary text-[11px] font-bold uppercase tracking-widest shadow-editorial mb-3">
            <Icon name="auto_awesome" size={12} />
            Cá nhân hoá
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-on-surface tracking-tight">
            {headline}
          </h2>
          <p className="text-sm text-on-surface-variant mt-1 max-w-xl">{subline}</p>
        </div>
        <p className="text-xs text-on-surface-variant inline-flex items-center gap-1.5">
          <Icon name="info" size={14} />
          {data.length} gợi ý dựa trên gu du lịch
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.map((trip, idx) => (
          <RecommendedCard key={trip.id} trip={trip} rank={idx + 1} />
        ))}
      </div>
    </section>
  )
}

function RecommendedCard({ trip, rank }: { trip: Trip; rank: number }) {
  const reasons = trip.recommendReasons ?? []
  return (
    <div className="relative">
      <span
        aria-hidden
        className="absolute -top-2 -left-2 z-10 w-9 h-9 rounded-full bg-primary text-on-primary font-headline font-extrabold text-sm flex items-center justify-center shadow-editorial-lg"
      >
        {rank}
      </span>
      <div className="rounded-xl ring-2 ring-primary/40 ring-offset-2 ring-offset-background overflow-hidden">
        <TripCard trip={trip} />
      </div>
      {reasons.length > 0 && (
        <div className="mt-3 bg-surface-container-lowest rounded-2xl p-3 shadow-editorial">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold inline-flex items-center gap-1 mb-1">
            <Icon name="psychology" size={12} />
            Vì sao gợi ý
          </p>
          <ul className="text-xs text-on-surface space-y-0.5">
            {reasons.slice(0, 3).map((r, i) => (
              <li key={i} className="inline-flex items-start gap-1.5">
                <Icon name="check_circle" size={12} className="text-primary mt-0.5" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
