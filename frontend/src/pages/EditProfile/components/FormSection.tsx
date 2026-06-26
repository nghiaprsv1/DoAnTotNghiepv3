import type { ReactNode } from 'react'
import { Icon } from '@components/ui/Icon'

interface Props {
  icon: string
  title: string
  description?: string
  children: ReactNode
}

/**
 * Reusable section card used across EditProfile.
 */
export function FormSection({ icon, title, description, children }: Props) {
  return (
    <section className="bg-surface-container-low p-6 md:p-8 rounded-3xl space-y-5">
      <header className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl editorial-gradient text-on-primary flex items-center justify-center flex-shrink-0">
          <Icon name={icon} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-headline font-extrabold text-on-surface">{title}</h2>
          {description && (
            <p className="text-sm text-on-surface-variant mt-0.5">{description}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  )
}
