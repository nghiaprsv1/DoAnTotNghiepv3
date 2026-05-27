import { Icon } from '@components/ui/Icon'
import { Badge } from '@components/ui/Badge'
import { GuideCard, PostCard } from '@components/features'
import { mockGuides, mockPosts } from '@constants/mockData'

const HERO_IMG =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80'

const stats = [
  { value: '12k+', label: 'Experiences' },
  { value: '450+', label: 'Local Guides' },
  { value: '4.9/5', label: 'Traveler Rating' },
]

export function HomePage() {
  return (
    <div className="max-w-screen-2xl mx-auto">
      {/* Hero */}
      <section className="px-6 py-12 md:py-24">
        <div className="relative rounded-[2.5rem] overflow-hidden min-h-[600px] flex items-center">
          <div className="absolute inset-0">
            <img
              src={HERO_IMG}
              alt="Ha Long Bay"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-on-surface/60 to-transparent" />
          </div>
          <div className="relative z-10 px-8 md:px-16 max-w-3xl py-10">
            <Badge variant="glass" className="mb-6">
              Discover Vietnam
            </Badge>
            <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-white leading-tight mb-8">
              The Soul of <br />
              <span className="text-primary-container">Modern Journey.</span>
            </h1>

            {/* Search card */}
            <div className="flex flex-col md:flex-row gap-4 p-2 bg-surface-container-lowest/90 backdrop-blur-xl rounded-3xl editorial-shadow max-w-2xl">
              <div className="flex-1 flex items-center px-4 py-3 gap-3 md:border-r border-surface-container">
                <Icon name="location_on" className="text-primary" />
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    Destination
                  </span>
                  <input
                    type="text"
                    placeholder="Where to?"
                    className="bg-transparent border-none p-0 focus:ring-0 outline-none text-on-surface font-semibold placeholder:text-on-surface/40 w-full"
                  />
                </div>
              </div>
              <div className="flex-1 flex items-center px-4 py-3 gap-3">
                <Icon name="calendar_today" className="text-primary" />
                <div className="flex flex-col flex-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
                    When
                  </span>
                  <input
                    type="text"
                    placeholder="Add dates"
                    className="bg-transparent border-none p-0 focus:ring-0 outline-none text-on-surface font-semibold placeholder:text-on-surface/40 w-full"
                  />
                </div>
              </div>
              <button
                type="button"
                className="editorial-gradient text-on-primary font-headline font-bold px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                Search
              </button>
            </div>

            {/* Stats */}
            <div className="mt-12 flex gap-12 text-white">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-3xl font-headline font-bold">{s.value}</div>
                  <div className="text-xs text-white/70 font-medium uppercase tracking-widest mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Guides */}
      <section className="px-6 py-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-4">
          <div>
            <h2 className="text-4xl font-headline font-extrabold tracking-tight text-on-surface">
              Featured Guides
            </h2>
            <p className="text-on-surface-variant mt-2 font-medium">
              Hướng dẫn viên tiêu biểu — Meet the locals who know every secret corner of Vietnam.
            </p>
          </div>
          <div className="flex gap-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {mockGuides.map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      </section>

      {/* Live from community */}
      <section className="bg-surface-container-low py-20 px-6 rounded-[3rem]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-16 text-center">
            <h2 className="text-4xl font-headline font-extrabold text-on-surface">
              Live from the Community
            </h2>
            <p className="text-on-surface-variant max-w-xl mt-4">
              Discover hidden gems and authentic stories shared by travelers across the country.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {mockPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
