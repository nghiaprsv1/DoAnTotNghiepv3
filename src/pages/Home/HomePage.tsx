import { Icon } from '@components/ui/Icon'
import { Badge } from '@components/ui/Badge'
import { GuideCard, PostCard } from '@components/features'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useGuides } from '@hooks/useGuides'
import { usePosts } from '@hooks/usePosts'
import type { Guide } from '@types/post'

const HERO_IMG =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80'

const stats = [
  { value: '12k+', label: 'Experiences' },
  { value: '450+', label: 'Local Guides' },
  { value: '4.9/5', label: 'Traveler Rating' },
]

export function HomePage() {
  const { data: guidesRaw, isLoading: guidesLoading } = useGuides()
  const { data: posts, isLoading: postsLoading } = usePosts({ feed: 'foryou' })

  // Adapt BE guide profile → simple Guide card shape (FE).
  const guides: Guide[] = (guidesRaw ?? []).slice(0, 4).map((g) => ({
    id: g.id,
    name: g.name,
    avatar: g.avatar ?? '',
    location: g.region,
    rating: g.rating,
    reviewCount: g.reviewCount,
    specialties: g.specialties,
  }))

  return (
    <div className="max-w-screen-2xl mx-auto">
      {/* Hero */}
      <section className="container-page py-6 md:py-16 lg:py-24">
        <div className="relative rounded-3xl md:rounded-[2.5rem] overflow-hidden min-h-[420px] md:min-h-[520px] lg:min-h-[600px] flex items-center">
          <div className="absolute inset-0">
            <img
              src={HERO_IMG}
              alt="Ha Long Bay"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-on-surface/70 to-on-surface/20 md:to-transparent" />
          </div>
          <div className="relative z-10 px-5 sm:px-8 md:px-16 max-w-3xl py-8 md:py-10">
            <Badge variant="glass" className="mb-4 md:mb-6">
              Discover Vietnam
            </Badge>
            <h1 className="text-3xl xs:text-4xl md:text-6xl lg:text-7xl font-headline font-extrabold text-white leading-tight mb-6 md:mb-8">
              The Soul of <br />
              <span className="text-primary-container">Modern Journey.</span>
            </h1>

            {/* Search card — stacks vertically on mobile */}
            <div className="flex flex-col md:flex-row gap-2 md:gap-4 p-2 bg-surface-container-lowest/90 backdrop-blur-xl rounded-2xl md:rounded-3xl editorial-shadow w-full md:max-w-2xl">
              <div className="flex-1 flex items-center px-3 md:px-4 py-2.5 md:py-3 gap-3 md:border-r border-surface-container">
                <Icon name="location_on" className="text-primary" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Destination
                  </span>
                  <input
                    type="text"
                    placeholder="Where to?"
                    className="bg-transparent border-none p-0 focus:ring-0 outline-none text-on-surface font-semibold placeholder:text-on-surface/40 w-full text-base"
                  />
                </div>
              </div>
              <div className="flex-1 flex items-center px-3 md:px-4 py-2.5 md:py-3 gap-3">
                <Icon name="calendar_today" className="text-primary" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    When
                  </span>
                  <input
                    type="text"
                    placeholder="Add dates"
                    className="bg-transparent border-none p-0 focus:ring-0 outline-none text-on-surface font-semibold placeholder:text-on-surface/40 w-full text-base"
                  />
                </div>
              </div>
              <button
                type="button"
                className="editorial-gradient text-on-primary font-headline font-bold px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                Search
              </button>
            </div>

            {/* Stats — 3 cols even on mobile, smaller text */}
            <div className="mt-8 md:mt-12 grid grid-cols-3 gap-4 md:flex md:gap-12 text-white">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-xl xs:text-2xl md:text-3xl font-headline font-bold">{s.value}</div>
                  <div className="text-[10px] md:text-xs text-white/70 font-medium uppercase tracking-widest mt-0.5 md:mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Guides */}
      <section className="container-page py-10 md:py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 md:mb-12 gap-3 md:gap-4">
          <div>
            <h2 className="text-2xl md:text-4xl font-headline font-extrabold tracking-tight text-on-surface">
              Featured Guides
            </h2>
            <p className="text-sm md:text-base text-on-surface-variant mt-1 md:mt-2 font-medium">
              Hướng dẫn viên tiêu biểu — Meet the locals who know every secret corner of Vietnam.
            </p>
          </div>
          <div className="hidden md:flex gap-2">
            <button
              type="button"
              className="w-12 h-12 rounded-full border border-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all"
              aria-label="Previous"
            >
              <Icon name="chevron_left" />
            </button>
            <button
              type="button"
              className="w-12 h-12 rounded-full border border-surface-container flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-on-primary transition-all"
              aria-label="Next"
            >
              <Icon name="chevron_right" />
            </button>
          </div>
        </div>
        {guidesLoading ? (
          <LoadingState count={4} />
        ) : guides.length === 0 ? (
          <EmptyState
            icon="tour"
            title="Chưa có hướng dẫn viên nào"
            description="Khi có HDV được duyệt, họ sẽ xuất hiện ở đây."
          />
        ) : (
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {guides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        )}
      </section>

      {/* Live from community */}
      <section className="bg-surface-container-low py-12 md:py-20 container-page rounded-3xl md:rounded-[3rem]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-8 md:mb-16 text-center">
            <h2 className="text-2xl md:text-4xl font-headline font-extrabold text-on-surface">
              Live from the Community
            </h2>
            <p className="text-sm md:text-base text-on-surface-variant max-w-xl mt-2 md:mt-4">
              Discover hidden gems and authentic stories shared by travelers across the country.
            </p>
          </div>
          {postsLoading ? (
            <LoadingState count={3} />
          ) : !posts || posts.length === 0 ? (
            <EmptyState
              icon="auto_stories"
              title="Chưa có bài viết"
              description="Cộng đồng đang chuẩn bị câu chuyện đầu tiên — quay lại sau nhé."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
