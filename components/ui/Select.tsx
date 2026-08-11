import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Select — labelled dropdown select field. Exported props and tone API are
 * unchanged; visual classes use the redesign token foundation only.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  tone?: 'light' | 'dark'
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, tone = 'light', children, ...props }, ref) => {
    const autoId = React.useId()
    const selectId = id ?? autoId
    const isDark = tone === 'dark'

    return (
      <div className="flex w-full flex-col gap-1.5 font-redesign-sans">
        {label ? (
          <label
            htmlFor={selectId}
            className={cn('text-sm font-medium', isDark ? 'text-ink-900-dark' : 'text-ink-900')}
          >
            {label}
          </label>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${selectId}-error` : undefined}
          className={cn(
            'min-h-11 w-full cursor-pointer appearance-none rounded-radius-md border px-[15px] py-[13px] font-redesign-sans text-sm font-medium outline-none transition-colors motion-reduce:transition-none',
            isDark
              ? cn(
                  'bg-bg-dark text-ink-900-dark',
                  error
                    ? 'border-terra-dark focus:border-terra-dark focus:ring-2 focus:ring-terra-dark/25'
                    : 'border-line-dark-strong focus:border-redesign-gold-dark focus:ring-2 focus:ring-redesign-gold-dark/25'
                )
              : cn(
                  'bg-surface-light text-ink-900',
                  error
                    ? 'border-terra focus:border-terra focus:ring-2 focus:ring-terra/20'
                    : 'border-line-light focus:border-forest-deep focus:ring-2 focus:ring-forest-deep/20'
                ),
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <p
            id={`${selectId}-error`}
            className={cn('font-redesign-sans text-xs font-medium', isDark ? 'text-terra-dark' : 'text-terra')}
          >
            {error}
          </p>
        ) : null}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
