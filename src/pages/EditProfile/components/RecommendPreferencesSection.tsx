import { useState } from 'react'
import { Icon } from '@components/ui/Icon'
import { cn } from '@utils/cn'
import { FormSection } from './FormSection'
import { ChipSelect } from './ChipSelect'
import { BUDGET_LEVELS } from './options'
import type { UserPreferences } from '@services/preferenceService'

interface Props {
  value: UserPreferences
  onChange: (patch: Partial<UserPreferences>) => void
  categoryOptions: { value: string; label: string; icon?: string }[]
  provinceOptions: { value: string; label: string }[]
}

/**
 * Sở thích phục vụ GỢI Ý chuyến đi — ghi vào bảng `user_preferences`.
 * Càng chọn đa dạng (danh mục + tỉnh + từ khoá), thuật toán càng khớp được
 * nhiều chuyến phù hợp trong tương lai.
 */
export function RecommendPreferencesSection({
  value,
  onChange,
  categoryOptions,
  provinceOptions,
}: Props) {
  return (
    <FormSection
      icon="tune"
      title="Sở thích để gợi ý chuyến đi"
      description="Chọn càng đa dạng, hệ thống càng gợi ý được nhiều chuyến hợp gu bạn"
    >
      <Field
        label="Loại hình du lịch yêu thích"
        hint="Khớp với danh mục của chuyến đi"
      >
        <ChipSelect
          options={categoryOptions}
          value={value.categories}
          onChange={(v) => onChange({ categories: v })}
        />
      </Field>

      <Field label="Điểm đến mơ ước" hint="Tỉnh/thành bạn muốn được ưu tiên gợi ý">
        <ChipSelect
          options={provinceOptions}
          value={value.provinces}
          onChange={(v) => onChange({ provinces: v })}
        />
      </Field>

      <Field
        label="Từ khoá sở thích"
        hint="Nhập tự do: biển, lặn, cà phê, săn mây... (Enter để thêm)"
      >
        <TagInput
          value={value.interests}
          onChange={(v) => onChange({ interests: v })}
          placeholder="vd: săn mây, hải sản, chụp ảnh..."
        />
      </Field>

      <Field label="Mức ngân sách ưu tiên">
        <ChipSelect
          options={BUDGET_LEVELS}
          value={value.budgetTier ? [value.budgetTier] : []}
          onChange={(v) => onChange({ budgetTier: v[0] ?? null })}
          single
        />
      </Field>
    </FormSection>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1 ml-1">
        {label}
      </p>
      {hint && <p className="text-[11px] text-on-surface-variant/80 mb-3 ml-1">{hint}</p>}
      {children}
    </div>
  )
}

/** Free-form tag input — type + Enter (or comma) to add, click × to remove. */
function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const [draft, setDraft] = useState('')

  const add = (raw: string) => {
    const tag = raw.trim().toLowerCase()
    if (!tag) return
    if (value.includes(tag)) return
    onChange([...value, tag])
    setDraft('')
  }

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag))

  return (
    <div className="bg-surface-container-highest rounded-2xl px-3 py-2.5 flex flex-wrap gap-2 items-center focus-within:ring-2 focus-within:ring-primary/40">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 bg-primary/15 text-primary px-2.5 py-1 rounded-full text-sm font-semibold"
        >
          {tag}
          <button
            type="button"
            onClick={() => remove(tag)}
            className="hover:text-error"
            aria-label={`Xoá ${tag}`}
          >
            <Icon name="close" size={14} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add(draft)
          } else if (e.key === 'Backspace' && !draft && value.length) {
            remove(value[value.length - 1])
          }
        }}
        onBlur={() => add(draft)}
        placeholder={value.length ? '' : placeholder}
        className={cn(
          'flex-1 min-w-[120px] bg-transparent border-none outline-none text-on-surface font-medium py-1',
        )}
      />
    </div>
  )
}
