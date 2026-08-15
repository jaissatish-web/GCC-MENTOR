'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { ALL_DIAL_CODES, PRIMARY_DIAL_CODES, OTHER_DIAL_CODES } from '@/lib/phone'

/**
 * Form primitives for the Career Profile.
 *
 * Three rules, taken from published form research rather than invented:
 *
 *  1. The label sits ABOVE the input, always. Top-aligned labels give the
 *     fastest completion and fewest errors in NN/g's usability testing — the
 *     eye scans straight down instead of repositioning horizontally.
 *  2. A placeholder is an EXAMPLE, never the label. NN/g found placeholder-only
 *     fields raise both error rate and completion time across every demographic
 *     (the text vanishes the moment typing starts, so the user loses the one
 *     thing telling them what the field was), and WCAG treats it the same way.
 *  3. Helper text sits BELOW the input, in the same position an error message
 *     will occupy, so the eye already knows where to look when something goes
 *     wrong — and it does not push the label away from its field.
 *
 * Inputs use a 16px font on mobile because iOS Safari auto-zooms any focused
 * field below 16px, which visibly yanks the page sideways mid-form.
 */

const controlBase =
  'min-h-11 w-full rounded-radius-md border bg-bg-dark px-[15px] py-[13px] text-[16px] sm:text-sm font-medium text-ink-900-dark outline-none transition-colors placeholder:font-normal placeholder:text-ink-400-dark motion-reduce:transition-none'

const controlState = (invalid?: boolean) =>
  invalid
    ? 'border-terra-dark focus:border-terra-dark focus:ring-2 focus:ring-terra-dark/30'
    : 'border-line-dark-strong focus:border-redesign-gold-dark focus:ring-2 focus:ring-redesign-gold-dark/30'

export function FieldShell({
  id,
  label,
  helper,
  error,
  required,
  children,
  className,
}: {
  id: string
  label: string
  helper?: string
  error?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  const helperId = helper ? `${id}-helper` : undefined
  const errorId = error ? `${id}-error` : undefined
  return (
    <div className={cn('flex w-full flex-col gap-1.5 font-redesign-sans', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold leading-snug text-ink-900-dark">
        {label}
        {required ? (
          <span className="ml-1 text-terra-dark" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-1.5 text-[11px] font-normal text-ink-400-dark">Optional</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={errorId} role="alert" className="text-[12px] font-medium text-terra-dark">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="text-[11.5px] leading-relaxed text-ink-400-dark">
          {helper}
        </p>
      ) : null}
    </div>
  )
}

export function TextField({
  id,
  label,
  helper,
  error,
  required,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string
  label: string
  helper?: string
  error?: string
}) {
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} required={required} className={className}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={cn(controlBase, controlState(Boolean(error)))}
        {...props}
      />
    </FieldShell>
  )
}

export function TextAreaField({
  id,
  label,
  helper,
  error,
  required,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  id: string
  label: string
  helper?: string
  error?: string
}) {
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} required={required} className={className}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={cn(controlBase, controlState(Boolean(error)), 'resize-y')}
        {...props}
      />
    </FieldShell>
  )
}

export function SelectField({
  id,
  label,
  helper,
  error,
  required,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  id: string
  label: string
  helper?: string
  error?: string
}) {
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} required={required} className={className}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={cn(controlBase, controlState(Boolean(error)), 'appearance-none pr-9')}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
}

/**
 * Date field.
 *
 * `precision="month"` renders <input type="month"> and `"day"` renders
 * <input type="date"> — both are the platform's own picker, which on mobile is
 * the native wheel rather than a typed string. Month precision is the default
 * for career dates because that is genuinely all a resume states; see
 * lib/partialDates.ts.
 */
export function DateField({
  id,
  label,
  helper,
  error,
  required,
  precision = 'month',
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  id: string
  label: string
  helper?: string
  error?: string
  precision?: 'month' | 'day'
}) {
  return (
    <FieldShell id={id} label={label} helper={helper} error={error} required={required} className={className}>
      <input
        id={id}
        type={precision === 'day' ? 'date' : 'month'}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={cn(
          controlBase,
          controlState(Boolean(error)),
          // Safari/Chrome render the picker indicator dark-on-dark by default.
          '[color-scheme:dark]'
        )}
        {...props}
      />
    </FieldShell>
  )
}

/**
 * Phone field — country-code picker joined to the number.
 *
 * Deliberately a <select> plus one input rather than two free-text boxes.
 * Usability testing on phone fields is consistent that splitting a number
 * across multiple TEXT inputs hurts most on mobile, where users must jump
 * between boxes and the keyboard changes under them; a picker for the code
 * avoids that entirely, guarantees a valid E.164 dial prefix, and still keeps
 * the code visibly separate from the number. The two controls read as one unit
 * because they share a row and a focus treatment.
 */
export function PhoneField({
  id,
  label,
  helper,
  error,
  required,
  dial,
  number,
  onDialChange,
  onNumberChange,
  placeholder,
}: {
  id: string
  label: string
  helper?: string
  error?: string
  required?: boolean
  dial: string
  number: string
  onDialChange: (v: string) => void
  onNumberChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <FieldShell id={`${id}_number`} label={label} helper={helper} error={error} required={required}>
      <div className="flex gap-2">
        <select
          id={`${id}_dial`}
          value={dial}
          onChange={(e) => onDialChange(e.target.value)}
          aria-label={`${label} country code`}
          className={cn(
            controlBase,
            controlState(Boolean(error)),
            'w-[124px] shrink-0 appearance-none px-3'
          )}
        >
          <option value="">Code</option>
          <optgroup label="Common">
            {PRIMARY_DIAL_CODES.map((c) => (
              <option key={c.iso} value={c.dial}>
                {c.dial} {c.country}
              </option>
            ))}
          </optgroup>
          <optgroup label="Other">
            {OTHER_DIAL_CODES.map((c) => (
              <option key={c.iso} value={c.dial}>
                {c.dial} {c.country}
              </option>
            ))}
          </optgroup>
        </select>
        <input
          id={`${id}_number`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={number}
          onChange={(e) => onNumberChange(e.target.value)}
          placeholder={placeholder ?? '50 123 4567'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}_number-error` : helper ? `${id}_number-helper` : undefined}
          className={cn(controlBase, controlState(Boolean(error)), 'flex-1 min-w-0')}
        />
      </div>
    </FieldShell>
  )
}

export { ALL_DIAL_CODES }
