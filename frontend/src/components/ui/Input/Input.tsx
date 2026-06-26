import { forwardRef } from 'react'
import { cn } from '@utils/cn'
import { Icon } from '../Icon'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  iconLeft?: string
  iconRight?: string
  /** Tonal background variant */
  tone?: 'low' | 'high' | 'highest'
}

const toneStyles = {
  low: 'bg-surface-container-low',
  high: 'bg-surface-container-high',
  highest: 'bg-surface-container-highest',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, iconLeft, iconRight, tone = 'low', className, id, ...props },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {iconLeft && (
            <Icon
              name={iconLeft}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant transition-colors group-focus-within:text-primary"
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // text-base (16px) prevents iOS Safari from zooming on focus.
              'w-full border-none rounded-2xl py-3 md:py-4 pr-4 text-base text-on-surface font-medium',
              'placeholder:text-on-surface-variant/40',
              'focus:ring-2 focus:ring-primary/40 focus:outline-none transition-all',
              toneStyles[tone],
              iconLeft ? 'pl-12' : 'pl-4',
              iconRight && 'pr-12',
              error && 'ring-2 ring-error/40',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {iconRight && (
            <Icon
              name={iconRight}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm text-error ml-1" role="alert">
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="mt-1 text-xs text-on-surface-variant ml-1">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
