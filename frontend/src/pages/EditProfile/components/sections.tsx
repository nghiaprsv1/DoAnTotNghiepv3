import { Input } from '@components/ui/Input'
import { FormSection } from './FormSection'
import { ChipSelect } from './ChipSelect'
import { ToggleRow } from './ToggleRow'
import {
  ACTIVITIES,
  BUDGET_LEVELS,
  DIETARY,
  EXPERIENCE_LEVELS,
  LANGUAGES,
  TERRAIN_PREFS,
  TRAVEL_STYLES,
  TRIP_PURPOSES,
} from './options'
import type { TravelPreferences } from '@types/profile'

export interface BasicInfoValue {
  name: string
  handle: string
  bio: string
}

interface BasicInfoProps {
  value: BasicInfoValue
  onChange: (patch: Partial<BasicInfoValue>) => void
}

export function BasicInfoSection({ value, onChange }: BasicInfoProps) {
  return (
    <FormSection
      icon="person"
      title="Thông tin cơ bản"
      description="Cách bạn muốn xuất hiện trên TravelSocial"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Tên hiển thị"
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          tone="highest"
        />
        <Input
          label="Tên đăng nhập"
          value={value.handle}
          onChange={(e) => onChange({ handle: e.target.value })}
          iconLeft="alternate_email"
          tone="highest"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Tiểu sử (Bio)
        </label>
        <textarea
          rows={4}
          maxLength={1000}
          value={value.bio}
          onChange={(e) => onChange({ bio: e.target.value })}
          placeholder="Vài dòng giới thiệu về bạn — phong cách du lịch, nơi muốn đến..."
          className="w-full bg-surface-container-highest border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/40 focus:outline-none text-on-surface font-medium resize-none"
        />
        <p className="text-[11px] text-on-surface-variant mt-1 ml-1">
          {value.bio.length}/1000 ký tự.
        </p>
      </div>
    </FormSection>
  )
}

export interface ContactValue {
  email: string
  phone: string
  location: string
}

interface ContactProps {
  value: ContactValue
  onChange: (patch: Partial<ContactValue>) => void
}

export function ContactSection({ value, onChange }: ContactProps) {
  return (
    <FormSection
      icon="contact_mail"
      title="Liên lạc & Vị trí"
      description="Để bạn đồng hành liên hệ được với bạn"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Email"
          type="email"
          value={value.email}
          iconLeft="mail"
          tone="highest"
          disabled
          helperText="Email là ID đăng nhập, không thể chỉnh sửa."
        />
        <Input
          label="Số điện thoại"
          type="tel"
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          iconLeft="call"
          tone="highest"
          placeholder="+84 ..."
        />
        <Input
          label="Thành phố / địa phương"
          value={value.location}
          onChange={(e) => onChange({ location: e.target.value })}
          iconLeft="location_on"
          tone="highest"
          placeholder="vd: Hà Nội"
        />
      </div>
    </FormSection>
  )
}

interface TravelProps {
  value: TravelPreferences
  onChange: (patch: Partial<TravelPreferences>) => void
}

export function TravelProfileSection({ value, onChange }: TravelProps) {
  return (
    <FormSection
      icon="explore"
      title="Hồ sơ du lịch"
      description="Chia sẻ phong cách của bạn để hệ thống gợi ý đúng người, đúng chuyến"
    >
      <Field label="Phong cách (chọn nhiều)">
        <ChipSelect
          options={TRAVEL_STYLES}
          value={value.travelStyles ?? []}
          onChange={(v) => onChange({ travelStyles: v })}
        />
      </Field>
      <Field label="Mục đích đi du lịch">
        <ChipSelect
          options={TRIP_PURPOSES}
          value={value.tripPurposes ?? []}
          onChange={(v) => onChange({ tripPurposes: v })}
        />
      </Field>
      <Field label="Ngân sách thường dùng">
        <ChipSelect
          options={BUDGET_LEVELS}
          value={value.budgetLevel ? [value.budgetLevel] : []}
          onChange={(v) => onChange({ budgetLevel: v[0] ?? null })}
          single
        />
      </Field>
      <Field label="Cấp độ kinh nghiệm">
        <ChipSelect
          options={EXPERIENCE_LEVELS}
          value={value.experienceLevel ? [value.experienceLevel] : []}
          onChange={(v) => onChange({ experienceLevel: v[0] ?? null })}
          single
        />
      </Field>
    </FormSection>
  )
}

export function PreferencesSection({ value, onChange }: TravelProps) {
  return (
    <FormSection
      icon="favorite"
      title="Sở thích & Hoạt động"
      description="Loại địa hình và hoạt động bạn yêu thích"
    >
      <Field label="Loại địa hình yêu thích">
        <ChipSelect
          options={TERRAIN_PREFS}
          value={value.terrainPrefs ?? []}
          onChange={(v) => onChange({ terrainPrefs: v })}
        />
      </Field>
      <Field label="Hoạt động yêu thích">
        <ChipSelect
          options={ACTIVITIES}
          value={value.activities ?? []}
          onChange={(v) => onChange({ activities: v })}
        />
      </Field>
      <Field label="Ngôn ngữ giao tiếp">
        <ChipSelect
          options={LANGUAGES}
          value={value.languages ?? []}
          onChange={(v) => onChange({ languages: v })}
        />
      </Field>
    </FormSection>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
        {label}
      </p>
      {children}
    </div>
  )
}

export { DIETARY, ToggleRow }
