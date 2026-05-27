import { cn } from '@utils/cn'

interface AvatarProps {
  src: string
  alt?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  ring?: boolean
  className?: string
}

const sizes = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32 md:w-48 md:h-48',
}

export function Avatar({ src, alt = '', size = 'md', ring = false, className }: AvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full overflow-hidden flex-shrink-0',
        sizes[size],
        ring && 'border-2 border-primary-container',
        className
      )}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
    </div>
  )
}
