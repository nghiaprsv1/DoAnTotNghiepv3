import { Input } from '@components/ui/Input'
import { Icon } from '@components/ui/Icon'
import { FormSection } from './FormSection'
import { ChipSelect } from './ChipSelect'
import { ToggleRow } from './ToggleRow'
import { DIETARY } from './options'

export function TravelDocsSection() {
  return (
    <FormSection
      icon="badge"
      title="Giấy tờ & Sức khoẻ"
      description="Thông tin chỉ hiển thị với hướng dẫn viên/admin của chuyến đi"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Số hộ chiếu"
          defaultValue="C12345678"
          iconLeft="passport"
          tone="highest"
        />
        <Input
          label="Hộ chiếu hết hạn"
          type="date"
          defaultValue="2030-06-30"
          tone="highest"
        />
        <Input
          label="CCCD / CMND"
          defaultValue="079096012345"
          iconLeft="badge"
          tone="highest"
        />
        <Input
          label="Bảo hiểm du lịch"
          defaultValue="VNI Travel · #VNI-9876"
          iconLeft="health_and_safety"
          tone="highest"
        />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
          Chế độ ăn / dị ứng
        </p>
        <ChipSelect options={DIETARY} value={['vegetarian']} onChange={() => {}} />
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Ghi chú y tế
        </label>
        <textarea
          rows={3}
          placeholder="Tiền sử bệnh, thuốc cần mang, lưu ý cho hướng dẫn viên..."
          className="w-full bg-surface-container-highest border-none rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary/40 focus:outline-none text-on-surface font-medium resize-none"
        />
      </div>
    </FormSection>
  )
}

export function EmergencyContactSection() {
  return (
    <FormSection
      icon="emergency"
      title="Liên hệ khẩn cấp"
      description="Người sẽ được liên hệ nếu có sự cố trong chuyến đi"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Họ và tên"
          defaultValue="Nguyễn Văn Bình"
          iconLeft="person"
          tone="highest"
        />
        <Input
          label="Mối quan hệ"
          defaultValue="Anh trai"
          iconLeft="diversity_3"
          tone="highest"
        />
        <Input
          label="Số điện thoại"
          type="tel"
          defaultValue="+84 909 888 777"
          iconLeft="call"
          tone="highest"
        />
        <Input
          label="Email"
          type="email"
          defaultValue="binh.nguyen@email.com"
          iconLeft="mail"
          tone="highest"
        />
      </div>
    </FormSection>
  )
}

export function SocialLinksSection() {
  const socials: { key: string; icon: string; label: string; placeholder: string; defaultValue?: string }[] =
    [
      {
        key: 'instagram',
        icon: 'photo_camera',
        label: 'Instagram',
        placeholder: '@username',
        defaultValue: '@linh.travels',
      },
      {
        key: 'facebook',
        icon: 'public',
        label: 'Facebook',
        placeholder: 'facebook.com/...',
      },
      {
        key: 'tiktok',
        icon: 'music_note',
        label: 'TikTok',
        placeholder: '@username',
      },
      {
        key: 'website',
        icon: 'language',
        label: 'Website / Blog',
        placeholder: 'https://...',
      },
    ]

  return (
    <FormSection
      icon="link"
      title="Mạng xã hội"
      description="Liên kết để cộng đồng theo dõi hành trình của bạn"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {socials.map((s) => (
          <Input
            key={s.key}
            label={s.label}
            iconLeft={s.icon}
            placeholder={s.placeholder}
            defaultValue={s.defaultValue}
            tone="highest"
          />
        ))}
      </div>
    </FormSection>
  )
}

export function PrivacySection() {
  return (
    <FormSection
      icon="lock"
      title="Quyền riêng tư & Thông báo"
      description="Bạn quyết định ai có thể thấy gì"
    >
      <div className="space-y-1 bg-surface-container-lowest/40 rounded-2xl p-2">
        <ToggleRow
          label="Cho phép tìm kiếm hồ sơ"
          description="Người khác có thể tìm thấy bạn qua tên hoặc email."
          defaultChecked
        />
        <ToggleRow
          label="Hiển thị vị trí thời gian thực"
          description="Chia sẻ vị trí chuyến đi đang diễn ra với bạn đồng hành."
        />
        <ToggleRow
          label="Cho phép tin nhắn từ người lạ"
          description="Người chưa kết nối có thể gửi tin nhắn cho bạn."
          defaultChecked
        />
        <ToggleRow
          label="Email khi có chuyến đi gợi ý"
          description="Nhận gợi ý hằng tuần dựa trên sở thích của bạn."
          defaultChecked
        />
        <ToggleRow
          label="Thông báo khi có người tham gia chuyến của tôi"
          defaultChecked
        />
      </div>
    </FormSection>
  )
}

export function DangerSection() {
  return (
    <section className="bg-error/5 border border-error/20 p-6 md:p-8 rounded-3xl space-y-4">
      <header className="flex items-start gap-3">
        <span className="w-10 h-10 rounded-xl bg-error/10 text-error flex items-center justify-center flex-shrink-0">
          <Icon name="warning" />
        </span>
        <div>
          <h2 className="text-xl font-headline font-extrabold text-error">Vùng nguy hiểm</h2>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Các thao tác không thể hoàn tác.
          </p>
        </div>
      </header>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full border border-error/30 text-error hover:bg-error/10 font-headline font-bold transition"
        >
          <Icon name="pause_circle" />
          Tạm ngưng tài khoản
        </button>
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-error text-on-error hover:bg-error-dim font-headline font-bold transition"
        >
          <Icon name="delete_forever" />
          Xoá tài khoản
        </button>
      </div>
    </section>
  )
}
