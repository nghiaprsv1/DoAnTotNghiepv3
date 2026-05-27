import { useMemo, useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { mockFeedPosts, mockStories } from '@constants/mockFeed'
import { StoryBar } from './components/StoryBar'
import { PostComposer } from './components/PostComposer'
import { FeedPostCard } from './components/FeedPostCard'
import { SuggestedPeople } from './components/SuggestedPeople'
import { TrendingTags } from './components/TrendingTags'
import type { Post } from '@types/post'

const FEED_TABS = [
  { key: 'foryou', label: 'Dành cho bạn', icon: 'auto_awesome' },
  { key: 'following', label: 'Đang theo dõi', icon: 'group' },
  { key: 'trending', label: 'Thịnh hành', icon: 'trending_up' },
] as const

type TabKey = (typeof FEED_TABS)[number]['key']

const CURRENT_AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'

export function SocialPage() {
  const [tab, setTab] = useState<TabKey>('foryou')
  const [posts, setPosts] = useState<Post[]>(mockFeedPosts)

  const visiblePosts = useMemo(() => {
    if (tab === 'trending') {
      return [...posts].sort((a, b) => b.likes - a.likes)
    }
    if (tab === 'following') {
      return posts.filter((p) => p.authorVerified)
    }
    return posts
  }, [posts, tab])

  const handleCreate = (text: string, image?: string) => {
    if (!text.trim()) return
    const newPost: Post = {
      id: `local-${Date.now()}`,
      authorId: 'me',
      authorName: 'Bạn',
      authorAvatar: CURRENT_AVATAR,
      location: 'Việt Nam',
      postedAt: 'vừa xong',
      title: text.split('\n')[0].slice(0, 80) || 'Khoảnh khắc mới',
      excerpt: text,
      body: text,
      image:
        image ??
        'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
      tags: [],
      likes: 0,
      comments: 0,
      shares: 0,
    }
    setPosts((prev) => [newPost, ...prev])
  }

  const updatePost = (id: string, updater: (p: Post) => Post) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? updater(p) : p)))

  const deletePost = (id: string) =>
    setPosts((prev) => prev.filter((p) => p.id !== id))

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-6">
        {/* Left rail */}
        <aside className="hidden lg:block">
          <LeftRail />
        </aside>

        {/* Feed center */}
        <main className="space-y-6 max-w-2xl mx-auto w-full">
          <StoryBar stories={mockStories} />

          <PostComposer avatar={CURRENT_AVATAR} onPost={handleCreate} />

          {/* Tabs */}
          <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-1 flex">
            {FEED_TABS.map((t) => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-headline font-bold transition ${
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  <Icon name={t.icon} size={18} />
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              )
            })}
          </div>

          {/* Feed */}
          {visiblePosts.length === 0 ? (
            <div className="text-center py-16 px-6 bg-surface-container-low rounded-3xl">
              <Icon name="inbox" className="text-3xl text-on-surface-variant mb-2" />
              <p className="text-on-surface-variant">Chưa có bài viết nào trong mục này.</p>
            </div>
          ) : (
            visiblePosts.map((p) => (
              <FeedPostCard
                key={p.id}
                post={p}
                onChange={updatePost}
                onDelete={deletePost}
                currentUserId="me"
              />
            ))
          )}
        </main>

        {/* Right rail */}
        <aside className="hidden lg:flex flex-col gap-6 sticky top-24 self-start">
          <SuggestedPeople />
          <TrendingTags />
        </aside>
      </div>
    </div>
  )
}

function LeftRail() {
  const items = [
    { icon: 'home', label: 'Trang chủ', active: true },
    { icon: 'explore', label: 'Khám phá' },
    { icon: 'notifications', label: 'Thông báo', badge: 3 },
    { icon: 'bookmark', label: 'Đã lưu' },
    { icon: 'flight_takeoff', label: 'Chuyến đi' },
    { icon: 'settings', label: 'Cài đặt' },
  ]
  return (
    <div className="sticky top-24 bg-surface-container-lowest rounded-3xl shadow-editorial p-3 space-y-1">
      <div className="flex items-center gap-3 p-3 mb-2">
        <Avatar src={CURRENT_AVATAR} size="md" ring />
        <div className="min-w-0">
          <p className="font-headline font-extrabold text-on-surface truncate">Bạn</p>
          <p className="text-xs text-on-surface-variant truncate">@traveler.vn</p>
        </div>
      </div>
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition ${
            it.active
              ? 'bg-primary/10 text-primary font-headline font-extrabold'
              : 'text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <Icon name={it.icon} />
          <span className="flex-1">{it.label}</span>
          {it.badge && (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
              {it.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
