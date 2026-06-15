import { Icon } from '@components/ui/Icon'
import { TourHistoryCard } from '../components/TourHistoryCard'
import type { GuideTourHistory } from '@types/guideDashboard'

interface Props {
  tours: GuideTourHistory[]
}

export function ToursTab({ tours }: Props) {
  if (tours.length === 0) {
    return (
      <div className="bg-surface-container-low rounded-3xl p-10 text-center">
        <Icon name="luggage" className="text-3xl text-on-surface-variant mb-2" />
        <p className="text-on-surface-variant">HDV chưa có lịch sử tour công khai.</p>
      </div>
    )
  }

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="font-headline font-extrabold text-xl text-on-surface">
            {tours.length} chuyến đi đã dẫn
          </h3>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Khách công khai cảm xúc và đánh giá sau mỗi chuyến đi.
          </p>
        </div>
        <select
          defaultValue="recent"
          className="bg-surface-container-lowest border border-outline-variant/30 rounded-full px-3 py-1.5 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/40 outline-none"
        >
          <option value="recent">Mới nhất</option>
          <option value="rating">Đánh giá cao</option>
          <option value="long">Tour dài ngày</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {tours.map((t) => (
          <TourHistoryCard key={t.id} tour={t} />
        ))}
      </div>
    </section>
  )
}
