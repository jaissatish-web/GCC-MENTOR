'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/lib/utils'
import type { AuthState } from '@/components/auth/types'

/**
 * Auth form (TASK-005) — email + password, provider-neutral.
 *
 * `action` is a server action with signature (prev, formData) => AuthState.
 * The login / signup pages pass their own action, so adding a new auth method
 * (OAuth / OTP) means adding a page-level action and calling it from a new
 * button here — no structural change to this component. We call the action
 * imperatively from a transition rather than rely on useFormState/version.
 *
 * SUBMIT / VALIDATION LOGIC IS UNCHANGED from before Phase 2 — this pass
 * (2026-08-07) only added the `tone` prop, which affects Input/error/button
 * styling and nothing about how or when the action is called.
 */
export type AuthFormAction = (
  prev: AuthState,
  formData: FormData
) => Promise<AuthState>

export function AuthForm({
  action,
  submitLabel,
  tone = 'light',
}: {
  action: AuthFormAction
  submitLabel: string
  tone?: 'light' | 'dark'
}) {
  const [state, setState] = useState<AuthState>({})
  const [isPending, startTransition] = useTransition()
  const isDark = tone === 'dark'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      // Server actions invoked directly re-enter as a function call; a
      // successful login redirects and never returns to setState.
      const next = await action({}, formData)
      setState(next)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
        tone={tone}
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete={submitLabel === 'Sign in' ? 'current-password' : 'new-password'}
        required
        minLength={6}
        placeholder="••••••••"
        tone={tone}
      />

      {state?.error ? (
        <p
          role="alert"
          className={cn(
            'rounded-lg border px-3.5 py-2.5 text-[12.5px] leading-snug',
            isDark
              ? 'border-terracotta/40 bg-terracotta/10 text-terracotta'
              : 'border-state-terra-line bg-state-terra-bg text-state-terra-text'
          )}
        >
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p
          role="status"
          className={cn(
            'rounded-lg border px-3.5 py-2.5 text-[12.5px] leading-snug',
            isDark
              ? 'border-state-emerald-line/35 bg-emerald/15 text-state-emerald-line'
              : 'border-state-emerald-line bg-state-emerald-bg text-emerald'
          )}
        >
          {state.success}
        </p>
      ) : null}

      <Button
        type="submit"
        variant={isDark ? 'purchase' : 'primary'}
        disabled={isPending}
        className="mt-1 w-full text-[14px]"
      >
        {isPending ? 'Please wait…' : submitLabel}
      </Button>
    </form>
  )
}
