import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Icon } from '@components/ui/Icon'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { usePosts } from '@hooks/usePosts'
import { useCurrentUserStore } from '@store/currentUserStore'
import { useAuthStore } from '@store/authStore'
import { postService } from '@services/postService'
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

export function SocialPage() {
  const [tab, setTab] = useState<TabKey>('foryou')
  const { data: apiPosts, isLoading } = usePosts({ feed: tab })
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const currentUser = useCurrentUserStore()
  const queryClient = useQueryClient()
  const [composeError, setComposeError] = useState<string | null>(null)

  // Optimistic state — populated when API returns; mutated by like/delete callbacks.
  const [posts, setPosts] = useState<Post[]>([])
  useEffect(() => {
    setPosts(apiPosts ?? [])
  }, [apiPosts])

  const handleCreate = async (
    text: string,
    images: string[],
    visibility: 'public' | 'friends',
  ) => {
    if (!text.trim()) return
    setComposeError(null)
    try {
      // First image is the cover; the rest go to the gallery (max 3 total).
      const cover =
        images[0] ??
        'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80'
      const gallery = images.slice(1)
      const created = await postService.create({
        title: text.split('\n')[0].slice(0, 80) || 'Khoảnh khắc mới',
        excerpt: text.slice(0, 500),
        body: text,
        location: 'Việt Nam',
        image: cover,
        galleryUrls: gallery.length ? gallery : undefined,
        visibility,
      })
      setPosts((prev) => [created, ...prev])
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setComposeError(e.response?.data?.message ?? 'Không đăng được bài.')
    }
  }

  const updatePost = (id: string, updater: (p: Post) => Post) =>
    setPosts((prev) => prev.map((p) => (p.id === id ? updater(p) : p)))

  const deletePost = async (id: string) => {
    // Optimistic remove; rollback on error.
    const snapshot = posts
    setPosts((prev) => prev.filter((p) => p.id !== id))
    try {
      await postService.remove(id)
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    } catch {
      setPosts(snapshot)
    }
  }

  return (
    <div className="max-w-screen-2xl mx-auto container-page py-4 md:py-6">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-6">
        {/* Feed center */}
        <main className="space-y-4 md:space-y-6 max-w-2xl mx-auto w-full">
          {isAuthenticated && (
            <PostComposer
              avatar={currentUser.avatar || ''}
              onPost={handleCreate}
            />
          )}
          {composeError && (
            <div className="rounded-2xl bg-error/10 border border-error/20 px-4 py-3 text-error text-sm">
              {composeError}
            </div>
          )}

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
          {isLoading ? (
            <LoadingState count={3} />
          ) : posts.length === 0 ? (
            <EmptyState
              icon="auto_stories"
              title="Chưa có bài viết"
              description={
                tab === 'following'
                  ? 'Hãy theo dõi thêm người dùng để xem bài viết của họ ở đây.'
                  : 'Cộng đồng đang chuẩn bị nội dung — hãy quay lại sau.'
              }
            />
          ) : (
            posts.map((p) => (
              <FeedPostCard
                key={p.id}
                post={p}
                onChange={updatePost}
                onDelete={deletePost}
                currentUserId={currentUser.id ?? 'me'}
                onToggleLike={async (id) => {
                  await postService.toggleLike(id)
                }}
                onAddComment={async (id, content, parentId) => {
                  await postService.addComment(id, content, parentId)
                }}
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

// LeftRail (Trang chủ / Khám phá / Thông báo / Đã lưu / Chuyến đi / Cài đặt)
// tạm ẩn vì các mục điều hướng chưa hoạt động.
