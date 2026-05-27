import { Input } from '@components/ui/Input'
import { Icon } from '@components/ui/Icon'
import { ChipSelect } from '../../EditProfile/components/ChipSelect'
import { ToggleRow } from '../../EditProfile/components/ToggleRow'
import { StepCard } from './StepCard'
import { FileDropzone } from './FileDropzone'
import { REGIONS, SPECIALTIES, STEP_INFO, TOTAL_STEPS, TOUR_TYPES } from './options'

const meta = (n: number) => ({
  step: n,
  totalSteps: TOTAL_STEPS,
  icon: STEP_INFO[n - 1].icon,
  title: STEP_INFO[n - 1].title,
})

export function Step4Coverage() {
  return (
    <StepCard {...meta(4)} description="Vùng nào bạn dẫn được, làm tour kiểu gì, giá bao nhiêu?">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
          Vùng phụ trách (chọn nhiều)
        </p>
        <ChipSelect options={REGIONS} value={['north']} onChange={() => {}} />
      </div>

      <Input
        label="Khu vực cụ thể"
        placeholder="VD: Sapa, Y Tý, Hà Giang, Mộc Châu..."
        iconLeft="location_on"
        tone="highest"
      />

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
          Chuyên môn / Lĩnh vực
        </p>
        <ChipSelect
          options={SPECIALTIES}
          value={['mountain', 'culture', 'photography']}
          onChange={() => {}}
        />
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
          Loại tour cung cấp
        </p>
        <ChipSelect options={TOUR_TYPES} value={['private', 'daytrip']} onChange={() => {}} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Giá đề xuất / ngày (VND)"
          type="number"
          placeholder="850000"
          iconLeft="payments"
          tone="highest"
        />
        <Input
          label="Số khách tối đa / tour"
          type="number"
          placeholder="VD: 10"
          iconLeft="groups"
          tone="highest"
        />
      </div>

      <div className="space-y-1 bg-surface-container-lowest/40 rounded-2xl p-2">
        <ToggleRow
          label="Sẵn sàng nhận tour cuối tuần / ngày lễ"
          defaultChecked
        />
        <ToggleRow
          label="Có phương tiện di chuyển riêng (ô tô / xe máy)"
          description="Sẽ giúp bạn nhận được nhiều tour hơn."
        />
        <ToggleRow label="Có thể đón khách tại sân bay / nhà ga" defaultChecked />
      </div>
    </StepCard>
  )
}

export function Step5Portfolio() {
  return (
    <StepCard
      {...meta(5)}
      description="Phần này sẽ hiển thị công khai trên hồ sơ HDV của bạn nếu được duyệt."
    >
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Tiêu đề hồ sơ
        </label>
        <input
          type="text"
          placeholder="VD: Người dẫn lối Tây Bắc — 8 năm kinh nghiệm"
          maxLength={80}
          className="w-full bg-surface-container-highest border-none rounded-2xl py-4 px-4 text-on-surface font-medium outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-[11px] text-on-surface-variant mt-1 ml-1">Tối đa 80 ký tự.</p>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
          Giới thiệu bản thân
        </label>
        <textarea
          rows={5}
          maxLength={1000}
          placeholder="Kể về bạn — bạn là ai, lý do bạn yêu công việc dẫn tour, điều khiến bạn khác biệt..."
          className="w-full bg-surface-container-highest border-none rounded-2xl px-4 py-3 text-on-surface font-medium resize-none outline-none focus:ring-2 focus:ring-primary/40"
        />
        <p className="text-[11px] text-on-surface-variant mt-1 ml-1">
          Tối đa 1000 ký tự. Hồ sơ chỉn chu giúp khách tin tưởng hơn.
        </p>
      </div>

      <FileDropzone
        label="Ảnh đại diện"
        description="Ảnh chân dung rõ nét, mỉm cười tự nhiên. Sẽ hiển thị trên thẻ HDV."
        accept="image/*"
        multiple={false}
      />

      <FileDropzone
        label="Ảnh bìa hồ sơ"
        description="Một ảnh phong cảnh đại diện cho vùng bạn dẫn tour."
        accept="image/*"
        multiple={false}
      />

      <FileDropzone
        label="Album ảnh tour cũ (3–10 ảnh)"
        description="Ảnh chụp các tour bạn đã dẫn — phong cảnh, khoảnh khắc với khách..."
        accept="image/*"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Instagram (tuỳ chọn)"
          placeholder="@username"
          iconLeft="photo_camera"
          tone="highest"
        />
        <Input
          label="Facebook (tuỳ chọn)"
          placeholder="facebook.com/..."
          iconLeft="public"
          tone="highest"
        />
        <div className="md:col-span-2">
          <Input
            label="Video giới thiệu (YouTube/TikTok, tuỳ chọn)"
            placeholder="https://youtu.be/..."
            iconLeft="movie"
            tone="highest"
          />
        </div>
      </div>
    </StepCard>
  )
}

export function Step6Submit() {
  return (
    <StepCard
      {...meta(6)}
      description="Đọc kỹ và xác nhận trước khi gửi hồ sơ cho đội ngũ duyệt."
    >
      <div className="space-y-1 bg-surface-container-lowest/40 rounded-2xl p-2">
        <ToggleRow
          label="Tôi cam kết thông tin và giấy tờ là thật"
          description="Cung cấp giấy tờ giả sẽ bị khoá vĩnh viễn và có thể bị xử lý theo pháp luật."
        />
        <ToggleRow
          label="Tôi đồng ý với Điều khoản dành cho HDV"
          description="Bao gồm chính sách hoa hồng, huỷ tour, đánh giá."
        />
        <ToggleRow
          label="Đồng ý để TravelSocial liên hệ phỏng vấn nếu cần"
          defaultChecked
        />
        <ToggleRow
          label="Cho phép hiển thị hồ sơ trên marketplace sau khi được duyệt"
          defaultChecked
        />
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
        <Icon name="schedule" className="text-primary mt-0.5" />
        <div className="text-sm text-on-surface/85 leading-relaxed">
          Hồ sơ sẽ được duyệt trong <strong>3–5 ngày làm việc</strong>. Bạn sẽ nhận thông báo
          qua email và trên trang Hồ sơ. Nếu cần bổ sung, đội ngũ sẽ liên hệ qua chat.
        </div>
      </div>
    </StepCard>
  )
}
