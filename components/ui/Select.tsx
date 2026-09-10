import * as React from 'react'
import { cn } from '@/lib/utils'
import { FieldError, FieldHint, FieldLabel } from '@/components/ui/FieldLabel'

/**
 * Select — labelled dropdown. Draws the shared `.field` control, which gives a
 * closed select its chevron (see globals.css). Same props as Input.
 */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  requiredMark?: boolean
  optional?: boolean
  tone?: 'light' | 'dark'
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, requiredMark, optional, id, tone: _tone, children, ...props }, ref) => {
    const autoId = React.useId()
    const selectId = id ?? autoId
    const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined

    return (
      <div className="flex w-full flex-col gap-1.5 font-redesign-sans">
        {label ? (
          <FieldLabel htmlFor={selectId} required={requiredMark} optional={optional}>
            {label}
          </FieldLabel>
        ) : null}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('field', className)}
          {...props}
        >
          {children}
        </select>
        {error ? (
          <FieldError id={`${selectId}-error`}>{error}</FieldError>
        ) : hint ? (
          <FieldHint id={`${selectId}-hint`}>{hint}</FieldHint>
        ) : null}
      </div>
    )
  }
)
Select.displayName = 'Select'

export { Select }
