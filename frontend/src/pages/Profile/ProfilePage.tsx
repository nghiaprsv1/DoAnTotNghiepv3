import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { TravelPreferencesView } from '@components/common/TravelPreferencesView'
import { ROUTES } from '@constants/routes'
import { useCurrentUserStore } from '@store/currentUserStore'
import { useAuthStore } from '@store/authStore'
import { useUserProfile } from '@hooks/useUserProfile'
import { useMyCreatedTrips, useMyJoinedTrips } from '@hooks/useTrips'
import { useSavedPosts, useSavedTrips, useSavedGuides } from '@hooks/useSaved'
import { guideDetailPath, userProfilePath } from '@constants/routes'
import { computeTripStatus } from '@utils/tripStatus'
import type { Post } from '@types/post'
import type { Trip, HireableGuide } from '@types/trip'

const tabs = ['Chuyến đi của tôi', 'Đã lưu', 'Đánh giá']

export function ProfilePage() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUserId = useCurrentUserStore((s) => s.id)
  const { data: profile, isLoading } = useUserProfile(currentUserId ?? undefined)
  const { data: myCreated } = useMyCreatedTrips()
  const { data: myJoined } = useMyJoinedTrips()
  const [activeTab, setActiveTab] = useState(tabs[0])

  // Saved bookmarks — only fetch once the user opens the "Đã lưu" tab.
  const savedActive = activeTab === tabs[1]
  const { data: savedPosts = [] } = useSavedPosts(savedActive)
  const { data: savedTrips = [] } = useSavedTrips(savedActive)
  const { data: savedGuides = [] } = useSavedGuides(savedActive)

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (isLoading || !profile) {
    return (
      <div className="max-w-5xl mx-auto container-page py-10 md:py-16">
        <LoadingState label="Đang tải hồ sơ..." />
      </div>
    )
  }

  // The same trip can appear in both myCreated (you authored it) and
  // myJoined (you're a LEADER member of it). Dedupe by trip.id and remember
  // who made which copy so the "Bạn tạo" badge still shows.
  const createdIds = new Set((myCreated ?? []).map((t) => t.id))
  const joinedOnly = (myJoined ?? []).filter((t) => !createdIds.has(t.id))
  const allTrips = [
    ...(myCreated ?? []).map((t) => ({ ...t, _isCreator: true })),
    ...joinedOnly.map((t) => ({ ...t, _isCreator: false })),
  ]
  // Split "Chuyến đi của tôi" thành 3 nhóm theo trạng thái suy ra từ ngày:
  // đang tham gia (sắp diễn ra + đang diễn ra), đã hoàn thành, và đã huỷ.
  const ongoingTrips = allTrips.filter((t) => {
    const s = computeTripStatus(t)
    return s === 'upcoming' || s === 'ongoing'
  })
  const completedTrips = allTrips.filter((t) => computeTripStatus(t) === 'completed')
  const cancelledTrips = allTrips.filter((t) => computeTripStatus(t) === 'cancelled')
  // Stats: count only joined trips that aren't ones you created so the
  // sidebar doesn't double-count "Đã tham gia" + "Đã tạo".
  const stats = [
    {
      label: 'Đã tham gia',
      value: joinedOnly.length,
    },
    { label: 'Đã tạo', value: myCreated?.length ?? 0 },
    { label: 'Người theo dõi', value: profile.followersCount },
    { label: 'Đang theo dõi', value: profile.followingCount },
  ]

  return (
    <div>
      {/* Cover + basic info */}
      <section className="relative">
        <div className="h-40 xs:h-52 md:h-80 w-full overflow-hidden bg-surface-container">
          {profile.cover && (
            <img src={profile.cover} alt="Cover" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="max-w-5xl mx-auto container-page -mt-12 xs:-mt-16 md:-mt-24 relative z-10 flex flex-col md:flex-row md:items-end gap-4 md:gap-6">
          <div className="relative group">
            <div className="w-24 h-24 xs:w-32 xs:h-32 md:w-48 md:h-48 rounded-full border-4 md:border-[6px] border-surface bg-surface-container overflow-hidden shadow-2xl flex items-center justify-center">
              {profile.avatar ? (
                <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <Icon name="person" className="text-5xl text-on-surface-variant" />
              )}
            </div>
          </div>

          <div className="flex-1 pb-2 md:pb-4 min-w-0">
            <h1 className="text-2xl md:text-4xl font-extrabold text-on-surface font-headline tracking-tight break-words">
              {profile.name}
            </h1>
            {profile.bio && (
              <p className="text-sm md:text-base text-on-surface-variant font-medium mt-1">{profile.bio}</p>
            )}
            <div className="flex flex-wrap gap-3 md:gap-4 mt-3 md:mt-4 text-xs md:text-sm text-on-surface-variant">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <Icon name="location_on" size={16} />
                  {profile.location}
                </span>
              )}
              {profile.joinedAt && (
                <span className="flex items-center gap-1">
                  <Icon name="calendar_today" size={16} />
                  Tham gia {profile.joinedAt}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pb-2 md:pb-4">
            <Link to={ROUTES.PROFILE_EDIT} className="w-full md:w-auto">
              <Button variant="secondary" className="w-full md:w-auto">
                <Icon name="edit" size={18} />
                Chỉnh sửa
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-5xl mx-auto container-page py-6 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl shadow-sm flex flex-col items-center"
            >
              <span className="text-2xl md:text-3xl font-extrabold text-primary font-headline">{s.value}</span>
              <span className="text-[10px] md:text-xs uppercase tracking-widest text-on-surface-variant mt-1 md:mt-2 text-center">
                {s.label}
              </span>
            </div>
          ))}
        </div>
        {/* Travel preferences chips — only renders if user filled any */}
        <div className="mt-6 md:mt-8">
          <TravelPreferencesView preferences={profile.preferences} />
        </div>
      </section>

      {/* Tabs + gallery */}
      <section className="max-w-5xl mx-auto container-page pb-12 md:pb-16">
        <div className="flex border-b border-surface-container-high mb-6 md:mb-8 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`shrink-0 px-4 md:px-8 py-3 md:py-4 font-headline font-semibold text-xs md:text-sm transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary font-bold'
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === tabs[0] && allTrips.length === 0 && (
          <EmptyState
            icon="flight_takeoff"
            title="Bạn chưa tham gia chuyến đi nào"
            description="Khám phá các trip công khai hoặc tạo chuyến đi của riêng bạn."
            action={{ label: 'Khám phá chuyến đi', to: ROUTES.TRIPS }}
          />
        )}
        {activeTab === tabs[0] && allTrips.length > 0 && (
          <div className="space-y-10">
            <TripSection
              title="Đang tham gia"
              icon="flight_takeoff"
              trips={ongoingTrips}
              emptyHint="Không có chuyến đi nào sắp tới hoặc đang diễn ra."
            />
            <TripSection
              title="Đã hoàn thành"
              icon="task_alt"
              trips={completedTrips}
              emptyHint="Bạn chưa có chuyến đi nào hoàn thành."
            />
            {cancelledTrips.length > 0 && (
              <TripSection
                title="Đã huỷ"
                icon="cancel"
                trips={cancelledTrips}
                emptyHint="Không có chuyến đi nào bị huỷ."
              />
            )}
          </div>
        )}
        {/* Tab "Đã lưu" — bookmarked posts, trips, guides */}
        {activeTab === tabs[1] && (
          <SavedTabContent
            posts={savedPosts}
            trips={savedTrips}
            guides={savedGuides}
          />
        )}

        {activeTab === tabs[2] && (
          <EmptyState
            icon="construction"
            title="Tính năng đang phát triển"
            description="Chúng tôi sẽ sớm bổ sung mục này."
          />
        )}
      </section>
    </div>
  )
}

/**
 * One titled grid of trips inside the "Chuyến đi của tôi" tab. Renders a small
 * status-aware section so ongoing and completed trips are visually separated.
 */
function TripSection({
  title,
  icon,
  trips,
  emptyHint,
}: {
  title: string
  icon: string
  trips: Array<Trip & { _isCreator?: boolean }>
  emptyHint: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Icon name={icon} className="text-primary" size={20} />
        <h3 className="font-headline font-bold text-lg text-on-surface">
          {title}
        </h3>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">
          {trips.length}
        </span>
      </div>
      {trips.length === 0 ? (
        <p className="text-sm text-on-surface-variant italic pb-2">{emptyHint}</p>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              to={`/trips/${trip.id}`}
              className="group relative overflow-hidden rounded-2xl md:rounded-3xl bg-surface-container-low aspect-square block"
            >
              <img
                src={trip.coverImage}
                alt={trip.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              {trip._isCreator && (
                <Badge variant="secondary" className="absolute top-3 left-3">
                  Bạn tạo
                </Badge>
              )}
              <div className="absolute bottom-0 left-0 p-4 md:p-6 right-0">
                <h3 className="text-white text-base md:text-2xl font-bold font-headline mb-0.5 md:mb-1 line-clamp-2">
                  {trip.title}
                </h3>
                <p className="text-white/70 text-[10px] md:text-xs">
                  {trip.durationDays} ngày · {trip.destination}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

/** Profile "Đã lưu" tab — three sub-sections for posts / trips / guides. */
function SavedTabContent({
  posts,
  trips,
  guides,
}: {
  posts: Post[]
  trips: Trip[]
  guides: HireableGuide[]
}) {
  const isEmpty = posts.length === 0 && trips.length === 0 && guides.length === 0
  if (isEmpty) {
    return (
      <EmptyState
        icon="bookmark"
        title="Bạn chưa lưu mục nào"
        description="Nhấn biểu tượng trái tim trên bài viết, chuyến đi hoặc hướng dẫn viên để lưu lại đây."
      />
    )
  }
  return (
    <div className="space-y-10">
      {trips.length > 0 && (
        <div>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">
            Chuyến đi đã lưu ({trips.length})
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {trips.map((trip) => (
              <Link
                key={trip.id}
                to={`/trips/${trip.id}`}
                className="group relative overflow-hidden rounded-2xl bg-surface-container-low aspect-[4/3] block"
              >
                <img
                  src={trip.coverImage}
                  alt={trip.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="text-white font-bold font-headline line-clamp-2">{trip.title}</h4>
                  <p className="text-white/70 text-xs mt-0.5">{trip.destination}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {guides.length > 0 && (
        <div>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">
            Hướng dẫn viên đã lưu ({guides.length})
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {guides.map((g) => (
              <Link
                key={g.id}
                to={guideDetailPath(g.id)}
                className="flex items-center gap-3 bg-surface-container-lowest rounded-2xl p-4 shadow-sm hover:shadow-editorial transition"
              >
                <img
                  src={g.avatar}
                  alt={g.name}
                  className="w-14 h-14 rounded-full object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-headline font-bold text-on-surface truncate">{g.name}</p>
                  <p className="text-xs text-on-surface-variant truncate">{g.region}</p>
                  <p className="text-xs text-primary font-bold mt-0.5">
                    ⭐ {g.rating.toFixed(1)} · {g.reviewCount ?? 0} đánh giá
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {posts.length > 0 && (
        <div>
          <h3 className="font-headline font-bold text-lg text-on-surface mb-4">
            Bài viết đã lưu ({posts.length})
          </h3>
          <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {posts.map((p) => (
              <Link
                key={p.id}
                to={userProfilePath(p.authorId)}
                className="group relative overflow-hidden rounded-2xl bg-surface-container-low aspect-square block"
              >
                <img
                  src={p.image}
                  alt={p.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h4 className="text-white font-bold font-headline text-sm line-clamp-2">
                    {p.title}
                  </h4>
                  <p className="text-white/70 text-[11px] mt-0.5">{p.authorName}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
