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
            className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-ink')}
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
            'min-h-11 w-full rounded-ctl border px-[15px] py-[13px] font-redesign-sans text-sm font-medium outline-none transition-colors motion-reduce:transition-none',
            isDark
              ? cn(
                  'bg-canvas text-white placeholder:text-ink-muted',
                  error
                    ? 'border-terra-dark focus:border-terra-dark focus:ring-2 focus:ring-terra-dark/25'
                    : 'border-line-strong focus:border-teal focus:ring-2 focus:ring-teal/25'
                )
              : cn(
                  'bg-white text-ink placeholder:text-ink-muted',
                  error
                    ? 'border-alert focus:border-alert focus:ring-2 focus:ring-alert/20'
                    : 'border-line focus:border-teal focus:ring-2 focus:ring-teal/20'
                ),
            className
          )}
          {...props}
        />
        {error ? (
          <p
            id={`${inputId}-error`}
            className={cn('font-redesign-sans text-xs font-medium', isDark ? 'text-terra-dark' : 'text-alert')}
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
