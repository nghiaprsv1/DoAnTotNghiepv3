import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { mockFollowers, mockFollowing, mockPublicProfiles } from '@constants/mockProfiles'
import {
  userFollowersPath,
  userFollowingPath,
  userProfilePath,
} from '@constants/routes'
import { cn } from '@utils/cn'
import { FollowRow } from './components/FollowRow'
import type { FollowItem } from '@types/profile'

interface Props {
  /** Active tab — derived from URL: /followers or /following */
  initial?: 'followers' | 'following'
}

export function FollowListPage({ initial = 'followers' }: Props) {
  const { id } = useParams<{ id: string }>()
  const [search] = useSearchParams()
  const profile = (id && mockPublicProfiles[id]) || mockPublicProfiles.u1

  const tabFromQuery = search.get('tab')
  const [tab, setTab] = useState<'followers' | 'following'>(
    (tabFromQuery as 'followers' | 'following') || initial
  )

  const [followers, setFollowers] = useState<FollowItem[]>(mockFollowers)
  const [following, setFollowing] = useState<FollowItem[]>(mockFollowing)
  const [query, setQuery] = useState('')

  const list = tab === 'followers' ? followers : following
  const setter = tab === 'followers' ? setFollowers : setFollowing

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

  const toggleFollow = (uid: string) =>
    setter((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, isFollowing: !u.isFollowing } : u))
    )

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
      {filtered.length === 0 ? (
        <div className="bg-surface-container-low rounded-3xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto mb-4">
            <Icon name="group_off" className="text-2xl" />
          </div>
          <p className="text-on-surface-variant">
            {query
              ? 'Không tìm thấy ai khớp.'
              : tab === 'followers'
                ? 'Chưa có ai theo dõi.'
                : 'Chưa theo dõi ai.'}
          </p>
        </div>
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
