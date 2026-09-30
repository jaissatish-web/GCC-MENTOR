'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Notice } from '@/components/auth/Notice'
import { PasswordField } from '@/components/auth/PasswordField'
import type { AuthState } from '@/components/auth/types'

/**
 * Auth form — sign in and sign up (TASK-005; redesigned 2026-09-30).
 *
 * `action` is a server action (prev, formData) => AuthState. The page passes
 * its own action, so a new method (OAuth / OTP) is a new action plus a button,
 * not a restructure.
 *
 * Sign-up asks for the password twice and checks the two match before anything
 * is sent (the server checks again). After sign-up with email confirmation on,
 * the form becomes a "check your inbox" screen naming the address, with a
 * resend button and a way to use a different email.
 */
export type AuthFormAction = (prev: AuthState, formData: FormData) => Promise<AuthState>

export const MIN_PASSWORD = 6

export function AuthForm({
  mode,
  action,
  resend,
  redirectTo,
}: {
  mode: 'signin' | 'signup'
  action: AuthFormAction
  /** Resends the sign-up confirmation email. */
  resend?: (email: string) => Promise<AuthState>
  /** Where to go after success. Re-validated by the server action (lib/safeRedirect.ts). */
  redirectTo?: string | null
}) {
  const [state, setState] = useState<AuthState>({})
  const [clientError, setClientError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const signup = mode === 'signup'

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setClientError(null)
    if (signup) {
      const password = String(formData.get('password') ?? '')
      const confirm = String(formData.get('confirmPassword') ?? '')
      if (password.length < MIN_PASSWORD) return setClientError(`Use at least ${MIN_PASSWORD} characters for your password.`)
      if (password !== confirm) return setClientError('The two passwords don’t match. Please type them again.')
    }
    startTransition(async () => {
      // A successful sign-in redirects on the server and never returns here.
      setState(await action({}, formData))
    })
  }

  async function doResend(email: string) {
    if (!resend) return
    setResendState('sending')
    const r = await resend(email)
    setResendState(r.error ? 'error' : 'sent')
  }

  // ── "Check your inbox" — after sign-up when email confirmation is on ──
  if (state.kind === 'check_email' && state.email) {
    return (
      <div className="flex flex-col gap-4">
        <Notice tone="mail" title="Check your inbox">
          We sent a confirmation link to <b className="break-all text-ink">{state.email}</b>. Open it to activate your
          account — it can take a minute. Check spam or promotions if you don’t see it.
        </Notice>
        {resend ? (
          <Button type="button" variant="secondary" className="w-full" disabled={resendState === 'sending' || resendState === 'sent'} onClick={() => void doResend(state.email!)}>
            {resendState === 'sending' ? 'Sending…' : resendState === 'sent' ? 'Sent again — check your inbox' : 'Resend the email'}
          </Button>
        ) : null}
        {resendState === 'error' ? <Notice tone="error">We couldn’t resend just now. Please wait a minute and try again.</Notice> : null}
        <button
          type="button"
          onClick={() => {
            setState({})
            setResendState('idle')
          }}
          className="min-h-11 text-[14px] font-semibold text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          Use a different email
        </button>
      </div>
    )
  }

  const error = clientError ?? state.error

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}
      <Input label="Email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
      <PasswordField
        label="Password"
        name="password"
        autoComplete={signup ? 'new-password' : 'current-password'}
        minLength={MIN_PASSWORD}
        hint={signup ? `At least ${MIN_PASSWORD} characters. Longer, with letters and numbers, is safer.` : undefined}
      />
      {signup ? (
        <PasswordField label="Confirm password" name="confirmPassword" autoComplete="new-password" minLength={MIN_PASSWORD} invalid={Boolean(clientError?.includes('match'))} />
      ) : (
        <div className="-mt-2 flex justify-end">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-11 items-center px-1 text-[13.5px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Forgot password?
          </Link>
        </div>
      )}

      {error ? (
        <Notice tone="error">
          {error}
          {state.kind === 'exists' ? (
            <>
              {' '}
              <Link href="/login" className="font-semibold text-teal underline">
                Go to sign in
              </Link>
            </>
          ) : null}
          {state.kind === 'credentials' ? (
            <>
              {' '}
              <Link href="/forgot-password" className="font-semibold text-teal underline">
                Reset password
              </Link>
            </>
          ) : null}
        </Notice>
      ) : null}
      {state.kind === 'unconfirmed' && state.email && resend ? (
        <Button type="button" variant="secondary" className="w-full" disabled={resendState === 'sending' || resendState === 'sent'} onClick={() => void doResend(state.email!)}>
          {resendState === 'sent' ? 'Confirmation email sent' : resendState === 'sending' ? 'Sending…' : 'Resend the confirmation email'}
        </Button>
      ) : null}
      {state.success ? <Notice tone="success">{state.success}</Notice> : null}

      <Button type="submit" variant="primary" disabled={isPending} className="mt-1 w-full text-[15px]">
        {isPending ? 'Please wait…' : signup ? 'Create my account' : 'Sign in'}
      </Button>
    </form>
  )
}
