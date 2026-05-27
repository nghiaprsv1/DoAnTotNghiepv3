import { cn } from '@utils/cn'

interface IconProps {
  name: string
  className?: string
  filled?: boolean
  size?: number
}

/**
 * Material Symbols Outlined icon wrapper.
 * Usage: <Icon name="favorite" filled />
 */
export function Icon({ name, className, filled = false, size }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined', filled && 'fill', className)}
      style={size ? { fontSize: `${size}px` } : undefined}
      aria-hidden
    >
      {name}
    </span>
  )
}
