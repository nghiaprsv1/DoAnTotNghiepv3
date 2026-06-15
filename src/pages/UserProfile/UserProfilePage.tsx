import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { TravelPreferencesView } from '@components/common/TravelPreferencesView'
import { TripCard } from '@components/features'
import { FeedPostCard } from '@pages/Social/components/FeedPostCard'
import { useUserProfile } from '@hooks/useUserProfile'
import { useUserPosts } from '@hooks/usePosts'
import { useUserTrips } from '@hooks/useTrips'
import { useOpenDirectChat } from '@hooks/useMessages'
import { useCurrentUserStore } from '@store/currentUserStore'
import { userService } from '@services/userService'
import { postService } from '@services/postService'
import {
  ROUTES,
  userFollowersPath,
  userFollowingPath,
} from '@constants/routes'
import { cn } from '@utils/cn'
import type { PublicProfile } from '@types/profile'

const TABS = [
  { key: 'posts', label: 'Bài viết', icon: 'photo_library' },
  { key: 'trips', label: 'Chuyến đi', icon: 'flight_takeoff' },
  { key: 'about', label: 'Giới thiệu', icon: 'info' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const currentUserId = useCurrentUserStore((s) => s.id)
  const { data, isLoading, refetch } = useUserProfile(id)
  const openDirectChat = useOpenDirectChat()
  const [tab, setTab] = useState<TabKey>('posts')

  // Local copy for optimistic follow toggle.
  const [optimisticProfile, setOptimisticProfile] = useState<PublicProfile | null>(null)
  const profile = optimisticProfile ?? data
  const isMe = !!profile && profile.id === currentUserId

  const toggleFollow = async () => {
    if (!profile) return
    const next: PublicProfile = {
      ...profile,
      isFollowing: !profile.isFollowing,
      followersCount: profile.isFollowing
        ? profile.followersCount - 1
        : profile.followersCount + 1,
    }
    setOptimisticProfile(next)
    try {
      if (profile.isFollowing) {
        await userService.unfollow(profile.id)
      } else {
        await userService.follow(profile.id)
      }
      await refetch()
      setOptimisticProfile(null)
    } catch {
      // Roll back on failure.
      setOptimisticProfile(profile)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 py-16">
        <LoadingState label="Đang tải hồ sơ..." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 py-16">
        <EmptyState
          icon="person_off"
          title="Không tìm thấy người dùng"
          description="Hồ sơ này có thể đã bị ẩn hoặc đường dẫn không đúng."
          action={{ label: 'Về trang chủ', to: ROUTES.HOME }}
        />
      </div>
    )
  }

  return (
    <div className="flex-grow">
      {/* Cover */}
      <section className="relative h-56 md:h-72 w-full overflow-hidden bg-surface-container">
        {profile.cover && (
          <img
            src={profile.cover}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-on-surface/65 via-transparent to-transparent" />
      </section>

      <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-20 relative z-10">
        {/* Profile header */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-editorial-lg p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-end gap-5">
            <Avatar
              src={profile.avatar}
              alt={profile.name}
              size="2xl"
              ring
              className="border-4 border-surface-container-lowest -mt-20 md:-mt-24"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight font-headline text-on-surface">
                  {profile.name}
                </h1>
                {profile.verified && (
                  <Icon name="verified" className="text-primary fill text-xl" />
                )}
                {profile.role === 'guide' && (
                  <span className="px-2 py-0.5 rounded-full editorial-gradient text-on-primary text-[10px] font-bold uppercase tracking-wider">
                    Hướng dẫn viên
                  </span>
                )}
                {profile.followsYou && (
                  <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
                    Theo dõi bạn
                  </span>
                )}
              </div>
              <p className="text-on-surface-variant text-sm">{profile.handle}</p>
              {profile.location && (
                <p className="text-sm text-on-surface-variant flex items-center gap-1 mt-1">
                  <Icon name="location_on" size={14} />
                  {profile.location}
                  {profile.joinedAt && (
                    <>
                      <span className="text-on-surface-variant/40 mx-1">·</span>
                      <span>{profile.joinedAt}</span>
                    </>
                  )}
                </p>
              )}
            </div>

            {!isMe ? (
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant={profile.isFollowing ? 'secondary' : 'primary'}
                  size="md"
                  rounded="full"
                  onClick={toggleFollow}
                >
                  <Icon name={profile.isFollowing ? 'how_to_reg' : 'person_add'} />
                  {profile.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  rounded="full"
                  onClick={() => openDirectChat(profile.id)}
                >
                  <Icon name="chat" />
                  Nhắn tin
                </Button>
              </div>
            ) : (
              <Link to={ROUTES.PROFILE_EDIT}>
                <Button variant="secondary" size="md" rounded="full">
                  <Icon name="edit" />
                  Chỉnh sửa hồ sơ
                </Button>
              </Link>
            )}
          </div>

          {profile.bio && (
            <p className="mt-5 text-on-surface/85 leading-relaxed max-w-2xl">{profile.bio}</p>
          )}

          {/* Stats */}
          <div className="mt-6 grid grid-cols-4 gap-2">
            <Stat value={profile.postsCount} label="Bài viết" />
            <Link
              to={userFollowersPath(profile.id)}
              className="bg-surface-container-low rounded-2xl py-3 px-2 text-center hover:bg-surface-container transition group"
            >
              <p className="font-headline font-extrabold text-2xl text-on-surface group-hover:text-primary">
                {profile.followersCount.toLocaleString('vi-VN')}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                Followers
              </p>
            </Link>
            <Link
              to={userFollowingPath(profile.id)}
              className="bg-surface-container-low rounded-2xl py-3 px-2 text-center hover:bg-surface-container transition group"
            >
              <p className="font-headline font-extrabold text-2xl text-on-surface group-hover:text-primary">
                {profile.followingCount.toLocaleString('vi-VN')}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">
                Following
              </p>
            </Link>
            <Stat value={profile.tripsCount ?? 0} label="Chuyến đi" />
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-1 flex mt-6">
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
        <div className="mt-6 mb-12">
          {tab === 'posts' && (
            <UserPostsList userId={profile.id} ownerName={profile.name} currentUserId={currentUserId} />
          )}
          {tab === 'trips' && (
            <UserTripsList userId={profile.id} ownerName={profile.name} />
          )}
          {tab === 'about' && (
            <div className="space-y-6">
              <div className="bg-surface-container-low rounded-3xl p-8">
                <h3 className="font-headline font-extrabold text-on-surface text-lg mb-3">
                  Giới thiệu
                </h3>
                {profile.bio ? (
                  <p className="text-on-surface/85 leading-relaxed">{profile.bio}</p>
                ) : (
                  <p className="text-on-surface-variant text-sm">
                    {profile.name} chưa cập nhật giới thiệu.
                  </p>
                )}
              </div>
              <TravelPreferencesView preferences={profile.preferences} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function UserPostsList({
  userId,
  ownerName,
  currentUserId,
}: {
  userId: string
  ownerName: string
  currentUserId: string | null
}) {
  const { data, isLoading } = useUserPosts(userId)
  if (isLoading) return <LoadingState count={2} />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="auto_stories"
        title={`${ownerName} chưa có bài viết`}
        description="Khi có bài viết mới, chúng sẽ xuất hiện ở đây."
      />
    )
  }
  return (
    <div className="space-y-6">
      {data.map((p) => (
        <FeedPostCard
          key={p.id}
          post={p}
          currentUserId={currentUserId ?? 'guest'}
          onChange={() => undefined}
          onDelete={() => undefined}
          onToggleLike={async (id) => {
            await postService.toggleLike(id)
          }}
          onAddComment={async (id, content, parentId) => {
            await postService.addComment(id, content, parentId)
          }}
        />
      ))}
    </div>
  )
}

function UserTripsList({ userId, ownerName }: { userId: string; ownerName: string }) {
  const { data, isLoading } = useUserTrips(userId)
  if (isLoading) return <LoadingState count={2} />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="flight_takeoff"
        title={`${ownerName} chưa tạo chuyến đi nào`}
        description="Khi họ tạo chuyến đi mới, chúng sẽ xuất hiện ở đây."
      />
    )
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {data.map((t) => (
        <TripCard key={t.id} trip={t} />
      ))}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-surface-container-low rounded-2xl py-3 px-2 text-center">
      <p className="font-headline font-extrabold text-2xl text-on-surface">
        {value.toLocaleString('vi-VN')}
      </p>
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  )
}
