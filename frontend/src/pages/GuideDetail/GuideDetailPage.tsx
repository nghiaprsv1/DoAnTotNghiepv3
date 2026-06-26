import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { ReviewModal, type ReviewTarget } from '@components/features/ReviewModal'
import { useGuide } from '@hooks/useGuides'
import { reviewService } from '@services/reviewService'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'
import { BookingPanel } from './components/BookingPanel'
import { Rating } from './components/Rating'
import { AboutTab } from './tabs/AboutTab'
import { ToursTab } from './tabs/ToursTab'
import { ReviewsTab } from './tabs/ReviewsTab'
import type { GuideReview, GuideTourHistory } from '@types/guideDashboard'

const TABS = [
  { key: 'about', label: 'Giới thiệu', icon: 'info' },
  { key: 'tours', label: 'Lịch sử tour', icon: 'history' },
  { key: 'reviews', label: 'Đánh giá', icon: 'reviews' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function GuideDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: guide, isLoading } = useGuide(id)
  const [tab, setTab] = useState<TabKey>('about')
  const [reviewOpen, setReviewOpen] = useState(false)
  const queryClient = useQueryClient()

  // Reviews fetched from /api/reviews?targetType=guide
  const { data: reviewsRaw } = useQuery({
    queryKey: ['reviews', 'guide', id],
    queryFn: () => reviewService.list('guide', id as string),
    enabled: Boolean(id),
  })

  // Adapt BE review shape → FE GuideReview shape used by RatingBreakdown / ReviewCard
  const reviews = useMemo<GuideReview[]>(
    () =>
      (reviewsRaw ?? []).map((r) => ({
        id: r.id,
        authorId: r.author.id,
        authorName: r.author.name,
        authorAvatar: r.author.avatar ?? '',
        rating: r.rating,
        date: new Date(r.createdAt).toLocaleDateString('vi-VN'),
        content: r.comment ?? '',
        helpfulCount: r.helpfulCount,
      })),
    [reviewsRaw]
  )

  // Tour history endpoint not implemented yet on the backend.
  const tours: GuideTourHistory[] = []

  if (isLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 py-16">
        <LoadingState label="Đang tải hồ sơ hướng dẫn viên..." />
      </div>
    )
  }

  if (!guide) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 py-16">
        <EmptyState
          icon="person_off"
          title="Không tìm thấy hướng dẫn viên"
          description="Hồ sơ này có thể đã bị ẩn hoặc đường dẫn không đúng."
          action={{ label: 'Quay lại danh sách', to: ROUTES.GUIDES }}
        />
      </div>
    )
  }

  return (
    <div className="flex-grow">
      {/* Hero — gradient banner (no cover photo) */}
      <section className="relative h-[360px] md:h-[420px] w-full overflow-hidden editorial-gradient">
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-on-surface/20 to-transparent" />
        <div className="absolute top-6 left-6">
          <Link
            to={ROUTES.GUIDES}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur text-white text-sm font-bold border border-white/30 hover:bg-white/30 transition"
          >
            <Icon name="arrow_back" size={16} />
            Danh sách HDV
          </Link>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 -mt-24 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main */}
        <div className="lg:col-span-8 space-y-8">
          {/* Profile header */}
          <div className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end gap-5">
              <Avatar
                src={guide.avatar}
                alt={guide.name}
                size="2xl"
                ring
                className="border-4 border-surface-container-lowest -mt-20 md:-mt-24"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline text-on-surface">
                    {guide.name}
                  </h1>
                  {guide.verified && (
                    <Icon name="verified" className="text-primary fill text-2xl" />
                  )}
                </div>
                <p className="text-on-surface-variant flex items-center gap-1 mt-1">
                  <Icon name="location_on" size={16} />
                  {guide.region}
                </p>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-sm">
                    <Rating rating={guide.rating} size={16} />
                    <span className="font-bold text-on-surface ml-1">
                      {guide.rating.toFixed(2)}
                    </span>
                    <span className="text-on-surface-variant">
                      ({guide.reviewCount} đánh giá)
                    </span>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick stats */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Stat icon="luggage" value={`${guide.toursCompleted ?? 0}+`} label="tours đã dẫn" />
              <Stat
                icon="schedule"
                value={`${guide.yearsExperience ?? 0} năm`}
                label="kinh nghiệm"
              />
              <Stat
                icon="translate"
                value={`${guide.languages?.length ?? 0}`}
                label="ngôn ngữ"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-1 flex">
            {TABS.map((t) => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-headline font-bold transition',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  )}
                >
                  <Icon name={t.icon} size={18} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          {tab === 'about' && <AboutTab guide={guide} />}
          {tab === 'tours' && <ToursTab tours={tours} />}
          {tab === 'reviews' && (
            <ReviewsTab
              reviewsSummary={reviews}
              averageRating={guide.rating}
              guideId={guide.id}
              onWriteReview={() => setReviewOpen(true)}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-4">
          <div className="lg:pt-20">
            <BookingPanel guide={guide} guideUserId={guide.userId} />
          </div>
        </aside>
      </div>

      <ReviewModal
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        target={
          {
            kind: 'guide',
            name: guide.name,
            image: guide.avatar,
            targetId: guide.id,
          } as ReviewTarget
        }
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['reviews', 'guide', id] })
          // Re-fetch guide so the average rating + review count update.
          queryClient.invalidateQueries({ queryKey: ['guide', id] })
        }}
      />
    </div>
  )
}

function Stat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="bg-surface-container-low rounded-2xl py-3 px-3 text-center">
      <Icon name={icon} className="text-primary" size={18} />
      <p className="font-headline font-extrabold text-on-surface text-base mt-1 leading-tight truncate">
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant truncate">
        {label}
      </p>
    </div>
  )
}
