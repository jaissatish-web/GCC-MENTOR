'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { AuthState } from '@/components/auth/types'

/**
 * Auth form (TASK-005) — email + password, provider-neutral.
 *
 * `action` is a server action with signature (prev, formData) => AuthState.
 * The login / signup pages pass their own action, so adding a new auth method
 * (OAuth / OTP) means adding a page-level action and calling it from a new
 * button here — no structural change to this component. We call the action
 * imperatively from a transition rather than rely on useFormState/version.
 */
export type AuthFormAction = (
  prev: AuthState,
  formData: FormData
) => Promise<AuthState>

export function AuthForm({
  action,
  submitLabel,
}: {
  action: AuthFormAction
  submitLabel: string
}) {
  const [state, setState] = useState<AuthState>({})
  const [isPending, startTransition] = useTransition()

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
      <Input label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete={submitLabel === 'Sign in' ? 'current-password' : 'new-password'}
        required
        minLength={6}
        placeholder="••••••••"
      />

      {state?.error ? (
        <p role="alert" className="rounded-lg border border-state-terra-line bg-state-terra-bg px-3 py-2 text-xs text-state-terra-text">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p role="status" className="rounded-lg border border-state-emerald-line bg-state-emerald-bg px-3 py-2 text-xs text-emerald">
          {state.success}
        </p>
      ) : null}

      <Button type="submit" variant="primary" disabled={isPending} className="mt-1 w-full">
        {isPending ? 'Please wait…' : submitLabel}
      </Button>
    </form>
  )
}
