import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { ROUTES } from '@constants/routes'
import { STEP_INFO, TOTAL_STEPS } from './components/options'
import { Step1Personal, Step2Identity, Step3Experience } from './components/Steps'
import { Step4Coverage, Step5Portfolio, Step6Submit } from './components/StepsTail'
import { cn } from '@utils/cn'

export function GuideApplyPage() {
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)

  const next = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1))
  const prev = () => setStep((s) => Math.max(1, s - 1))

  if (submitted) return <SubmittedView />

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

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (step === TOTAL_STEPS) setSubmitted(true)
          else next()
        }}
        className="space-y-6"
      >
        {step === 1 && <Step1Personal />}
        {step === 2 && <Step2Identity />}
        {step === 3 && <Step3Experience />}
        {step === 4 && <Step4Coverage />}
        {step === 5 && <Step5Portfolio />}
        {step === 6 && <Step6Submit />}

        {/* Navigation */}
        <div className="sticky bottom-4 z-30">
          <div className="flex items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-full shadow-editorial-lg border border-outline-variant/15">
            <button
              type="button"
              onClick={prev}
              disabled={step === 1}
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
              <Button type="submit" size="md" rounded="full">
                <Icon name="send" />
                Gửi hồ sơ
              </Button>
            )}
          </div>
        </div>
      </form>
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
