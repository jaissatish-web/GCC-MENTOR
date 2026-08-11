import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Input — labelled text field. Exported props and the light/dark tone API are
 * unchanged; only the visual token classes use the approved redesign system.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  tone?: 'light' | 'dark'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type = 'text', tone = 'light', ...props }, ref) => {
    const autoId = React.useId()
    const inputId = id ?? autoId
    const isDark = tone === 'dark'

    return (
      <div className="flex w-full flex-col gap-1.5 font-redesign-sans">
        {label ? (
          <label
            htmlFor={inputId}
            className={cn('text-sm font-medium', isDark ? 'text-ink-900-dark' : 'text-ink-900')}
          >
            {label}
          </label>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            'min-h-11 w-full rounded-radius-md border px-[15px] py-[13px] font-redesign-sans text-sm font-medium outline-none transition-colors motion-reduce:transition-none',
            isDark
              ? cn(
                  'bg-bg-dark text-ink-900-dark placeholder:text-ink-400-dark',
                  error
                    ? 'border-terra-dark focus:border-terra-dark focus:ring-2 focus:ring-terra-dark/25'
                    : 'border-line-dark-strong focus:border-redesign-gold-dark focus:ring-2 focus:ring-redesign-gold-dark/25'
                )
              : cn(
                  'bg-surface-light text-ink-900 placeholder:text-ink-400',
                  error
                    ? 'border-terra focus:border-terra focus:ring-2 focus:ring-terra/20'
                    : 'border-line-light focus:border-forest-deep focus:ring-2 focus:ring-forest-deep/20'
                ),
            className
          )}
          {...props}
        />
        {error ? (
          <p
            id={`${inputId}-error`}
            className={cn('font-redesign-sans text-xs font-medium', isDark ? 'text-terra-dark' : 'text-terra')}
          >
            {error}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
