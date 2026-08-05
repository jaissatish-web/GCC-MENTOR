import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Input — labelled text field.
 *
 * Radius 12px (rounded-lg), white background, minimum 44px touch target.
 * States per DESIGN.md §4: focus ring in midnight, error in terracotta.
 * Always renders a real <label> when `label` is provided and surfaces errors
 * to assistive tech via aria-invalid / aria-describedby.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, type = 'text', ...props }, ref) => {
    const autoId = React.useId()
    const inputId = id ?? autoId

    return (
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label htmlFor={inputId} className="text-sm font-medium text-midnight">
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
            'min-h-11 w-full rounded-lg border bg-white px-[15px] py-[13px] text-sm font-medium text-midnight outline-none transition-colors placeholder:text-ink-faint',
            error
              ? 'border-terracotta focus:border-terracotta focus:ring-2 focus:ring-terracotta/20'
              : 'border-line focus:border-midnight focus:ring-2 focus:ring-midnight/20',
            className
          )}
          {...props}
        />
        {error ? (
          <p id={`${inputId}-error`} className="text-xs font-medium text-terracotta">
            {error}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
