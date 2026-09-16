'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { AuthState } from '@/components/auth/types'
import { requestPasswordReset } from './actions'

export function ForgotPasswordForm() {
  const [state, setState] = useState<AuthState>({})
  const [isPending, startTransition] = useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      setState(await requestPasswordReset({}, formData))
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" tone="light" />
      {state.error ? (
        <p role="alert" className="rounded-lg border border-alert/40 bg-alert-soft px-3.5 py-2.5 text-[13px] leading-snug text-alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="rounded-lg border border-ok/30 bg-ok-soft px-3.5 py-2.5 text-[13px] leading-snug text-ok">
          {state.success}
        </p>
      ) : null}
      <Button type="submit" variant="primary" disabled={isPending} className="mt-1 w-full text-[14px]">
        {isPending ? 'Please wait…' : state.success ? 'Send another link' : 'Email me a reset link'}
      </Button>
    </form>
  )
}
