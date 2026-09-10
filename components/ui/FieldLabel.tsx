import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * The label above a field, and the hint below it — shared by every control.
 *
 * WHY ONE COMPONENT. The audit on 2026-09-10 found the Career Profile marking
 * required fields three different ways (a red word, a red asterisk, nothing),
 * marking optional ones two ways ("(optional)" in grey, "(optional)" inside the
 * label text), and leaving most fields unmarked either way — so a user could
 * not tell what the form actually needed. Now there is one mark for each.
 *
 * Deliberately not `'use client'`: it holds no state, so server pages can use
 * it too.
 */
export function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
  className,
}: {
  htmlFor?: string
  children: React.ReactNode
  /** The save refuses without it. Shown as a red "Required" tag. */
  required?: boolean
  /** Genuinely skippable. Shown as a quiet "Optional". */
  optional?: boolean
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={cn('field-label flex flex-wrap items-center gap-x-2 gap-y-1', className)}>
      <span>{children}</span>
      {required ? (
        // alert on alert-soft 5.62
        <span className="rounded-full bg-alert-soft px-2 py-0.5 text-[12px] font-semibold leading-none text-alert">
          Required
        </span>
      ) : optional ? (
        <span className="text-[12px] font-normal text-ink-muted">Optional</span>
      ) : null}
    </label>
  )
}

/** The line under a field. The same slot an error takes, so the eye knows where to look. */
export function FieldHint({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="field-hint">
      {children}
    </p>
  )
}

/** A field's error. Replaces the hint rather than stacking under it. */
export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" className="text-[12.5px] font-semibold text-alert">
      {children}
    </p>
  )
}
