import { cn } from '@utils/cn'

interface LoadingStateProps {
  /** Render N skeleton card placeholders. */
  count?: number
  /** Optional caption shown above the spinner. */
  label?: string
  className?: string
}

/**
 * Generic loading skeleton — used while a React Query call is fetching.
 * Renders as `count` rounded blocks; if `count <= 0`, renders only a spinner.
 */
export function LoadingState({ count = 0, label, className }: LoadingStateProps) {
  if (count > 0) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl bg-surface-container-low overflow-hidden animate-pulse"
          >
            <div className="aspect-[4/3] bg-surface-container" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-3/4 bg-surface-container rounded" />
              <div className="h-3 w-1/2 bg-surface-container rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3', className)}>
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/30 border-t-primary" />
      {label && <p className="text-sm text-on-surface-variant">{label}</p>}
    </div>
  )
}
