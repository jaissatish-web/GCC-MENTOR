import * as React from 'react'
import { cn } from '@/lib/utils'
import { FieldError, FieldHint, FieldLabel } from '@/components/ui/FieldLabel'

/**
 * Input — labelled text field.
 *
 * The box itself is the shared `.field` class (globals.css), so this and every
 * hand-written control in the app look the same. `hint`, `requiredMark` and
 * `optional` exist because the profile form had dozens of bare boxes with a
 * label and nothing else — no example, no sign of whether the field mattered.
 *
 * `requiredMark` rather than `required`: the native attribute would make the
 * browser block a form submit with its own bubble, which is a behaviour change.
 * This only SAYS the field is required; the page's own save check enforces it.
 *
 * `tone` is kept so no call site breaks, but both tones now draw the same
 * control. The old dark tone put white text on a light `canvas` fill — it
 * would have been invisible — and nothing used it.
 */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  requiredMark?: boolean
  optional?: boolean
  tone?: 'light' | 'dark'
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, requiredMark, optional, id, type = 'text', tone: _tone, ...props }, ref) => {
    const autoId = React.useId()
    const inputId = id ?? autoId
    const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined

    return (
      <div className="flex w-full flex-col gap-1.5 font-redesign-sans">
        {label ? (
          <FieldLabel htmlFor={inputId} required={requiredMark} optional={optional}>
            {label}
          </FieldLabel>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          type={type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn('field', className)}
          {...props}
        />
        {error ? (
          <FieldError id={`${inputId}-error`}>{error}</FieldError>
        ) : hint ? (
          <FieldHint id={`${inputId}-hint`}>{hint}</FieldHint>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
