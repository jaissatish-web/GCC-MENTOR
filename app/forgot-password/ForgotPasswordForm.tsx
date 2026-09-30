'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Notice } from '@/components/auth/Notice'
import type { AuthState } from '@/components/auth/types'
import { requestPasswordReset } from './actions'

/**
 * The same answer whether or not the account exists (see ./actions.ts): the
 * screen says "if an account exists", never "we found you".
 */
export function ForgotPasswordForm() {
  const [state, setState] = useState<AuthState>({})
  const [isPending, startTransition] = useTransition()

  function send(formData: FormData) {
    startTransition(async () => {
      setState(await requestPasswordReset({}, formData))
    })
  }

  if (state.kind === 'check_email' && state.email) {
    const again = new FormData()
    again.set('email', state.email)
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="mail" title="Check your email">
          If an account exists for <b className="break-all text-ink">{state.email}</b>, a link to set a new password is on
          its way. Open it to set a new password. Check spam or promotions if it hasn’t arrived in a few minutes.
        </Notice>
        <Button type="button" variant="secondary" className="w-full" disabled={isPending} onClick={() => send(again)}>
          {isPending ? 'Sending…' : 'Send the link again'}
        </Button>
        <div className="flex items-center justify-between gap-3 text-[14px]">
          <button type="button" onClick={() => setState({})} className="min-h-11 font-semibold text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            Use a different email
          </button>
          <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-teal hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        send(new FormData(event.currentTarget))
      }}
      className="flex flex-col gap-4"
    >
      <Input label="Email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
      {state.error ? <Notice tone="error">{state.error}</Notice> : null}
      <Button type="submit" variant="primary" disabled={isPending} className="mt-1 w-full text-[15px]">
        {isPending ? 'Please wait…' : 'Email me a reset link'}
      </Button>
      <Link href="/login" className="inline-flex min-h-11 items-center justify-center text-[14px] font-semibold text-teal hover:underline">
        Back to sign in
      </Link>
    </form>
  )
}
