import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { Button } from '@components/ui/Button'
import { LoadingState } from '@components/common/LoadingState'
import { EmptyState } from '@components/common/EmptyState'
import { useAdminPosts, useDeleteAdminPost } from '@hooks/useAdmin'

const formatDate = (s: string) => new Date(s).toLocaleDateString('vi-VN')

/**
 * Admin moderation page for the social feed. Shows every post regardless of
 * visibility, lets admin search by title/location/author, and force-deletes
 * any post (cascades comments + polymorphic likes).
 */
export function AdminPostsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const { data, isLoading } = useAdminPosts({
    page,
    pageSize,
    search: search.trim() || undefined,
  })
  const del = useDeleteAdminPost()

  const posts = data?.data ?? []
  const totalPages = data?.totalPages ?? 1

  const removePost = (id: string, title: string) => {
    if (!confirm(`Xoá bài viết "${title}"? Hành động không thể hoàn tác.`)) return
    del.mutate(id)
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <h1 className="font-headline font-extrabold text-3xl text-on-surface">Bài viết</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Kiểm duyệt feed cộng đồng. Xem mọi bài (kể cả riêng tư) và xoá khi cần.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-lowest rounded-full px-4 py-2 shadow-editorial w-full md:w-80">
          <Icon name="search" className="text-on-surface-variant" size={18} />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Tìm theo tiêu đề, địa điểm, tác giả…"
            className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-on-surface-variant/60"
          />
        </div>
      </header>

      {isLoading ? (
        <LoadingState count={5} />
      ) : posts.length === 0 ? (
        <EmptyState icon="article" title="Chưa có bài viết nào" />
      ) : (
        <div className="space-y-3">
          {posts.map((p) => (
            <article
              key={p.id}
              className="bg-surface-container-lowest rounded-3xl shadow-editorial p-4 flex flex-col md:flex-row gap-4"
            >
              <img
                src={p.image}
                alt={p.title}
                className="w-full md:w-44 h-32 object-cover rounded-2xl"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-headline font-extrabold text-on-surface line-clamp-1">
                      {p.title}
                    </h3>
                    <p className="text-sm text-on-surface-variant line-clamp-2 mt-1">
                      {p.excerpt}
                    </p>
                  </div>
                  <span
                    className={
                      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ' +
                      (p.visibility === 'friends'
                        ? 'bg-blue-500/15 text-blue-700 border-blue-500/30'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/30')
                    }
                  >
                    {p.visibility}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-on-surface-variant">
                  {p.author && (
                    <div className="flex items-center gap-2">
                      <Avatar src={p.author.avatar ?? ''} alt={p.author.name} size="xs" />
                      <span className="font-bold text-on-surface">{p.author.name}</span>
                      <span>·</span>
                      <span>{p.author.email}</span>
                    </div>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Icon name="place" size={12} />
                    {p.location}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="favorite" size={12} />
                    {p.likeCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="chat_bubble" size={12} />
                    {p.commentCount}
                  </span>
                  <span>{formatDate(p.createdAt)}</span>
                </div>
              </div>

              <div className="flex md:flex-col items-start md:items-end gap-2 md:justify-center">
                <Button
                  size="sm"
                  variant="ghost"
                  rounded="full"
                  className="text-error hover:bg-error/10"
                  onClick={() => removePost(p.id, p.title)}
                  disabled={del.isPending}
                >
                  <Icon name="delete" size={14} />
                  Xoá
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            rounded="full"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <Icon name="chevron_left" size={16} />
            Trước
          </Button>
          <span className="text-on-surface-variant">
            Trang {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            rounded="full"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
            <Icon name="chevron_right" size={16} />
          </Button>
        </div>
      )}
    </div>
  )
}
