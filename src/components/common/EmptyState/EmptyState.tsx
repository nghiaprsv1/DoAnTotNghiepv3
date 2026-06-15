import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'

interface EmptyStateProps {
  /** Material symbol icon name. */
  icon?: string
  title: string
  /** Subtitle / explanation. */
  description?: string
  /** Optional CTA button. */
  action?: {
    label: string
    to?: string
    onClick?: () => void
  }
  className?: string
}

/**
 * Used whenever the API returns an empty list / 404 — gentle dead-end card
 * with an optional CTA. Replaces the "show mock data instead" pattern.
 */
export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-16 px-6 rounded-3xl bg-surface-container-lowest border border-outline-variant/15',
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high flex items-center justify-center mb-4">
        <Icon name={icon} className="text-primary text-3xl" />
      </div>
      <h3 className="text-lg font-headline font-extrabold text-on-surface mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-on-surface-variant max-w-md leading-relaxed">{description}</p>
      )}
      {action &&
        (action.to ? (
          <Link
            to={action.to}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold hover:bg-primary-dim transition-colors"
          >
            {action.label}
            <Icon name="arrow_forward" size={18} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-bold hover:bg-primary-dim transition-colors"
          >
            {action.label}
            <Icon name="arrow_forward" size={18} />
          </button>
        ))}
    </div>
  )
}
