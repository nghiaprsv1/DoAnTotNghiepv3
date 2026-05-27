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

export function BasicInfoSection() {
  return (
    <FormSection
      icon="person"
      title="Thông tin cơ bản"
      description="Cách bạn muốn xuất hiện trên TravelSocial"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Tên hiển thị" defaultValue="Linh Nguyễn" tone="highest" />
        <Input
          label="Tên đăng nhập"
          defaultValue="@linh.travels"
          iconLeft="alternate_email"
          tone="highest"
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="Ngày sinh" type="date" defaultValue="1996-08-12" tone="highest" />
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
            Giới tính
          </label>
          <select
            defaultValue="female"
            className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-primary/40 text-on-surface font-medium"
          >
            <option value="female">Nữ</option>
            <option value="male">Nam</option>
            <option value="other">Khác</option>
            <option value="hidden">Không hiển thị</option>
          </select>
        </div>
        <Input
          label="Quốc tịch"
          defaultValue="Việt Nam"
          iconLeft="public"
          tone="highest"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Tiểu sử (Bio)
        </label>
        <textarea
          rows={4}
          maxLength={240}
          defaultValue="Yêu du lịch và nhiếp ảnh. Đang trên hành trình khám phá vẻ đẹp tiềm ẩn của Việt Nam — và sẵn sàng kết bạn cùng đi."
          className="w-full bg-surface-container-highest border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/40 focus:outline-none text-on-surface font-medium resize-none"
        />
        <p className="text-[11px] text-on-surface-variant mt-1 ml-1">Tối đa 240 ký tự.</p>
      </div>
    </FormSection>
  )
}

export function ContactSection() {
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
          defaultValue="linh.nguyen@travel.com"
          iconLeft="mail"
          tone="highest"
        />
        <Input
          label="Số điện thoại"
          type="tel"
          defaultValue="+84 901 234 567"
          iconLeft="call"
          tone="highest"
        />
        <Input
          label="Thành phố hiện tại"
          defaultValue="Thành phố Hồ Chí Minh"
          iconLeft="location_on"
          tone="highest"
        />
        <Input label="Quốc gia" defaultValue="Việt Nam" iconLeft="flag" tone="highest" />
      </div>
    </FormSection>
  )
}

export function TravelProfileSection() {
  return (
    <FormSection
      icon="explore"
      title="Hồ sơ du lịch"
      description="Chia sẻ phong cách của bạn để hệ thống gợi ý đúng người, đúng chuyến"
    >
      <Field label="Phong cách (chọn nhiều)">
        <ChipSelect
          options={TRAVEL_STYLES}
          value={['adventure', 'photography', 'food']}
          onChange={() => {}}
        />
      </Field>
      <Field label="Mục đích đi du lịch">
        <ChipSelect options={TRIP_PURPOSES} value={['friends', 'solo']} onChange={() => {}} />
      </Field>
      <Field label="Ngân sách thường dùng">
        <ChipSelect options={BUDGET_LEVELS} value={['mid']} onChange={() => {}} single />
      </Field>
      <Field label="Cấp độ kinh nghiệm">
        <ChipSelect options={EXPERIENCE_LEVELS} value={['casual']} onChange={() => {}} single />
      </Field>
    </FormSection>
  )
}

export function PreferencesSection() {
  return (
    <FormSection
      icon="favorite"
      title="Sở thích & Hoạt động"
      description="Bạn thích loại địa hình và hoạt động nào nhất?"
    >
      <Field label="Loại địa hình yêu thích">
        <ChipSelect
          options={TERRAIN_PREFS}
          value={['mountain', 'island', 'countryside']}
          onChange={() => {}}
        />
      </Field>
      <Field label="Hoạt động yêu thích">
        <ChipSelect
          options={ACTIVITIES}
          value={['trekking', 'motorbike', 'cooking']}
          onChange={() => {}}
        />
      </Field>
      <Field label="Ngôn ngữ giao tiếp">
        <ChipSelect options={LANGUAGES} value={['vi', 'en']} onChange={() => {}} />
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
