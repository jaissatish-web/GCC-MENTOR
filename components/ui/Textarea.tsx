import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Textarea — labelled multi-line text field.
 *
 * `tone="light"` (default, unchanged): white background, border-line,
 * midnight focus ring — the original DESIGN.md §4 field styling.
 *
 * `tone="dark"` (new, 2026-08-07 Phase 2): dark-surface variant for the
 * redesigned auth pages — void background, hairline border, gold focus ring.
 * Opt-in only; every existing call site is unaffected.
 *
 * Resizable vertically by default (no resize-none applied), accepting a
 * `rows` prop passed through normally to control initial height.
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
      <div className="flex w-full flex-col gap-1.5">
        {label ? (
          <label
            htmlFor={textareaId}
            className={cn('text-sm font-medium', isDark ? 'text-marble/85' : 'text-midnight')}
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
            'min-h-11 w-full rounded-lg border px-[15px] py-[13px] text-sm font-medium outline-none transition-colors motion-reduce:transition-none resize-y',
            isDark
              ? cn(
                  'bg-void/60 text-marble placeholder:text-marble/30',
                  error
                    ? 'border-terracotta focus:border-terracotta focus:ring-2 focus:ring-terracotta/25'
                    : 'border-hairline focus:border-gold focus:ring-2 focus:ring-gold/25'
                )
              : cn(
                  'bg-white text-midnight placeholder:text-ink-faint',
                  error
                    ? 'border-terracotta focus:border-terracotta focus:ring-2 focus:ring-terracotta/20'
                    : 'border-line focus:border-midnight focus:ring-2 focus:ring-midnight/20'
                ),
            className
          )}
          {...props}
        />
        {error ? (
          <p
            id={`${textareaId}-error`}
            className={cn('text-xs font-medium', isDark ? 'text-terracotta' : 'text-terracotta')}
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
