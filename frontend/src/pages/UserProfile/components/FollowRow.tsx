import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Avatar } from '@components/ui/Avatar'
import { userProfilePath } from '@constants/routes'
import { cn } from '@utils/cn'
import type { FollowItem } from '@types/profile'

interface Props {
  user: FollowItem
  onToggleFollow?: (id: string) => void
}

export function FollowRow({ user, onToggleFollow }: Props) {
  return (
    <article className="flex items-center gap-3 p-4 bg-surface-container-lowest rounded-2xl shadow-editorial border border-outline-variant/10">
      <Link to={userProfilePath(user.id)} className="flex-shrink-0">
        <Avatar src={user.avatar} alt={user.name} size="md" ring={user.verified} />
      </Link>
      <Link
        to={userProfilePath(user.id)}
        className="flex-1 min-w-0 hover:[&_*]:text-primary"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-headline font-extrabold text-on-surface truncate transition">
            {user.name}
          </p>
          {user.verified && (
            <Icon name="verified" size={14} className="text-primary fill" />
          )}
          {user.followsYou && (
            <span className="px-1.5 py-0.5 rounded-md bg-surface-container-high text-on-surface-variant text-[9px] font-bold uppercase tracking-wider">
              Theo dõi bạn
            </span>
          )}
        </div>
        <p className="text-xs text-on-surface-variant truncate">
          {user.handle}
          {user.bio ? ` · ${user.bio}` : ''}
        </p>
      </Link>

      <button
        type="button"
        onClick={() => onToggleFollow?.(user.id)}
        className={cn(
          'inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-headline font-bold transition active:scale-95 flex-shrink-0',
          user.isFollowing
            ? 'bg-surface-container-high text-on-surface hover:bg-error/10 hover:text-error'
            : 'editorial-gradient text-on-primary shadow-editorial'
        )}
      >
        <Icon
          name={user.isFollowing ? 'how_to_reg' : 'person_add'}
          size={16}
        />
        <span>{user.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}</span>
      </button>
    </article>
  )
}
