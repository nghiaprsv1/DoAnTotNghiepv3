import { cn } from '@utils/cn'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'glass' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

const variants = {
  primary: 'bg-primary text-on-primary',
  secondary: 'bg-secondary-container text-on-secondary-container',
  glass: 'bg-white/20 backdrop-blur-md text-white border border-white/30',
  outline: 'bg-surface-container-lowest/80 backdrop-blur-md text-primary',
}

const sizes = {
  sm: 'px-3 py-1 text-[10px]',
  md: 'px-4 py-1.5 text-xs',
}

/**
 * Small chip/pill for destination tags, metadata, categories
 */
export function Badge({ children, variant = 'secondary', size = 'md', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-block rounded-full font-bold uppercase tracking-widest font-headline',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  )
}
