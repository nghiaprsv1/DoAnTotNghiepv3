import { Input } from '@components/ui/Input'
import { ChipSelect } from '../../EditProfile/components/ChipSelect'
import { StepCard } from './StepCard'
import { FileDropzone } from './FileDropzone'
import { CertificateRepeater } from './CertificateRepeater'
import { LANGUAGES, STEP_INFO, TOTAL_STEPS } from './options'

const meta = (n: number) => ({
  step: n,
  totalSteps: TOTAL_STEPS,
  icon: STEP_INFO[n - 1].icon,
  title: STEP_INFO[n - 1].title,
})

export function Step1Personal() {
  return (
    <StepCard
      {...meta(1)}
      description="Thông tin sẽ chỉ hiển thị trên hồ sơ HDV của bạn nếu được duyệt."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input label="Họ và tên" placeholder="Nguyễn Văn A" iconLeft="person" tone="highest" />
        <Input
          label="Tên hiển thị (nếu khác)"
          placeholder="VD: Captain Đức"
          iconLeft="badge"
          tone="highest"
        />
        <Input label="Ngày sinh" type="date" tone="highest" />
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
            Giới tính
          </label>
          <select
            defaultValue="male"
            className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-primary/40 text-on-surface font-medium"
          >
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
        </div>
        <Input
          label="Số điện thoại"
          type="tel"
          placeholder="+84 901 234 567"
          iconLeft="call"
          tone="highest"
        />
        <Input
          label="Email"
          type="email"
          placeholder="email@vidu.com"
          iconLeft="mail"
          tone="highest"
        />
        <div className="md:col-span-2">
          <Input
            label="Địa chỉ thường trú"
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh"
            iconLeft="home"
            tone="highest"
          />
        </div>
      </div>
    </StepCard>
  )
}

export function Step2Identity() {
  return (
    <StepCard
      {...meta(2)}
      description="Cần ít nhất CCCD hoặc Hộ chiếu. Ảnh chụp rõ, không che thông tin."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Số CCCD / CMND"
          placeholder="12 chữ số"
          iconLeft="badge"
          tone="highest"
        />
        <Input
          label="Số hộ chiếu (nếu có)"
          placeholder="VD: C12345678"
          iconLeft="travel"
          tone="highest"
        />
        <Input label="Nơi cấp" placeholder="VD: Cục CSQLHC về TTXH" iconLeft="apartment" tone="highest" />
        <Input label="Ngày cấp" type="date" tone="highest" />
      </div>

      <FileDropzone
        label="Ảnh CCCD / Hộ chiếu"
        description="Tải lên 2 mặt CCCD hoặc trang ảnh của hộ chiếu (PNG, JPG, PDF)."
        accept="image/*,.pdf"
      />
      <FileDropzone
        label="Ảnh chân dung cầm CCCD"
        description="Cầm CCCD/hộ chiếu cạnh mặt bạn, không đeo kính/khẩu trang. Ảnh sẽ chỉ admin xem."
        accept="image/*"
        multiple={false}
      />
    </StepCard>
  )
}

export function Step3Experience() {
  return (
    <StepCard
      {...meta(3)}
      description="Bạn đã làm hướng dẫn viên / dẫn tour bao lâu? Có chứng chỉ gì?"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
            Số năm kinh nghiệm
          </label>
          <select
            defaultValue="3-5"
            className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-4 outline-none focus:ring-2 focus:ring-primary/40 text-on-surface font-medium"
          >
            <option value="0-1">Mới bắt đầu (0–1 năm)</option>
            <option value="1-3">1–3 năm</option>
            <option value="3-5">3–5 năm</option>
            <option value="5-10">5–10 năm</option>
            <option value="10+">Trên 10 năm</option>
          </select>
        </div>
        <Input
          label="Số tour đã dẫn"
          type="number"
          placeholder="VD: 50"
          iconLeft="luggage"
          tone="highest"
        />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
          Ngôn ngữ giao tiếp
        </p>
        <ChipSelect options={LANGUAGES} value={['Tiếng Việt', 'English']} onChange={() => {}} />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
          Chứng chỉ liên quan
        </p>
        <CertificateRepeater />
      </div>

      <FileDropzone
        label="Tải lên ảnh chứng chỉ"
        description="Mỗi chứng chỉ kèm 1 ảnh chụp/scan rõ nét."
        accept="image/*,.pdf"
      />
    </StepCard>
  )
}
