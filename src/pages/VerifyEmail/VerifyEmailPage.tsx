import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { ROUTES } from '@constants/routes'
import { useAuth } from '@hooks/useAuth'
import { authService } from '@services/authService'

const SIDE_IMG =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80'

const CODE_LENGTH = 6
const RESEND_COOLDOWN = 60

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyEmail } = useAuth()

  // Email comes from the register/login redirect (state first, then ?email=).
  const params = new URLSearchParams(location.search)
  const email =
    (location.state as { email?: string } | null)?.email ?? params.get('email') ?? ''

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  // Without an email there's nothing to verify — send the user back to register.
  useEffect(() => {
    if (!email) navigate(ROUTES.REGISTER, { replace: true })
  }, [email, navigate])

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [cooldown])

  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  const code = digits.join('')

  const setDigit = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '')
    if (!clean) {
      setDigits((prev) => prev.map((d, i) => (i === index ? '' : d)))
      return
    }
    // Support paste of the whole code into one box.
    if (clean.length > 1) {
      const chars = clean.slice(0, CODE_LENGTH).split('')
      const next = Array(CODE_LENGTH)
        .fill('')
        .map((_, i) => chars[i] ?? '')
      setDigits(next)
      inputsRef.current[Math.min(chars.length, CODE_LENGTH - 1)]?.focus()
      return
    }
    setDigits((prev) => prev.map((d, i) => (i === index ? clean : d)))
    if (index < CODE_LENGTH - 1) inputsRef.current[index + 1]?.focus()
  }

  const onKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const submit = async (value: string) => {
    if (submitting) return
    if (value.length !== CODE_LENGTH) {
      setError('Vui lòng nhập đủ 6 chữ số.')
      return
    }
    setError(null)
    setInfo(null)
    setSubmitting(true)
    try {
      await verifyEmail(email, value)
      navigate(ROUTES.HOME, { replace: true })
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      setError(ax.response?.data?.message ?? 'Xác thực thất bại. Vui lòng thử lại.')
      setDigits(Array(CODE_LENGTH).fill(''))
      inputsRef.current[0]?.focus()
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setError(null)
    setInfo(null)
    try {
      await authService.resendVerification(email)
      setInfo('Đã gửi lại mã xác thực. Vui lòng kiểm tra hộp thư (cả mục Spam).')
      setCooldown(RESEND_COOLDOWN)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      setError(ax.response?.data?.message ?? 'Không gửi lại được mã. Vui lòng thử lại.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-3 md:p-8">
      <div className="w-full max-w-6xl flex flex-col md:flex-row bg-surface-container-lowest rounded-2xl md:rounded-[2rem] overflow-hidden shadow-editorial-lg relative">
        {/* Visual side */}
        <div className="hidden md:flex md:w-1/2 relative min-h-[640px] overflow-hidden">
          <img src={SIDE_IMG} alt="TripMate" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent" />
          <div className="absolute bottom-12 left-12 right-12 z-10 text-on-primary">
            <span className="inline-block px-3 py-1 bg-primary-container/30 editorial-blur rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] mb-4">
              Bảo mật tài khoản
            </span>
            <h1 className="font-headline font-extrabold text-4xl leading-tight tracking-tighter mb-4">
              Chỉ còn <br /> một bước nữa.
            </h1>
            <p className="text-lg opacity-90 max-w-sm leading-relaxed">
              Xác thực email giúp bảo vệ tài khoản và đảm bảo bạn nhận được thông báo chuyến đi quan trọng.
            </p>
          </div>
        </div>

        {/* Form side */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-16 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="flex items-center gap-2 mb-6 md:mb-10">
              <div className="w-8 h-8 rounded-lg editorial-gradient flex items-center justify-center shadow-md">
                <Icon name="mark_email_read" className="text-on-primary text-lg fill" />
              </div>
              <span className="font-headline text-2xl font-extrabold text-on-surface tracking-tighter italic">
                Concierge
              </span>
            </div>

            <div className="mb-6 md:mb-8">
              <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-2">
                Xác thực email
              </h2>
              <p className="text-sm md:text-base text-on-surface-variant font-medium">
                Chúng tôi đã gửi mã gồm 6 chữ số tới{' '}
                <span className="font-bold text-on-surface">{email}</span>. Nhập mã để hoàn tất đăng ký.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                submit(code)
              }}
              noValidate
            >
              <div className="flex justify-between gap-2 mb-5" dir="ltr">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => (inputsRef.current[i] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={CODE_LENGTH}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKeyDown(i, e)}
                    disabled={submitting}
                    className="w-full aspect-square text-center text-2xl font-headline font-extrabold rounded-2xl bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-surface-container outline-none transition disabled:opacity-50"
                  />
                ))}
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-error/10 text-error text-sm font-medium mb-4"
                >
                  <Icon name="error" size={18} />
                  <span>{error}</span>
                </div>
              )}
              {info && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Icon name="check_circle" size={18} />
                  <span>{info}</span>
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                isLoading={submitting}
                disabled={code.length !== CODE_LENGTH}
              >
                Xác thực
                <Icon name="arrow_forward" />
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-on-surface-variant">
                Chưa nhận được mã?{' '}
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={cooldown > 0}
                  className="text-primary font-extrabold hover:underline disabled:opacity-50 disabled:no-underline disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Gửi lại sau ${cooldown}s` : 'Gửi lại mã'}
                </button>
              </p>
            </div>

            <div className="mt-8 pt-8 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-surface-container-low rounded-full" />
              <p className="text-center text-on-surface-variant font-medium">
                Sai email?
                <Link
                  to={ROUTES.REGISTER}
                  className="text-primary font-extrabold hover:underline underline-offset-4 ml-1"
                >
                  Đăng ký lại
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
