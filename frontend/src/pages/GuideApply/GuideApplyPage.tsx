import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Input } from '@components/ui/Input'
import { Button } from '@components/ui/Button'
import { ImageUpload, MultiImageUpload } from '@components/common/ImageUpload'
import { ROUTES } from '@constants/routes'
import { ChipSelect } from '../EditProfile/components/ChipSelect'
import { ChipSelectCustom } from './components/ChipSelectCustom'
import { StepCard } from './components/StepCard'
import {
  LANGUAGES,
  REGIONS,
  SPECIALTIES,
  STEP_INFO,
  TOTAL_STEPS,
  TOUR_TYPES,
} from './components/options'
import { guideService } from '@services/guideService'
import { useCurrentUserStore } from '@store/currentUserStore'
import { cn } from '@utils/cn'

interface FormState {
  fullName: string
  phone: string
  email: string
  address: string
  idCardNumber: string
  idCardImage: string
  certificateImages: string[]
  yearsExperience: string
  languages: string[]
  region: string
  regionKeys: string[]
  categoryKeys: string[]
  tourTypes: string[]
  pricePerDay: string
  bio: string
}

const EMPTY: FormState = {
  fullName: '',
  phone: '',
  email: '',
  address: '',
  idCardNumber: '',
  idCardImage: '',
  certificateImages: [],
  yearsExperience: '',
  languages: ['Tiếng Việt'],
  region: '',
  regionKeys: [],
  categoryKeys: [],
  tourTypes: [],
  pricePerDay: '',
  bio: '',
}

export function GuideApplyPage() {
  const navigate = useNavigate()
  const currentUser = useCurrentUserStore()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => ({
    ...EMPTY,
    fullName: currentUser.name ?? '',
    email: currentUser.email ?? '',
  }))

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }))

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))

  /** Per-step input validation. Returns null if OK, otherwise an error string. */
  const validateStep = (n: number): string | null => {
    if (n === 1) {
      if (!form.fullName.trim()) return 'Vui lòng nhập họ và tên.'
      if (!form.phone.trim()) return 'Vui lòng nhập số điện thoại.'
      if (!form.email.trim()) return 'Vui lòng nhập email.'
    }
    if (n === 2) {
      if (!form.idCardNumber.trim()) return 'Vui lòng nhập số CCCD/CMND.'
    }
    if (n === 3) {
      const yrs = Number(form.yearsExperience)
      if (!Number.isFinite(yrs) || yrs < 0) return 'Năm kinh nghiệm không hợp lệ.'
      if (form.languages.length === 0) return 'Chọn ít nhất 1 ngôn ngữ.'
    }
    if (n === 4) {
      if (form.regionKeys.length === 0) return 'Chọn ít nhất 1 vùng phụ trách.'
      if (form.categoryKeys.length === 0) return 'Chọn ít nhất 1 lĩnh vực.'
      const price = Number(form.pricePerDay)
      if (!Number.isFinite(price) || price <= 0) return 'Giá / ngày không hợp lệ.'
    }
    return null
  }

  const submit = async () => {
    setError(null)
    for (let i = 1; i <= TOTAL_STEPS; i += 1) {
      const e = validateStep(i)
      if (e) {
        setError(e)
        setStep(i)
        return
      }
    }
    setSubmitting(true)
    try {
      await guideService.apply({
        region: form.region.trim() || REGIONS.find((r) => r.value === form.regionKeys[0])?.label || 'Việt Nam',
        regionKeys: form.regionKeys,
        categoryKeys: form.categoryKeys,
        languages: form.languages,
        specialties: form.tourTypes,
        bio: form.bio.trim() || undefined,
        yearsExperience: Number(form.yearsExperience) || 0,
        pricePerDay: Number(form.pricePerDay) || 0,
        currency: 'VND',
        idCardNumber: form.idCardNumber.trim(),
        idCardImage: form.idCardImage.trim() || undefined,
        certificateImages: form.certificateImages.length ? form.certificateImages : undefined,
      })
      setSubmitted(true)
    } catch (err) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message ?? 'Không gửi được hồ sơ. Hãy thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return <SubmittedView />

  const onSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    if (step === TOTAL_STEPS) submit()
    else next()
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
      <header className="mb-8">
        <Link
          to={ROUTES.GUIDES}
          className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-4"
        >
          <Icon name="arrow_back" size={18} />
          Quay lại danh sách HDV
        </Link>
        <span className="text-xs font-bold tracking-[0.1em] text-primary uppercase font-headline mb-2 block">
          Trở thành Concierge
        </span>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline text-on-surface">
          Đăng ký làm Hướng dẫn viên
        </h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl">
          Chia sẻ vùng đất bạn yêu, kiếm thu nhập từ đam mê. Hồ sơ sẽ được duyệt trong 3–5 ngày
          làm việc.
        </p>
      </header>

      {/* Stepper */}
      <div className="bg-surface-container-lowest rounded-3xl shadow-editorial p-3 mb-8 overflow-x-auto">
        <ol className="flex items-center gap-1 min-w-max">
          {STEP_INFO.map((s, i) => {
            const idx = i + 1
            const active = step === idx
            const done = step > idx
            return (
              <li key={s.title} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setStep(idx)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-2xl text-sm transition',
                    active && 'bg-primary text-on-primary shadow-editorial',
                    !active && done && 'text-primary',
                    !active && !done && 'text-on-surface-variant hover:bg-surface-container-low'
                  )}
                >
                  <span
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold',
                      active && 'bg-on-primary text-primary',
                      !active && done && 'bg-primary text-on-primary',
                      !active && !done && 'bg-surface-container-high text-on-surface-variant'
                    )}
                  >
                    {done ? <Icon name="check" size={14} /> : idx}
                  </span>
                  <span className="hidden md:inline font-headline font-bold whitespace-nowrap">
                    {s.title}
                  </span>
                </button>
                {idx < TOTAL_STEPS && (
                  <span className="hidden sm:block w-6 h-px bg-outline-variant/30" />
                )}
              </li>
            )
          })}
        </ol>
      </div>

      <form onSubmit={onSubmitForm} className="space-y-6">
        {step === 1 && (
          <StepCard
            step={1}
            totalSteps={TOTAL_STEPS}
            icon={STEP_INFO[0].icon}
            title={STEP_INFO[0].title}
            description="Thông tin sẽ chỉ hiển thị trên hồ sơ HDV của bạn nếu được duyệt."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                iconLeft="person"
                tone="highest"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
              />
              <Input
                label="Số điện thoại"
                type="tel"
                placeholder="+84 901 234 567"
                iconLeft="call"
                tone="highest"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                iconLeft="mail"
                tone="highest"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
              />
              <Input
                label="Địa chỉ thường trú"
                placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh"
                iconLeft="home"
                tone="highest"
                value={form.address}
                onChange={(e) => set('address', e.target.value)}
              />
            </div>
          </StepCard>
        )}

        {step === 2 && (
          <StepCard
            step={2}
            totalSteps={TOTAL_STEPS}
            icon={STEP_INFO[1].icon}
            title={STEP_INFO[1].title}
            description="Cần ít nhất CCCD hoặc Hộ chiếu. Ảnh chụp rõ, không che thông tin."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Số CCCD / CMND"
                placeholder="12 chữ số"
                iconLeft="badge"
                tone="highest"
                value={form.idCardNumber}
                onChange={(e) => set('idCardNumber', e.target.value)}
              />
              <ImageUpload
                label="Ảnh CCCD"
                hint="Chọn ảnh từ máy của bạn. Ảnh chụp rõ, không che thông tin."
                value={form.idCardImage || null}
                onChange={(url) => set('idCardImage', url ?? '')}
                aspect="aspect-[4/3]"
              />
            </div>
          </StepCard>
        )}

        {step === 3 && (
          <StepCard
            step={3}
            totalSteps={TOTAL_STEPS}
            icon={STEP_INFO[2].icon}
            title={STEP_INFO[2].title}
            description="Số năm kinh nghiệm và ngôn ngữ giao tiếp với khách."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Số năm kinh nghiệm"
                type="number"
                min={0}
                max={60}
                iconLeft="schedule"
                tone="highest"
                value={form.yearsExperience}
                onChange={(e) => set('yearsExperience', e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
                Ngôn ngữ giao tiếp
              </p>
              <ChipSelectCustom
                options={LANGUAGES}
                value={form.languages}
                onChange={(v) => set('languages', v)}
                placeholder="Ngôn ngữ khác (vd: Tiếng Đức)…"
              />
            </div>
            <div>
              <MultiImageUpload
                label="Ảnh chứng chỉ / thẻ hành nghề HDV"
                hint="Tải lên ảnh chứng chỉ nghiệp vụ, thẻ HDV hoặc bằng cấp liên quan (tối đa 3 ảnh). Không bắt buộc nhưng giúp hồ sơ được duyệt nhanh hơn."
                value={form.certificateImages}
                onChange={(urls) => set('certificateImages', urls)}
                max={3}
              />
            </div>
          </StepCard>
        )}

        {step === 4 && (
          <StepCard
            step={4}
            totalSteps={TOTAL_STEPS}
            icon={STEP_INFO[3].icon}
            title={STEP_INFO[3].title}
            description="Vùng nào bạn dẫn được, làm tour kiểu gì, giá bao nhiêu?"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
                Vùng phụ trách (chọn nhiều)
              </p>
              <ChipSelect
                options={REGIONS}
                value={form.regionKeys}
                onChange={(v) => set('regionKeys', v)}
              />
            </div>
            <Input
              label="Khu vực cụ thể"
              placeholder="VD: Sapa, Y Tý, Hà Giang, Mộc Châu..."
              iconLeft="location_on"
              tone="highest"
              value={form.region}
              onChange={(e) => set('region', e.target.value)}
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
                Chuyên môn / Lĩnh vực
              </p>
              <ChipSelectCustom
                options={SPECIALTIES}
                value={form.categoryKeys}
                onChange={(v) => set('categoryKeys', v)}
                placeholder="Lĩnh vực khác (vd: Cắm trại)…"
              />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 ml-1">
                Loại tour cung cấp
              </p>
              <ChipSelect
                options={TOUR_TYPES}
                value={form.tourTypes}
                onChange={(v) => set('tourTypes', v)}
              />
            </div>
            <Input
              label="Giá đề xuất / ngày (VND)"
              type="number"
              min={0}
              placeholder="850000"
              iconLeft="payments"
              tone="highest"
              value={form.pricePerDay}
              onChange={(e) => set('pricePerDay', e.target.value)}
            />
          </StepCard>
        )}

        {step === 5 && (
          <StepCard
            step={5}
            totalSteps={TOTAL_STEPS}
            icon={STEP_INFO[4].icon}
            title={STEP_INFO[4].title}
            description="Giới thiệu bản thân — sẽ hiển thị công khai trên hồ sơ HDV của bạn."
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1">
                Giới thiệu bản thân
              </label>
              <textarea
                rows={6}
                maxLength={1000}
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
                placeholder="Kể về bạn — bạn là ai, lý do bạn yêu công việc dẫn tour, điều khiến bạn khác biệt..."
                className="w-full bg-surface-container-highest border-none rounded-2xl px-4 py-3 text-on-surface font-medium resize-none outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-[11px] text-on-surface-variant mt-1 ml-1">
                {form.bio.length} / 1000 ký tự.
              </p>
            </div>
          </StepCard>
        )}

        {step === 6 && (
          <StepCard
            step={6}
            totalSteps={TOTAL_STEPS}
            icon={STEP_INFO[5].icon}
            title={STEP_INFO[5].title}
            description="Đọc kỹ và xác nhận trước khi gửi hồ sơ cho đội ngũ duyệt."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <ReviewRow label="Họ và tên" value={form.fullName} />
              <ReviewRow label="SĐT" value={form.phone} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="CCCD" value={form.idCardNumber} />
              <ReviewRow
                label="Ảnh chứng chỉ"
                value={
                  form.certificateImages.length
                    ? `${form.certificateImages.length} ảnh`
                    : 'Chưa tải lên'
                }
              />
              <ReviewRow label="Kinh nghiệm" value={`${form.yearsExperience || 0} năm`} />
              <ReviewRow label="Giá / ngày" value={`${Number(form.pricePerDay || 0).toLocaleString('vi-VN')} VND`} />
              <ReviewRow label="Vùng" value={form.regionKeys.join(', ') || '—'} />
              <ReviewRow label="Lĩnh vực" value={form.categoryKeys.join(', ') || '—'} />
              <ReviewRow label="Loại tour" value={form.tourTypes.join(', ') || '—'} />
              <ReviewRow label="Ngôn ngữ" value={form.languages.join(', ') || '—'} />
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
              <Icon name="schedule" className="text-primary mt-0.5" />
              <div className="text-sm text-on-surface/85 leading-relaxed">
                Hồ sơ sẽ được duyệt trong <strong>3–5 ngày làm việc</strong>. Bạn sẽ nhận thông
                báo qua email và trên trang Hồ sơ.
              </div>
            </div>
          </StepCard>
        )}

        {error && (
          <div className="rounded-2xl bg-error/10 border border-error/20 px-4 py-3 text-error text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="sticky bottom-4 z-30">
          <div className="flex items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-full shadow-editorial-lg border border-outline-variant/15">
            <button
              type="button"
              onClick={prev}
              disabled={step === 1 || submitting}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-headline font-bold text-on-surface hover:bg-surface-container-low disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Icon name="arrow_back" size={18} />
              <span className="hidden sm:inline">Quay lại</span>
            </button>

            <p className="hidden sm:block text-xs text-on-surface-variant">
              Bước <strong className="text-primary">{step}</strong> / {TOTAL_STEPS}
            </p>

            {step < TOTAL_STEPS ? (
              <Button type="submit" size="md" rounded="full">
                Tiếp tục
                <Icon name="arrow_forward" />
              </Button>
            ) : (
              <Button type="submit" size="md" rounded="full" disabled={submitting}>
                <Icon name="send" />
                {submitting ? 'Đang gửi…' : 'Gửi hồ sơ'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-container-low rounded-2xl px-3 py-2">
      <p className="text-[10px] uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="font-headline font-bold text-on-surface text-sm truncate">
        {value || '—'}
      </p>
    </div>
  )
}

function SubmittedView() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16 md:py-24 text-center">
      <div className="w-20 h-20 rounded-3xl editorial-gradient text-on-primary flex items-center justify-center mx-auto mb-6 shadow-editorial-lg">
        <Icon name="task_alt" className="text-4xl" />
      </div>
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight font-headline text-on-surface mb-3">
        Đã gửi hồ sơ
      </h1>
      <p className="text-on-surface-variant max-w-md mx-auto mb-8 leading-relaxed">
        Cảm ơn bạn đã muốn đồng hành cùng TravelSocial. Đội ngũ sẽ duyệt hồ sơ trong{' '}
        <strong>3–5 ngày làm việc</strong> và phản hồi qua email & trên trang hồ sơ.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {[
          { icon: 'inventory_2', label: 'Đã nhận hồ sơ', active: true },
          { icon: 'fact_check', label: 'Đang duyệt' },
          { icon: 'celebration', label: 'Trở thành HDV' },
        ].map((s, i) => (
          <div
            key={s.label}
            className={cn(
              'p-4 rounded-2xl border',
              s.active
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-surface-container-low border-outline-variant/15 text-on-surface-variant'
            )}
          >
            <Icon name={s.icon} className="text-2xl mb-1" />
            <p className="text-xs font-bold uppercase tracking-widest">
              {i + 1}. {s.label}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link to={ROUTES.PROFILE}>
          <Button size="lg" rounded="full">
            <Icon name="person" />
            Về hồ sơ của tôi
          </Button>
        </Link>
        <Link to={ROUTES.GUIDES}>
          <Button variant="secondary" size="lg" rounded="full">
            Khám phá HDV khác
          </Button>
        </Link>
      </div>
    </div>
  )
}
