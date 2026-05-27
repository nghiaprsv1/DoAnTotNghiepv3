import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { FilterBar, TripCard } from '@components/features'
import { mockTrips } from '@constants/mockData'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'

const filterItems = [
  { key: 'all', label: 'All Trips', icon: 'apps' },
  { key: 'beach', label: 'Beach', icon: 'beach_access' },
  { key: 'mountain', label: 'Mountain', icon: 'terrain' },
  { key: 'food', label: 'Food', icon: 'restaurant' },
  { key: 'culture', label: 'Culture', icon: 'temple_buddhist' },
  { key: 'city', label: 'City Break', icon: 'location_city' },
]

type TabKey = 'joined' | 'explore'

const tabs: { key: TabKey; label: string; sublabel: string; icon: string }[] = [
  {
    key: 'joined',
    label: 'Đang tham gia',
    sublabel: 'Hành trình của bạn',
    icon: 'flight_takeoff',
  },
  {
    key: 'explore',
    label: 'Khám phá',
    sublabel: 'Chuyến đi từ cộng đồng',
    icon: 'travel_explore',
  },
]

export function TripsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('joined')
  const [activeKey, setActiveKey] = useState('all')

  const joinedTrips = useMemo(() => mockTrips.filter((t) => t.isJoined), [])
  const exploreTrips = useMemo(() => mockTrips.filter((t) => !t.isJoined), [])

  const exploreFiltered = useMemo(
    () =>
      activeKey === 'all'
        ? exploreTrips
        : exploreTrips.filter((t) => t.category === activeKey),
    [activeKey, exploreTrips]
  )

  const counts: Record<TabKey, number> = {
    joined: joinedTrips.length,
    explore: exploreTrips.length,
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8">
      {/* Hero header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
        <div className="max-w-2xl">
          <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-3 block">
            Discover Your Next Story
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-on-surface tracking-tight leading-tight">
            Explore curated <span className="text-primary italic">trips</span> from the community
          </h1>
        </div>
        <Link to={ROUTES.TRIP_CREATE}>
          <Button size="lg">
            <Icon name="add" />
            Create Trip
          </Button>
        </Link>
      </header>

      {/* Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'group flex items-center gap-4 p-4 rounded-2xl text-left transition-all',
                isActive
                  ? 'bg-surface-container-lowest shadow-editorial-lg ring-2 ring-primary/40'
                  : 'bg-surface-container-low hover:bg-surface-container'
              )}
            >
              <span
                className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition',
                  isActive
                    ? 'editorial-gradient text-on-primary'
                    : 'bg-surface-container text-on-surface-variant group-hover:text-primary'
                )}
              >
                <Icon name={tab.icon} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'font-headline font-extrabold',
                      isActive ? 'text-on-surface' : 'text-on-surface'
                    )}
                  >
                    {tab.label}
                  </span>
                  <span
                    className={cn(
                      'text-[11px] font-bold px-2 py-0.5 rounded-full',
                      isActive
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant'
                    )}
                  >
                    {counts[tab.key]}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant mt-0.5">{tab.sublabel}</p>
              </div>
            </button>
          )
        })}
      </div>

      {activeTab === 'joined' ? (
        <JoinedSection trips={joinedTrips} />
      ) : (
        <ExploreSection
          trips={exploreFiltered}
          activeKey={activeKey}
          onChangeKey={setActiveKey}
        />
      )}
    </div>
  )
}

function JoinedSection({ trips }: { trips: typeof mockTrips }) {
  if (trips.length === 0) {
    return (
      <EmptyState
        icon="luggage"
        title="Bạn chưa tham gia chuyến đi nào"
        description="Khám phá các chuyến đi từ cộng đồng và tham gia ngay để bắt đầu hành trình của bạn."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  )
}

function ExploreSection({
  trips,
  activeKey,
  onChangeKey,
}: {
  trips: typeof mockTrips
  activeKey: string
  onChangeKey: (key: string) => void
}) {
  return (
    <>
      <section className="mb-10">
        <FilterBar items={filterItems} activeKey={activeKey} onChange={onChangeKey} />
      </section>

      {trips.length === 0 ? (
        <EmptyState
          icon="explore_off"
          title="Không có chuyến đi nào cho bộ lọc này"
          description="Thử bộ lọc khác hoặc tự tạo một chuyến đi mới."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 bg-surface-container-low rounded-3xl">
      <div className="w-16 h-16 rounded-2xl editorial-gradient text-on-primary flex items-center justify-center mb-4 shadow-editorial">
        <Icon name={icon} className="text-2xl" />
      </div>
      <h3 className="font-headline text-xl font-extrabold text-on-surface mb-1">{title}</h3>
      <p className="text-on-surface-variant max-w-md">{description}</p>
    </div>
  )
}
