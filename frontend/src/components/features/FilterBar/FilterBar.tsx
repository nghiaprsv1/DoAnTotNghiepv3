import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'

interface FilterItem {
  key: string
  label: string
  icon: string
}

interface FilterBarProps {
  items: FilterItem[]
  activeKey: string
  onChange: (key: string) => void
}

/**
 * Horizontal scrolling filter chips row with active/inactive state.
 */
export function FilterBar({ items, activeKey, onChange }: FilterBarProps) {
  return (
    <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2">
      {items.map((item) => {
        const active = item.key === activeKey
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-colors whitespace-nowrap',
              active
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
            )}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </button>
        )
      })}

      <div className="h-8 w-px bg-outline-variant/30 mx-2 flex-shrink-0" />

      <button
        type="button"
        className="flex items-center gap-2 px-4 py-2.5 text-primary hover:bg-primary/5 rounded-full font-medium transition-colors whitespace-nowrap"
      >
        <Icon name="tune" size={20} />
        More Filters
      </button>
    </div>
  )
}
