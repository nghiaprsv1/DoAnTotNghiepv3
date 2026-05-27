import { cn } from '@utils/cn'

type SocialProvider = 'google' | 'facebook'

interface SocialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  provider: SocialProvider
  /** Full-bleed (w-full) layout. Default: true */
  block?: boolean
}

const labels: Record<SocialProvider, string> = {
  google: 'Google',
  facebook: 'Facebook',
}

function GoogleLogo() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.01.68-2.33 1.09-3.71 1.09-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.87 14.15c-.22-.68-.35-1.4-.35-2.15s.13-1.47.35-2.15V7.01H2.18C1.4 8.58 1 10.27 1 12s.4 3.42 1.18 4.99l3.69-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.01l3.69 2.84c.86-2.59 3.28-4.47 6.13-4.47z"
      />
    </svg>
  )
}

function FacebookLogo() {
  return (
    <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

const Logo: Record<SocialProvider, () => JSX.Element> = {
  google: GoogleLogo,
  facebook: FacebookLogo,
}

/**
 * Tonal social-login button with brand SVG glyph.
 * Usage: <SocialButton provider="google" />
 */
export function SocialButton({
  provider,
  block = true,
  className,
  type = 'button',
  children,
  ...rest
}: SocialButtonProps) {
  const LogoCmp = Logo[provider]
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl',
        'bg-surface-container-low hover:bg-surface-container-high',
        'border border-outline-variant/20',
        'text-sm font-bold text-on-surface transition-colors active:scale-[0.98]',
        'focus:outline-none focus:ring-2 focus:ring-primary/30',
        block && 'w-full',
        className
      )}
      {...rest}
    >
      <LogoCmp />
      <span>{children ?? labels[provider]}</span>
    </button>
  )
}
