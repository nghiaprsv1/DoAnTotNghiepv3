import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { SocialButton } from '@components/ui/SocialButton'
import { ROUTES } from '@constants/routes'
import { useAuth } from '@hooks/useAuth'

const BG_IMG =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1600&q=80'

const COMMUNITY_AVATARS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&q=80',
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const redirectTo = (location.state as { from?: string } | null)?.from ?? ROUTES.HOME

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const res = await login({ email: email.trim(), password })
      // Admins live exclusively in the Admin Console — bypass the requested
      // redirect (e.g. a public page they tried to reach) and send them home.
      const target = res?.data?.user?.role === 'admin' ? ROUTES.ADMIN : redirectTo
      navigate(target, { replace: true })
    } catch (err) {
      const ax = err as AxiosError<{ message?: string; code?: string; email?: string }>
      const payload = ax.response?.data
      // Unverified accounts: bounce to the OTP screen instead of just erroring.
      if (payload?.code === 'EMAIL_NOT_VERIFIED') {
        navigate(ROUTES.VERIFY_EMAIL, {
          state: { email: payload.email ?? email.trim() },
        })
        return
      }
      setError(payload?.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-3 md:p-4">
      {/* Background image */}
      <div className="fixed inset-0 z-0">
        <img
          src={BG_IMG}
          alt="Ha Long Bay"
          className="w-full h-full object-cover brightness-[0.85] blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-on-surface/40 via-transparent to-primary/10" />
      </div>

      <main className="relative z-10 w-full max-w-[1100px] grid md:grid-cols-2 bg-surface-container-lowest/95 backdrop-blur-md rounded-2xl md:rounded-[2rem] overflow-hidden shadow-editorial-lg">
        {/* Editorial left side */}
        <div className="hidden md:flex flex-col justify-between p-12 editorial-gradient relative overflow-hidden text-on-primary">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-surface-variant/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-on-primary-container/10 rounded-full blur-3xl" />

          <div className="relative z-20">
            <div className="flex items-center gap-2 mb-8">
              <Icon name="explore" className="text-4xl" />
              <span className="font-headline font-extrabold text-2xl italic tracking-tighter">
                Concierge
              </span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-headline font-bold leading-tight mb-6">
              Khám phá <br />
              <span className="text-on-primary-fixed">Việt Nam</span> <br />
              theo cách riêng.
            </h1>
            <p className="text-on-primary/80 max-w-sm leading-relaxed">
              Tham gia cộng đồng du lịch hàng đầu để cùng chia sẻ những hành trình tuyệt vời và tìm
              kiếm cảm hứng cho chuyến đi tiếp theo.
            </p>
          </div>

          <div className="relative z-20 mt-12">
            <div className="flex -space-x-3 mb-4">
              {COMMUNITY_AVATARS.map((src) => (
                <img
                  key={src}
                  src={src}
                  alt="Traveler"
                  className="w-10 h-10 rounded-full border-2 border-primary object-cover"
                />
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-primary bg-primary-fixed-dim flex items-center justify-center text-[10px] font-bold">
                +10k
              </div>
            </div>
            <p className="text-sm font-medium opacity-90 uppercase tracking-widest">
              Đang chờ bạn khám phá
            </p>
          </div>
        </div>

        {/* Form right side */}
        <div className="p-6 sm:p-10 md:p-16 flex flex-col justify-center">
          <header className="mb-6 md:mb-10">
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold text-on-surface mb-1 md:mb-2 tracking-tight">
              Chào mừng trở lại
            </h2>
            <p className="text-sm md:text-base text-on-surface-variant">Đăng nhập vào tài khoản TravelSocial của bạn</p>
          </header>

          <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit} noValidate>
            <Input
              label="Email"
              type="email"
              placeholder="example@gmail.com"
              iconLeft="mail"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label
                  htmlFor="password"
                  className="text-xs font-bold uppercase tracking-widest text-on-surface-variant"
                >
                  Mật khẩu
                </label>
                <Link
                  to={ROUTES.FORGOT_PASSWORD}
                  className="text-xs font-semibold text-primary hover:text-primary-dim transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  iconLeft="lock"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <Icon name={showPwd ? 'visibility_off' : 'visibility'} />
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2 px-4 py-3 rounded-2xl bg-error/10 text-error text-sm font-medium"
              >
                <Icon name="error" size={18} />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 px-1">
              <input
                type="checkbox"
                id="remember"
                className="w-5 h-5 rounded-lg border-outline-variant text-primary focus:ring-primary/20"
              />
              <label htmlFor="remember" className="text-sm text-on-surface-variant select-none">
                Ghi nhớ đăng nhập
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
              Đăng nhập
              <Icon name="arrow_forward" />
            </Button>
          </form>

          <div className="flex items-center gap-4 my-10">
            <div className="h-px flex-1 bg-surface-container-low" />
            <span className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
              Hoặc đăng nhập với
            </span>
            <div className="h-px flex-1 bg-surface-container-low" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SocialButton provider="google" />
            <SocialButton provider="facebook" />
          </div>

          <footer className="mt-12 text-center">
            <p className="text-on-surface-variant">
              Chưa có tài khoản?{' '}
              <Link
                to={ROUTES.REGISTER}
                className="font-bold text-primary hover:underline underline-offset-4 decoration-2"
              >
                Tham gia ngay
              </Link>
            </p>
          </footer>
        </div>
      </main>

      {/* Floating support pill */}
      <div className="fixed bottom-6 right-6 z-20">
        <div className="editorial-blur bg-surface-container-lowest/70 rounded-full px-5 py-2.5 flex items-center gap-3 shadow-editorial">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-on-surface/70 uppercase tracking-widest">
            Hỗ trợ 24/7
          </span>
        </div>
      </div>
    </div>
  )
}
