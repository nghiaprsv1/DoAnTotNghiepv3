import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useFollowers, useFollowing, useUserProfile } from '@hooks/useUserProfile'
import { userService } from '@services/userService'
import {
  ROUTES,
  userFollowersPath,
  userFollowingPath,
  userProfilePath,
} from '@constants/routes'
import { cn } from '@utils/cn'
import { FollowRow } from './components/FollowRow'

interface Props {
  /** Active tab — derived from URL: /followers or /following */
  initial?: 'followers' | 'following'
}

export function FollowListPage({ initial = 'followers' }: Props) {
  const { id } = useParams<{ id: string }>()
  const [search] = useSearchParams()

  const { data: profile, isLoading: profileLoading } = useUserProfile(id)
  const tabFromQuery = search.get('tab')
  const [tab, setTab] = useState<'followers' | 'following'>(
    (tabFromQuery as 'followers' | 'following') || initial
  )

  const { data: followers = [], refetch: refetchFollowers, isLoading: followersLoading } =
    useFollowers(tab === 'followers' ? id : undefined)
  const { data: following = [], refetch: refetchFollowing, isLoading: followingLoading } =
    useFollowing(tab === 'following' ? id : undefined)

  const list = tab === 'followers' ? followers : following
  const isLoading = tab === 'followers' ? followersLoading : followingLoading
  const refetch = tab === 'followers' ? refetchFollowers : refetchFollowing

  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return list
    const q = query.toLowerCase()
    return list.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.handle.toLowerCase().includes(q) ||
        (u.bio ?? '').toLowerCase().includes(q)
    )
  }, [list, query])

  const toggleFollow = async (uid: string) => {
    const target = list.find((u) => u.id === uid)
    if (!target) return
    try {
      if (target.isFollowing) {
        await userService.unfollow(uid)
      } else {
        await userService.follow(uid)
      }
      await refetch()
    } catch {
      // optimistic UI not implemented for follow row; let refetch reflect reality
    }
  }

  if (profileLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <LoadingState label="Đang tải..." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
        <EmptyState
          icon="person_off"
          title="Không tìm thấy người dùng"
          action={{ label: 'Về trang chủ', to: ROUTES.HOME }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <header className="mb-6">
        <Link
          to={userProfilePath(profile.id)}
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-3"
        >
          <Icon name="arrow_back" size={18} />
          {profile.name}
        </Link>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline text-on-surface">
          {profile.name}
        </h1>
        <p className="text-on-surface-variant text-sm">{profile.handle}</p>
      </header>

      {/* Tabs */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-1 flex mb-6">
        <Link
          to={userFollowersPath(profile.id)}
          onClick={() => setTab('followers')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-headline font-bold transition',
            tab === 'followers'
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          )}
        >
          <Icon name="group" size={18} />
          {profile.followersCount.toLocaleString('vi-VN')} Followers
        </Link>
        <Link
          to={userFollowingPath(profile.id)}
          onClick={() => setTab('following')}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-headline font-bold transition',
            tab === 'following'
              ? 'bg-primary/10 text-primary'
              : 'text-on-surface-variant hover:bg-surface-container-low'
          )}
        >
          <Icon name="how_to_reg" size={18} />
          {profile.followingCount.toLocaleString('vi-VN')} Following
        </Link>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2.5 shadow-editorial mb-6">
        <Icon name="search" className="text-on-surface-variant" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Tìm trong ${tab === 'followers' ? 'followers' : 'following'}…`}
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/60"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Xoá tìm kiếm"
            className="text-on-surface-variant hover:text-primary"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingState label="Đang tải..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="group_off"
          title={
            query
              ? 'Không tìm thấy ai khớp'
              : tab === 'followers'
                ? 'Chưa có ai theo dõi'
                : 'Chưa theo dõi ai'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <FollowRow key={u.id} user={u} onToggleFollow={toggleFollow} />
          ))}
        </div>
      )}
    </div>
  )
}
