import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { FilterBar, TripCard } from '@components/features'
import { useMyCreatedTrips, useMyJoinedTrips, useTrips } from '@hooks/useTrips'
import { useAuthStore } from '@store/authStore'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'
import { computeTripStatus } from '@utils/tripStatus'
import type { Trip } from '@types/trip'
import { RecommendedTripsSection } from './components/RecommendedTripsSection'

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
  // Đọc bộ lọc khởi tạo từ URL (đến từ ô tìm kiếm ở trang Home).
  const [searchParams] = useSearchParams()
  const initialDest = searchParams.get('destination') ?? ''
  const initialDate = searchParams.get('date') ?? ''

  const [activeTab, setActiveTab] = useState<TabKey>(
    initialDest || initialDate ? 'explore' : 'joined',
  )
  const [activeKey, setActiveKey] = useState('all')
  const [searchInput, setSearchInput] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  // Bộ lọc theo điểm bắt đầu (origin) và điểm kết thúc (destination).
  const [originInput, setOriginInput] = useState('')
  const [originTerm, setOriginTerm] = useState('')
  const [destInput, setDestInput] = useState(initialDest)
  const [destTerm, setDestTerm] = useState(initialDest)
  // Bộ lọc ngày khởi hành — tìm chuyến diễn ra (đang chạy) vào đúng ngày này.
  const [dateInput, setDateInput] = useState(initialDate)
  const [dateTerm, setDateTerm] = useState(initialDate)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  const { data: trips, isLoading, isError, refetch } = useTrips({ search: searchTerm || undefined })
  const { data: joinedFromApi } = useMyJoinedTrips(isAuthenticated)
  const { data: createdFromApi } = useMyCreatedTrips(isAuthenticated)

  const hasFilters = Boolean(searchTerm || originTerm || destTerm || dateTerm)

  const clearFilters = () => {
    setSearchInput('')
    setSearchTerm('')
    setOriginInput('')
    setOriginTerm('')
    setDestInput('')
    setDestTerm('')
    setDateInput('')
    setDateTerm('')
  }

  // Bộ lọc client-side thống nhất — áp cho CẢ HAI tab nên search hoạt động đồng
  // nhất ở "Đang tham gia" lẫn "Khám phá":
  // - searchTerm: khớp tên / điểm đến / mô tả / điểm bắt đầu.
  // - originTerm: khớp tên điểm bắt đầu (originName).
  // - destTerm: khớp điểm đến (destination).
  // - dateTerm: chuyến diễn ra vào ngày này (startDate <= date <= endDate) —
  //   kết hợp (AND) với điểm đến để tìm "đi <nơi> vào <ngày>".
  const matchFilters = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    const o = originTerm.trim().toLowerCase()
    const d = destTerm.trim().toLowerCase()
    const day = dateTerm.trim()
    return (t: Trip) => {
      if (q) {
        const hay = `${t.title} ${t.destination} ${t.description} ${t.originName ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (o && !(t.originName ?? '').toLowerCase().includes(o)) return false
      if (d && !t.destination.toLowerCase().includes(d)) return false
      if (day) {
        // So sánh theo chuỗi yyyy-mm-dd (Trip.startDate/endDate là `date`).
        const start = (t.startDate ?? '').slice(0, 10)
        const end = (t.endDate ?? '').slice(0, 10)
        if (!start || day < start || (end && day > end)) return false
      }
      return true
    }
  }, [searchTerm, originTerm, destTerm, dateTerm])

  // Trips list only surfaces trips that are still relevant to join: upcoming or
  // currently ongoing. Completed / cancelled trips are hidden here — users can
  // still see those in their profile history.
  const isActiveTrip = (t: Trip) => {
    const s = computeTripStatus(t)
    return s === 'upcoming' || s === 'ongoing'
  }
  const allTrips = (trips ?? []).filter(isActiveTrip)

  // Anything I created or joined goes into the "joined" tab; dedupe by id.
  // Same active-only filter so finished trips drop out of the list.
  const joinedAll = useMemo<Trip[]>(() => {
    const merged = [...(createdFromApi ?? []), ...(joinedFromApi ?? [])]
    const seen = new Map<string, Trip>()
    for (const t of merged) {
      if (isActiveTrip(t)) seen.set(t.id, t)
    }
    return Array.from(seen.values())
  }, [createdFromApi, joinedFromApi])

  // Apply search/origin/destination filters to the joined list.
  const joinedTrips = useMemo(
    () => joinedAll.filter(matchFilters),
    [joinedAll, matchFilters],
  )

  const joinedIds = useMemo(() => new Set(joinedAll.map((t) => t.id)), [joinedAll])
  // Khám phá chỉ hiện chuyến người dùng CHƯA tham gia. Ưu tiên cờ isJoined/
  // isOwner do backend gắn theo viewer (luôn đúng kể cả khi cache joined/created
  // chưa refetch); joinedIds là lớp dự phòng từ 2 query "của tôi".
  const exploreTrips = useMemo(
    () =>
      allTrips
        .filter((t) => !t.isJoined && !t.isOwner && !joinedIds.has(t.id))
        .filter(matchFilters),
    [allTrips, joinedIds, matchFilters],
  )

  const exploreFiltered = useMemo(
    () =>
      activeKey === 'all'
        ? exploreTrips
        : exploreTrips.filter((t) => t.category === activeKey),
    [activeKey, exploreTrips]
  )

  const counts: Record<TabKey, number> = {
    joined: joinedTrips.length,
    explore: exploreFiltered.length,
  }

  return (
    <div className="max-w-screen-2xl mx-auto container-page py-6 md:py-8">
      {/* Hero header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between mb-6 md:mb-10 gap-4 md:gap-6">
        <div className="max-w-2xl">
          <span className="text-[10px] md:text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-2 md:mb-3 block">
            Discover Your Next Story
          </span>
          <h1 className="text-2xl xs:text-3xl md:text-5xl font-extrabold font-headline text-on-surface tracking-tight leading-tight">
            Explore curated <span className="text-primary italic">trips</span> from the community
          </h1>
        </div>
        <Link to={ROUTES.TRIP_CREATE} className="self-start md:self-auto">
          <Button size="lg">
            <Icon name="add" />
            Create Trip
          </Button>
        </Link>
      </header>

      {/* Tìm kiếm: từ khoá chung + điểm bắt đầu + điểm kết thúc */}
      <form
        className="mb-6 md:mb-8 bg-surface-container-lowest rounded-2xl shadow-editorial px-3 md:px-4 py-3 space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          setSearchTerm(searchInput.trim())
          setOriginTerm(originInput.trim())
          setDestTerm(destInput.trim())
          setDateTerm(dateInput.trim())
        }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <Icon name="search" className="text-on-surface-variant" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên chuyến, điểm đến, mô tả…"
            className="flex-1 bg-transparent outline-none text-base placeholder:text-on-surface-variant/60 min-w-0"
          />
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              aria-label="Xoá tìm kiếm"
              className="w-8 h-8 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center shrink-0"
            >
              <Icon name="close" size={16} />
            </button>
          )}
          <Button type="submit" size="sm" rounded="full">
            Tìm
          </Button>
        </div>
        {/* Lọc theo điểm bắt đầu & điểm kết thúc & ngày khởi hành */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 md:gap-3 pt-1 border-t border-outline-variant/15">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low">
            <Icon name="trip_origin" size={16} className="text-primary shrink-0" />
            <input
              value={originInput}
              onChange={(e) => setOriginInput(e.target.value)}
              placeholder="Điểm bắt đầu (VD: Hà Nội)"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-on-surface-variant/60 min-w-0"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low">
            <Icon name="location_on" size={16} className="text-primary shrink-0" />
            <input
              value={destInput}
              onChange={(e) => setDestInput(e.target.value)}
              placeholder="Điểm kết thúc (VD: Sa Pa)"
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-on-surface-variant/60 min-w-0"
            />
          </div>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low">
            <Icon name="calendar_today" size={16} className="text-primary shrink-0" />
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              aria-label="Ngày khởi hành"
              className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60 min-w-0"
            />
          </div>
        </div>
      </form>

      {/* Tabs */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 md:gap-3 mb-6 md:mb-10">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'group flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl text-left transition-all',
                isActive
                  ? 'bg-surface-container-lowest shadow-editorial-lg ring-2 ring-primary/40'
                  : 'bg-surface-container-low hover:bg-surface-container'
              )}
            >
              <span
                className={cn(
                  'w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition',
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

      {isLoading ? (
        <LoadingGrid />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : activeTab === 'joined' ? (
        <JoinedSection trips={joinedTrips} hasFilters={hasFilters} />
      ) : (
        <ExploreSection
          trips={exploreFiltered}
          activeKey={activeKey}
          onChangeKey={setActiveKey}
          hasFilters={hasFilters}
        />
      )}
    </div>
  )
}

function JoinedSection({ trips, hasFilters }: { trips: Trip[]; hasFilters: boolean }) {
  if (trips.length === 0) {
    return hasFilters ? (
      <EmptyState
        icon="search_off"
        title="Không tìm thấy chuyến đi phù hợp"
        description="Không có chuyến đi nào bạn tham gia khớp với từ khoá hoặc điểm bắt đầu/kết thúc. Thử bỏ bớt bộ lọc."
      />
    ) : (
      <EmptyState
        icon="luggage"
        title="Bạn chưa tham gia chuyến đi nào"
        description="Khám phá các chuyến đi từ cộng đồng và tham gia ngay để bắt đầu hành trình của bạn."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
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
  hasFilters,
}: {
  trips: Trip[]
  activeKey: string
  onChangeKey: (key: string) => void
  hasFilters: boolean
}) {
  return (
    <>
      {/* Gợi ý cá nhân hoá chỉ hiện khi KHÔNG tìm kiếm — nếu không nó sẽ chèn
          các chuyến không khớp bộ lọc (vd tìm "Đà Lạt" vẫn ra gợi ý Hà Nội). */}
      {!hasFilters && <RecommendedTripsSection />}

      <section className="mb-6 md:mb-10">
        <FilterBar items={filterItems} activeKey={activeKey} onChange={onChangeKey} />
      </section>

      {trips.length === 0 ? (
        <EmptyState
          icon="explore_off"
          title="Không có chuyến đi nào cho bộ lọc này"
          description="Thử bộ lọc khác hoặc tự tạo một chuyến đi mới."
        />
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
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
    <div className="flex flex-col items-center text-center py-10 md:py-16 px-4 md:px-6 bg-surface-container-low rounded-3xl">
      <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl editorial-gradient text-on-primary flex items-center justify-center mb-4 shadow-editorial">
        <Icon name={icon} className="text-2xl" />
      </div>
      <h3 className="font-headline text-lg md:text-xl font-extrabold text-on-surface mb-1">{title}</h3>
      <p className="text-sm md:text-base text-on-surface-variant max-w-md">{description}</p>
    </div>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8" aria-busy>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-72 md:h-80 rounded-xl bg-surface-container-low animate-pulse"
        />
      ))}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 bg-surface-container-low rounded-3xl">
      <div className="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mb-4">
        <Icon name="error" className="text-2xl" />
      </div>
      <h3 className="font-headline text-xl font-extrabold text-on-surface mb-1">
        Không tải được dữ liệu
      </h3>
      <p className="text-on-surface-variant max-w-md mb-4">
        Có thể backend chưa chạy. Bạn có thể chuyển sang chế độ Mock trong menu người dùng.
      </p>
      <Button onClick={onRetry} variant="secondary" size="md">
        <Icon name="refresh" />
        Thử lại
      </Button>
    </div>
  )
}

