'use client'

import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A password box with a show/hide button — on a phone keyboard, mistyping a
 * password you cannot see is the most common reason sign-up fails.
 * Uses the shared `.field` look; the toggle is a real 44px button.
 */
export function PasswordField({
  label,
  name,
  autoComplete,
  hint,
  minLength = 6,
  invalid,
}: {
  label: string
  name: string
  autoComplete: 'current-password' | 'new-password'
  hint?: string
  minLength?: number
  invalid?: boolean
}) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          minLength={minLength}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={cn('field pr-12')}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? 'Hide password' : 'Show password'}
          aria-pressed={shown}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-ctl text-ink-muted hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal"
        >
          {shown ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
