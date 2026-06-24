import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AxiosError } from 'axios'
import { Icon } from '@components/ui/Icon'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { SocialButton } from '@components/ui/SocialButton'
import { ROUTES } from '@constants/routes'
import { useAuth } from '@hooks/useAuth'

const SIDE_IMG =
  'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agree, setAgree] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    if (!name.trim() || !email.trim() || !password) {
      setError('Vui lòng điền đủ họ tên, email và mật khẩu.')
      return
    }
    if (password.length < 6) {
      setError('Mật khẩu cần ít nhất 6 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Hai mật khẩu không trùng nhau.')
      return
    }
    if (!agree) {
      setError('Bạn cần đồng ý với điều khoản để tiếp tục.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        confirmPassword,
      })
      // Account created but not yet active — go confirm the email OTP.
      navigate(ROUTES.VERIFY_EMAIL, {
        replace: true,
        state: { email: email.trim() },
      })
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      setError(ax.response?.data?.message ?? 'Đăng ký thất bại. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-3 md:p-8">
      <div className="w-full max-w-6xl flex flex-col md:flex-row bg-surface-container-lowest rounded-2xl md:rounded-[2rem] overflow-hidden shadow-editorial-lg relative">
        {/* Visual side */}
        <div className="hidden md:flex md:w-1/2 relative min-h-[700px] overflow-hidden">
          <img src={SIDE_IMG} alt="Sapa" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-on-surface/80 via-transparent to-transparent" />

          <div className="absolute bottom-12 left-12 right-12 z-10 text-on-primary">
            <span className="inline-block px-3 py-1 bg-primary-container/30 editorial-blur rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] mb-4">
              Concierge Choice
            </span>
            <h1 className="font-headline font-extrabold text-5xl leading-tight tracking-tighter mb-4">
              Khám phá <br /> hành trình <br /> của bạn.
            </h1>
            <p className="text-lg opacity-90 max-w-sm leading-relaxed">
              Tham gia cộng đồng TravelSocial để lưu lại những khoảnh khắc đáng nhớ và kết nối với
              những tâm hồn đồng điệu.
            </p>
          </div>

          <div className="absolute top-8 left-8 p-4 bg-white/10 editorial-blur border border-white/20 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-primary">
              <Icon name="explore" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-white/70">Cộng đồng</p>
              <p className="text-sm font-semibold text-white">+50k Thành viên</p>
            </div>
          </div>
        </div>

        {/* Form side */}
        <div className="w-full md:w-1/2 p-6 sm:p-10 md:p-16 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="flex items-center gap-2 mb-6 md:mb-10">
              <div className="w-8 h-8 rounded-lg editorial-gradient flex items-center justify-center shadow-md">
                <Icon name="travel_explore" className="text-on-primary text-lg fill" />
              </div>
              <span className="font-headline text-2xl font-extrabold text-on-surface tracking-tighter italic">
                Concierge
              </span>
            </div>

            <div className="mb-6 md:mb-10">
              <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-1 md:mb-2">
                Đăng ký tài khoản
              </h2>
              <p className="text-sm md:text-base text-on-surface-variant font-medium">
                Bắt đầu chuyến phiêu lưu của bạn cùng chúng tôi.
              </p>
            </div>

            <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit} noValidate>
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                iconLeft="person"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="email@vidu.com"
                iconLeft="mail"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Mật khẩu"
                  type="password"
                  placeholder="••••••••"
                  iconLeft="lock"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={submitting}
                  minLength={6}
                  required
                />
                <Input
                  label="Xác nhận"
                  type="password"
                  placeholder="••••••••"
                  iconLeft="verified_user"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  minLength={6}
                  required
                />
              </div>

              <div className="flex items-start gap-3 py-2">
                <input
                  id="terms"
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  disabled={submitting}
                  className="mt-1 w-5 h-5 rounded-md border-outline-variant text-primary focus:ring-primary"
                />
                <label htmlFor="terms" className="text-sm text-on-surface-variant leading-relaxed">
                  Tôi đồng ý với{' '}
                  <a href="#" className="text-primary font-bold hover:underline">
                    Điều khoản sử dụng
                  </a>{' '}
                  và{' '}
                  <a href="#" className="text-primary font-bold hover:underline">
                    Chính sách bảo mật
                  </a>{' '}
                  của TravelSocial.
                </label>
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

              <Button type="submit" size="lg" className="w-full" isLoading={submitting}>
                Tạo tài khoản
                <Icon name="arrow_forward" />
              </Button>
            </form>

            <div className="mt-8 pt-8 relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-surface-container-low rounded-full" />
              <p className="text-center text-on-surface-variant font-medium">
                Bạn đã có tài khoản?
                <Link
                  to={ROUTES.LOGIN}
                  className="text-primary font-extrabold hover:underline underline-offset-4 ml-1"
                >
                  Đăng nhập ngay
                </Link>
              </p>
            </div>

            <div className="mt-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px flex-grow bg-outline-variant/20" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/50">
                  Hoặc tiếp tục với
                </span>
                <div className="h-px flex-grow bg-outline-variant/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <SocialButton provider="google" />
                <SocialButton provider="facebook" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support footer (desktop only) */}
      <div className="fixed bottom-6 left-6 right-6 hidden lg:flex justify-between items-center text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40 pointer-events-none">
        <div className="flex gap-8 pointer-events-auto">
          <a href="#" className="hover:text-primary transition-colors">
            Hỗ trợ
          </a>
          <a href="#" className="hover:text-primary transition-colors">
            Ngôn ngữ
          </a>
          <a href="#" className="hover:text-primary transition-colors">
            Về chúng tôi
          </a>
        </div>
        <p>© 2024 TravelSocial Concierge</p>
      </div>
    </main>
  )
}
