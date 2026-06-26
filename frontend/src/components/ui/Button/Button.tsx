import { cn } from '@utils/cn'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gradient' | 'primary' | 'secondary' | 'tertiary' | 'danger' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  children: React.ReactNode
  rounded?: 'md' | 'lg' | 'xl' | 'full'
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  // Signature CTA — editorial gradient
  gradient:
    'editorial-gradient text-on-primary shadow-editorial hover:shadow-editorial-lg focus:ring-primary/40',
  primary: 'bg-primary text-on-primary hover:bg-primary-dim focus:ring-primary/40',
  secondary:
    'bg-surface-container-high text-primary hover:bg-surface-container-highest focus:ring-primary/30',
  tertiary: 'bg-transparent text-primary hover:bg-surface-container-low focus:ring-primary/30',
  danger: 'bg-error text-on-error hover:bg-error-dim focus:ring-error/40',
  outline:
    'border-2 border-primary text-primary hover:bg-primary hover:text-on-primary focus:ring-primary/30',
  ghost: 'bg-transparent text-on-surface hover:bg-surface-container-low focus:ring-primary/20',
}

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
}

const roundedStyles = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full',
}

export function Button({
  variant = 'gradient',
  size = 'md',
  rounded = 'full',
  isLoading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 font-headline font-bold transition-all',
        'focus:outline-none focus:ring-2 focus:ring-offset-0',
        'disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]',
        variantStyles[variant],
        sizeStyles[size],
        roundedStyles[rounded],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
