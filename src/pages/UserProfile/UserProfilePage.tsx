import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { mockPublicProfiles } from '@constants/mockProfiles'
import {
  ROUTES,
  messageThreadPath,
  userFollowersPath,
  userFollowingPath,
} from '@constants/routes'
import { cn } from '@utils/cn'

const TABS = [
  { key: 'posts', label: 'Bài viết', icon: 'photo_library' },
  { key: 'trips', label: 'Chuyến đi', icon: 'flight_takeoff' },
  { key: 'about', label: 'Giới thiệu', icon: 'info' },
] as const
type TabKey = (typeof TABS)[number]['key']

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const baseProfile = (id && mockPublicProfiles[id]) || mockPublicProfiles.u1
  const [profile, setProfile] = useState(baseProfile)
  const [tab, setTab] = useState<TabKey>('posts')
  const isMe = profile.id === 'me'

  const toggleFollow = () =>
    setProfile((p) => ({
      ...p,
      isFollowing: !p.isFollowing,
      followersCount: p.isFollowing ? p.followersCount - 1 : p.followersCount + 1,
    }))

  // Re-sync when navigating between profiles
  useMemo(() => setProfile(baseProfile), [baseProfile])

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
                <Link to={messageThreadPath(profile.id)}>
                  <Button variant="ghost" size="md" rounded="full">
                    <Icon name="chat" />
                    Nhắn tin
                  </Button>
                </Link>
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

        {/* Tab content placeholder */}
        <div className="bg-surface-container-low rounded-3xl p-12 mt-6 text-center mb-12">
          <Icon name="construction" className="text-3xl text-on-surface-variant mb-2" />
          <p className="text-on-surface-variant">
            {tab === 'posts' && `${profile.postsCount} bài viết của ${profile.name} sẽ hiện ở đây.`}
            {tab === 'trips' && `${profile.tripsCount ?? 0} chuyến đi của ${profile.name}.`}
            {tab === 'about' && 'Thông tin chi tiết về sở thích, ngôn ngữ, hành trình…'}
          </p>
        </div>
      </div>
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
