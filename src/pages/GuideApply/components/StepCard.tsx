import type { ReactNode } from 'react'
import { Icon } from '@components/ui/Icon'

interface Props {
  step: number
  totalSteps: number
  icon: string
  title: string
  description?: string
  children: ReactNode
}

export function StepCard({ step, totalSteps, icon, title, description, children }: Props) {
  return (
    <section className="bg-surface-container-low p-6 md:p-8 rounded-3xl space-y-5">
      <header className="flex items-start gap-4">
        <span className="relative w-12 h-12 rounded-2xl editorial-gradient text-on-primary flex items-center justify-center flex-shrink-0 shadow-editorial">
          <Icon name={icon} />
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-on-primary text-primary text-[10px] font-extrabold flex items-center justify-center">
            {step}/{totalSteps}
          </span>
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-0.5">
            Bước {step} / {totalSteps}
          </p>
          <h2 className="text-xl font-headline font-extrabold text-on-surface">{title}</h2>
          {description && (
            <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">{description}</p>
          )}
        </div>
      </header>
      {children}
    </section>
  )
}
