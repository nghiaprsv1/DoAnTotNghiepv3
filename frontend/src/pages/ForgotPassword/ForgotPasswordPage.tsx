import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { ROUTES } from '@constants/routes'
import { cn } from '@utils/cn'

const SIDE_IMG =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80'

type Step = 'method' | 'verify' | 'reset' | 'done'

const STEPS: { key: Step; label: string; icon: string }[] = [
  { key: 'method', label: 'Xác minh', icon: 'mail' },
  { key: 'verify', label: 'Mã OTP', icon: 'pin' },
  { key: 'reset', label: 'Mật khẩu mới', icon: 'lock_reset' },
]

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('method')
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [contact, setContact] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const otpValid = otp.every((d) => d.length === 1)
  const passwordValid = password.length >= 8 && password === confirm

  const handleOtpChange = (idx: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return
    const next = [...otp]
    next[idx] = value
    setOtp(next)
    // auto-focus next
    if (value && idx < 5) {
      const el = document.getElementById(`otp-${idx + 1}`) as HTMLInputElement | null
      el?.focus()
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl flex flex-col md:flex-row bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-editorial-lg">
        {/* Left visual */}
        <div className="hidden md:flex md:w-1/2 relative min-h-[640px] overflow-hidden">
          <img src={SIDE_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/85 via-on-surface/30 to-transparent" />
          <div className="absolute bottom-12 left-12 right-12 z-10 text-on-primary">
            <span className="inline-block px-3 py-1 bg-primary-container/30 editorial-blur rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] mb-4">
              Bảo mật tài khoản
            </span>
            <h1 className="font-headline font-extrabold text-5xl leading-tight tracking-tighter mb-4">
              Đừng lo, <br />
              chúng tôi giúp <br />
              bạn lấy lại.
            </h1>
            <p className="text-lg opacity-90 max-w-sm leading-relaxed">
              Bạn sẽ được xác minh qua email hoặc số điện thoại đã đăng ký, và đặt lại mật khẩu trong vài bước.
            </p>
          </div>
        </div>

        {/* Right form */}
        <div className="w-full md:w-1/2 p-8 md:p-14 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <Link
              to={ROUTES.LOGIN}
              className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary mb-6"
            >
              <Icon name="arrow_back" size={16} />
              Về đăng nhập
            </Link>

            {/* Stepper */}
            {step !== 'done' && (
              <ol className="flex items-center gap-2 mb-8">
                {STEPS.map((s, i) => {
                  const idx = STEPS.findIndex((x) => x.key === step)
                  const active = STEPS[idx]?.key === s.key
                  const done = idx > i
                  return (
                    <li key={s.key} className="flex items-center gap-2 flex-1">
                      <span
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold flex-shrink-0',
                          active && 'editorial-gradient text-on-primary shadow-editorial',
                          !active && done && 'bg-primary text-on-primary',
                          !active && !done && 'bg-surface-container-high text-on-surface-variant'
                        )}
                      >
                        {done ? <Icon name="check" size={14} /> : <Icon name={s.icon} size={14} />}
                      </span>
                      <span
                        className={cn(
                          'text-xs font-headline font-bold whitespace-nowrap hidden sm:inline',
                          active ? 'text-on-surface' : 'text-on-surface-variant'
                        )}
                      >
                        {s.label}
                      </span>
                      {i < STEPS.length - 1 && (
                        <span className="flex-1 h-px bg-outline-variant/30" />
                      )}
                    </li>
                  )
                })}
              </ol>
            )}

            {step === 'method' && (
              <>
                <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-2">
                  Quên mật khẩu?
                </h2>
                <p className="text-on-surface-variant mb-6">
                  Chọn cách nhận mã xác minh. Mã có hiệu lực trong 10 phút.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  {(
                    [
                      { key: 'email', icon: 'mail', label: 'Email' },
                      { key: 'phone', icon: 'sms', label: 'SMS' },
                    ] as const
                  ).map((m) => {
                    const active = method === m.key
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => setMethod(m.key)}
                        className={cn(
                          'flex flex-col items-start gap-1 p-4 rounded-2xl border-2 transition text-left',
                          active
                            ? 'border-primary bg-primary/5'
                            : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40'
                        )}
                      >
                        <span
                          className={cn(
                            'w-10 h-10 rounded-xl flex items-center justify-center mb-1',
                            active
                              ? 'editorial-gradient text-on-primary'
                              : 'bg-surface-container-low text-on-surface-variant'
                          )}
                        >
                          <Icon name={m.icon} />
                        </span>
                        <p className="font-headline font-extrabold text-on-surface">{m.label}</p>
                        <p className="text-xs text-on-surface-variant">
                          {m.key === 'email' ? 'Gửi link đặt lại' : 'Gửi mã 6 số'}
                        </p>
                      </button>
                    )
                  })}
                </div>

                <Input
                  label={method === 'email' ? 'Email đã đăng ký' : 'Số điện thoại'}
                  type={method === 'email' ? 'email' : 'tel'}
                  placeholder={method === 'email' ? 'email@vidu.com' : '+84 901 234 567'}
                  iconLeft={method === 'email' ? 'mail' : 'call'}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  tone="highest"
                />

                <Button
                  size="lg"
                  className="w-full mt-6"
                  onClick={() => setStep('verify')}
                  disabled={contact.trim().length < 4}
                >
                  Gửi mã xác minh
                  <Icon name="arrow_forward" />
                </Button>
              </>
            )}

            {step === 'verify' && (
              <>
                <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-2">
                  Nhập mã xác minh
                </h2>
                <p className="text-on-surface-variant mb-6">
                  Mã 6 số đã được gửi đến{' '}
                  <strong className="text-on-surface">{contact || 'email/sđt của bạn'}</strong>.
                </p>

                <div className="grid grid-cols-6 gap-2 mb-3">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      className="aspect-square text-center text-2xl font-extrabold text-on-surface bg-surface-container-highest rounded-2xl outline-none focus:ring-2 focus:ring-primary/40 transition"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant text-center mb-6">
                  Không nhận được mã?{' '}
                  <button type="button" className="text-primary font-bold hover:underline">
                    Gửi lại sau 60s
                  </button>
                </p>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="lg"
                    className="flex-1"
                    onClick={() => setStep('method')}
                  >
                    Quay lại
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    disabled={!otpValid}
                    onClick={() => setStep('reset')}
                  >
                    Xác nhận
                  </Button>
                </div>
              </>
            )}

            {step === 'reset' && (
              <>
                <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-2">
                  Đặt mật khẩu mới
                </h2>
                <p className="text-on-surface-variant mb-6">
                  Mật khẩu mạnh ít nhất 8 ký tự, có chữ và số.
                </p>

                <div className="space-y-4">
                  <Input
                    label="Mật khẩu mới"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    iconLeft="lock"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    tone="highest"
                  />
                  <Input
                    label="Nhập lại mật khẩu"
                    type={showPwd ? 'text' : 'password'}
                    placeholder="••••••••"
                    iconLeft="lock_reset"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    tone="highest"
                  />

                  <label className="inline-flex items-center gap-2 text-sm text-on-surface-variant cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPwd}
                      onChange={(e) => setShowPwd(e.target.checked)}
                      className="accent-primary"
                    />
                    Hiện mật khẩu
                  </label>

                  {password && password.length < 8 && (
                    <p className="text-xs text-error">Mật khẩu phải có ít nhất 8 ký tự.</p>
                  )}
                  {confirm && confirm !== password && (
                    <p className="text-xs text-error">Mật khẩu nhập lại không khớp.</p>
                  )}
                </div>

                <Button
                  size="lg"
                  className="w-full mt-6"
                  disabled={!passwordValid}
                  onClick={() => setStep('done')}
                >
                  <Icon name="check" />
                  Cập nhật mật khẩu
                </Button>
              </>
            )}

            {step === 'done' && (
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-3xl editorial-gradient text-on-primary flex items-center justify-center mx-auto mb-5 shadow-editorial-lg">
                  <Icon name="task_alt" className="text-3xl" />
                </div>
                <h2 className="font-headline text-3xl font-extrabold text-on-surface mb-2">
                  Đã đặt lại mật khẩu
                </h2>
                <p className="text-on-surface-variant mb-8 max-w-sm mx-auto">
                  Bạn có thể đăng nhập ngay với mật khẩu mới. Nếu không phải bạn yêu cầu thay đổi,
                  vui lòng liên hệ hỗ trợ ngay.
                </p>
                <Link to={ROUTES.LOGIN}>
                  <Button size="lg" rounded="full">
                    <Icon name="login" />
                    Đăng nhập ngay
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
