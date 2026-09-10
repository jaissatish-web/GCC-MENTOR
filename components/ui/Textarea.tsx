import * as React from 'react'
import { cn } from '@/lib/utils'
import { FieldError, FieldHint, FieldLabel } from '@/components/ui/FieldLabel'

/**
 * Textarea — labelled multi-line field. Draws the shared `.field` control.
 * Same props as Input.
 */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  requiredMark?: boolean
  optional?: boolean
  tone?: 'light' | 'dark'
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, requiredMark, optional, id, tone: _tone, ...props }, ref) => {
    const autoId = React.useId()
    const textareaId = id ?? autoId
    const describedBy = error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined

    return (
      <div className="flex w-full flex-col gap-1.5 font-redesign-sans">
        {label ? (
          <FieldLabel htmlFor={textareaId} required={requiredMark} optional={optional}>
            {label}
          </FieldLabel>
        ) : null}
        <textarea
          ref={ref}
          id={textareaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('field', className)}
          {...props}
        />
        {error ? (
          <FieldError id={`${textareaId}-error`}>{error}</FieldError>
        ) : hint ? (
          <FieldHint id={`${textareaId}-hint`}>{hint}</FieldHint>
        ) : null}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
