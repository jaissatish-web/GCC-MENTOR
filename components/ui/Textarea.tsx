import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Textarea — labelled multi-line text field. Exported props and tone API are
 * unchanged; visual classes use the redesign token foundation only.
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  tone?: 'light' | 'dark'
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, tone = 'light', ...props }, ref) => {
    const autoId = React.useId()
    const textareaId = id ?? autoId
    const isDark = tone === 'dark'

    return (
      <div className="flex w-full flex-col gap-1.5 font-redesign-sans">
        {label ? (
          <label
            htmlFor={textareaId}
            className={cn('text-sm font-medium', isDark ? 'text-white' : 'text-ink')}
          >
            {label}
          </label>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={cn(
            'min-h-11 w-full resize-y rounded-ctl border px-[15px] py-[13px] font-redesign-sans text-sm font-medium outline-none transition-colors motion-reduce:transition-none',
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
            id={`${textareaId}-error`}
            className={cn('font-redesign-sans text-xs font-medium', isDark ? 'text-terra-dark' : 'text-alert')}
          >
            {error}
          </p>
        ) : null}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
