import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import type { Post } from '@types/post'

interface PostCardProps {
  post: Post
}

/**
 * Editorial-style community post card.
 */
export function PostCard({ post }: PostCardProps) {
  return (
    <article className="bg-surface-container-lowest rounded-3xl overflow-hidden editorial-shadow flex flex-col group">
      <header className="p-4 flex items-center gap-3">
        <Avatar src={post.authorAvatar} size="sm" />
        <div>
          <h4 className="font-headline font-bold text-sm text-on-surface leading-tight">
            {post.authorName}
          </h4>
          <span className="text-[10px] text-on-surface-variant">
            {post.postedAt} • {post.location}
          </span>
        </div>
      </header>

      <div className="aspect-[4/5] overflow-hidden">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-6">
        <h3 className="font-headline font-bold text-xl mb-2 text-on-surface">{post.title}</h3>
        <p className="text-on-surface-variant text-sm line-clamp-2">{post.excerpt}</p>

        <div className="mt-6 pt-6 border-t border-surface-container flex items-center justify-between">
          <div className="flex gap-4 text-on-surface-variant">
            <button
              type="button"
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Icon name="favorite" size={20} filled={post.isLiked} />
              <span className="text-xs font-bold">{post.likes}</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 hover:text-primary transition-colors"
            >
              <Icon name="chat_bubble" size={20} />
              <span className="text-xs font-bold">{post.comments}</span>
            </button>
          </div>
          <button type="button" className="text-primary" aria-label="Bookmark">
            <Icon name="bookmark" filled={post.isBookmarked} />
          </button>
        </div>
      </div>
    </article>
  )
}
