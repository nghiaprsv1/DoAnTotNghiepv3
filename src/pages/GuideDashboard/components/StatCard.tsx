import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'

interface Props {
  icon: string
  label: string
  value: string
  delta?: { value: string; positive?: boolean }
  tone?: 'primary' | 'neutral'
}

export function StatCard({ icon, label, value, delta, tone = 'neutral' }: Props) {
  return (
    <div
      className={cn(
        'rounded-3xl p-5 shadow-editorial transition',
        tone === 'primary'
          ? 'editorial-gradient text-on-primary'
          : 'bg-surface-container-lowest text-on-surface'
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            tone === 'primary'
              ? 'bg-on-primary/15 text-on-primary'
              : 'bg-primary/10 text-primary'
          )}
        >
          <Icon name={icon} />
        </span>
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold',
              delta.positive
                ? 'bg-green-500/15 text-green-700'
                : 'bg-error/10 text-error',
              tone === 'primary' && 'bg-on-primary/15 text-on-primary'
            )}
          >
            <Icon name={delta.positive ? 'trending_up' : 'trending_down'} size={12} />
            {delta.value}
          </span>
        )}
      </div>
      <p
        className={cn(
          'text-[10px] font-bold uppercase tracking-widest',
          tone === 'primary' ? 'text-on-primary/80' : 'text-on-surface-variant'
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          'text-2xl font-extrabold font-headline mt-1 leading-tight',
          tone === 'primary' ? 'text-on-primary' : 'text-on-surface'
        )}
      >
        {value}
      </p>
    </div>
  )
}
