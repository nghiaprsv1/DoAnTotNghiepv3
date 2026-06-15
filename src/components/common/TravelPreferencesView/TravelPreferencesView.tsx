import { Icon } from '@components/ui/Icon'
import {
  ACTIVITIES,
  BUDGET_LEVELS,
  EXPERIENCE_LEVELS,
  LANGUAGES,
  TERRAIN_PREFS,
  TRAVEL_STYLES,
  TRIP_PURPOSES,
} from '@pages/EditProfile/components/options'
import type { TravelPreferences } from '@types/profile'

interface Group {
  label: string
  icon: string
  options: { value: string; label: string; icon?: string }[]
  values: string[]
}

interface Props {
  preferences?: TravelPreferences | null
  /** When true, hides the heading so it can be embedded in another section. */
  compact?: boolean
  className?: string
}

/** Build display groups, dropping empty ones so the panel only renders sections the user actually filled in. */
function buildGroups(p: TravelPreferences): Group[] {
  const single = (v?: string | null) => (v ? [v] : [])
  return [
    { label: 'Phong cách', icon: 'auto_awesome', options: TRAVEL_STYLES, values: p.travelStyles ?? [] },
    { label: 'Mục đích', icon: 'flag', options: TRIP_PURPOSES, values: p.tripPurposes ?? [] },
    { label: 'Ngân sách', icon: 'savings', options: BUDGET_LEVELS, values: single(p.budgetLevel) },
    { label: 'Kinh nghiệm', icon: 'military_tech', options: EXPERIENCE_LEVELS, values: single(p.experienceLevel) },
    { label: 'Địa hình yêu thích', icon: 'terrain', options: TERRAIN_PREFS, values: p.terrainPrefs ?? [] },
    { label: 'Hoạt động', icon: 'directions_run', options: ACTIVITIES, values: p.activities ?? [] },
    { label: 'Ngôn ngữ', icon: 'translate', options: LANGUAGES, values: p.languages ?? [] },
  ].filter((g) => g.values.length > 0)
}

/**
 * Read-only view of a user's travel preferences. Renders nothing when the
 * profile has no preferences set so it can be dropped into any layout.
 */
export function TravelPreferencesView({ preferences, compact, className }: Props) {
  if (!preferences) return null
  const groups = buildGroups(preferences)
  if (groups.length === 0) return null

  return (
    <section
      className={
        className ??
        (compact
          ? 'space-y-4'
          : 'bg-surface-container-lowest rounded-3xl shadow-editorial p-6 md:p-8 space-y-5')
      }
    >
      {!compact && (
        <header className="flex items-center gap-2 mb-1">
          <Icon name="explore" className="text-primary" />
          <h3 className="font-headline font-bold text-on-surface">Hồ sơ du lịch</h3>
        </header>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 flex items-center gap-1.5">
              <Icon name={g.icon} size={14} />
              {g.label}
            </p>
            <div className="flex flex-wrap gap-2">
              {g.values.map((v) => {
                const opt = g.options.find((o) => o.value === v)
                return (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20"
                  >
                    {opt?.icon && <Icon name={opt.icon} size={14} />}
                    {opt?.label ?? v}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
