import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'

interface Props {
  rating: number
  size?: number
  className?: string
}

/**
 * 5-star visual representation supporting fractional ratings (e.g. 4.7).
 */
export function Rating({ rating, size = 16, className }: Props) {
  const stars = [0, 1, 2, 3, 4]
  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {stars.map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i))
        const isFull = fill >= 0.9
        const isHalf = fill > 0.1 && fill < 0.9
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Icon
              name="star"
              size={size}
              className="text-on-surface-variant/30 absolute inset-0"
            />
            {(isFull || isHalf) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: isFull ? '100%' : `${fill * 100}%` }}
              >
                <Icon name="star" size={size} filled className="text-primary" />
              </span>
            )}
          </span>
        )
      })}
    </div>
  )
}
