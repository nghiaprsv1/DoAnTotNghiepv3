import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { userProfilePath } from '@constants/routes'
import { GalleryCarousel } from './GalleryCarousel'
import { CommentSection } from './CommentSection'
import type { Post } from '@types/post'

interface Props {
  post: Post
  onChange: (id: string, updater: (p: Post) => Post) => void
  /** Called when author deletes the post. */
  onDelete?: (id: string) => void
  /** ID of the current user — used to gate "Xoá" menu item. */
  currentUserId?: string
}

const CURRENT_AVATAR =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'

export function FeedPostCard({
  post,
  onChange,
  onDelete,
  currentUserId = 'me',
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const isAuthor = post.authorId === currentUserId

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [menuOpen])

  const images = post.gallery && post.gallery.length > 0 ? post.gallery : [post.image]

  const toggleLike = () =>
    onChange(post.id, (p) => ({
      ...p,
      isLiked: !p.isLiked,
      likes: p.isLiked ? p.likes - 1 : p.likes + 1,
    }))

  const toggleBookmark = () =>
    onChange(post.id, (p) => ({ ...p, isBookmarked: !p.isBookmarked }))

  const addComment = (content: string) => {
    if (!content.trim()) return
    onChange(post.id, (p) => ({
      ...p,
      comments: p.comments + 1,
      topComments: [
        ...(p.topComments ?? []),
        {
          id: `lc-${Date.now()}`,
          authorId: 'me',
          authorName: 'Bạn',
          authorAvatar: CURRENT_AVATAR,
          content: content.trim(),
          createdAt: 'vừa xong',
          likes: 0,
        },
      ],
    }))
  }

  return (
    <article className="bg-surface-container-lowest rounded-3xl shadow-editorial overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4">
        <Link to={userProfilePath(post.authorId)} className="flex-shrink-0">
          <Avatar src={post.authorAvatar} size="md" ring={post.authorVerified} />
        </Link>
        <Link
          to={userProfilePath(post.authorId)}
          className="flex-1 min-w-0 hover:[&_p]:text-primary transition"
        >
          <div className="flex items-center gap-1">
            <p className="font-headline font-extrabold text-on-surface truncate">
              {post.authorName}
            </p>
            {post.authorVerified && (
              <Icon name="verified" size={16} className="text-primary fill" />
            )}
          </div>
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <Icon name="location_on" size={12} />
            {post.location} · {post.postedAt}
          </p>
        </Link>
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Tuỳ chọn"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="w-9 h-9 rounded-full hover:bg-surface-container-low text-on-surface-variant flex items-center justify-center"
          >
            <Icon name="more_horiz" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-11 z-30 w-56 bg-surface-container-lowest rounded-2xl shadow-editorial-lg border border-outline-variant/15 overflow-hidden"
            >
              <ul className="py-1">
                <MenuButton
                  icon="bookmark"
                  label={post.isBookmarked ? 'Bỏ lưu bài' : 'Lưu bài'}
                  onClick={() => {
                    onChange(post.id, (p) => ({ ...p, isBookmarked: !p.isBookmarked }))
                    setMenuOpen(false)
                  }}
                />
                <MenuButton
                  icon="link"
                  label="Sao chép link"
                  onClick={() => {
                    navigator.clipboard?.writeText(`${location.origin}/social#${post.id}`)
                    setMenuOpen(false)
                  }}
                />
                {!isAuthor && (
                  <MenuButton
                    icon="flag"
                    label="Báo cáo bài"
                    onClick={() => setMenuOpen(false)}
                  />
                )}
                {isAuthor && (
                  <>
                    <li className="my-1 border-t border-outline-variant/10" />
                    <MenuButton
                      icon="edit"
                      label="Chỉnh sửa bài"
                      onClick={() => setMenuOpen(false)}
                    />
                    <MenuButton
                      icon="delete"
                      label="Xoá bài"
                      danger
                      onClick={() => {
                        if (confirm('Xoá bài viết này? Hành động không thể hoàn tác.')) {
                          onDelete?.(post.id)
                        }
                        setMenuOpen(false)
                      }}
                    />
                  </>
                )}
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Body text */}
      <div className="px-5 pb-4">
        <h3 className="font-headline font-extrabold text-lg text-on-surface mb-2 leading-snug">
          {post.title}
        </h3>
        <p
          className={`text-sm text-on-surface/85 whitespace-pre-line ${
            expanded ? '' : 'line-clamp-3'
          }`}
        >
          {post.body ?? post.excerpt}
        </p>
        {(post.body ?? post.excerpt).length > 160 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-xs font-bold text-primary hover:underline"
          >
            {expanded ? 'Thu gọn' : 'Xem thêm'}
          </button>
        )}
        {post.tags && post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <span
                key={t}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Media */}
      <GalleryCarousel images={images} alt={post.title} />

      {/* Reactions summary */}
      <div className="flex items-center justify-between px-5 pt-4 text-xs text-on-surface-variant">
        <span className="inline-flex items-center gap-1">
          <span className="inline-flex -space-x-1">
            <span className="w-5 h-5 rounded-full editorial-gradient flex items-center justify-center text-on-primary">
              <Icon name="favorite" size={12} className="fill" />
            </span>
          </span>
          <span>
            <strong className="text-on-surface">{post.likes.toLocaleString()}</strong> lượt thích
          </span>
        </span>
        <span>
          {post.comments} bình luận · {post.shares ?? 0} chia sẻ
        </span>
      </div>

      {/* Action bar */}
      <div className="grid grid-cols-4 mt-3 mx-3 mb-3 rounded-2xl bg-surface-container-low/60">
        <ActionBtn
          icon="favorite"
          label="Thích"
          active={post.isLiked}
          activeClass="text-primary"
          onClick={toggleLike}
        />
        <ActionBtn
          icon="chat_bubble"
          label="Bình luận"
          onClick={() => setShowComments((s) => !s)}
        />
        <div className="relative">
          <ActionBtn icon="share" label="Chia sẻ" onClick={() => setShowShare((s) => !s)} />
          {showShare && <ShareMenu onClose={() => setShowShare(false)} />}
        </div>
        <ActionBtn
          icon="bookmark"
          label="Lưu"
          active={post.isBookmarked}
          activeClass="text-primary"
          onClick={toggleBookmark}
        />
      </div>

      {/* Comments */}
      {showComments && (
        <CommentSection
          comments={post.topComments ?? []}
          onSubmit={addComment}
          currentAvatar={CURRENT_AVATAR}
        />
      )}
    </article>
  )
}

function ActionBtn({
  icon,
  label,
  active,
  activeClass,
  onClick,
}: {
  icon: string
  label: string
  active?: boolean
  activeClass?: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-headline font-bold transition rounded-2xl hover:bg-surface-container ${
        active ? activeClass ?? 'text-primary' : 'text-on-surface-variant'
      }`}
    >
      <Icon name={icon} size={18} {...(active ? { filled: true } : {})} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function ShareMenu({ onClose }: { onClose: () => void }) {
  const items = [
    { icon: 'link', label: 'Sao chép link' },
    { icon: 'chat', label: 'Gửi qua Chat' },
    { icon: 'mail', label: 'Email' },
    { icon: 'flag', label: 'Báo cáo' },
  ]
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="absolute z-40 bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-surface-container-lowest rounded-2xl shadow-editorial-lg border border-outline-variant/15 py-2">
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={onClose}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-surface-container-low text-on-surface text-left"
          >
            <Icon name={it.icon} size={18} className="text-on-surface-variant" />
            {it.label}
          </button>
        ))}
      </div>
    </>
  )
}

function MenuButton({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: string
  label: string
  onClick?: () => void
  danger?: boolean
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition ${
          danger
            ? 'text-error hover:bg-error/10'
            : 'text-on-surface hover:bg-surface-container-low'
        }`}
      >
        <Icon
          name={icon}
          size={18}
          className={danger ? 'text-error' : 'text-on-surface-variant'}
        />
        <span className="font-headline font-bold">{label}</span>
      </button>
    </li>
  )
}
