'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthShell } from '@/components/auth/AuthShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'

/**
 * /auth/update-password — step 3 of password recovery (audit M03, 2026-09-15).
 *
 * Reached from the emailed reset link, which /auth/callback (PKCE) or the login
 * page's hash handler (implicit flow) has already turned into a session. With no
 * session the link expired or was used — say so and offer a new one, rather
 * than showing a form that cannot work.
 *
 * Minimum length matches sign-up (6). Raising it, and turning on Supabase's
 * leaked-password protection, is a founder decision recorded in
 * docs/SAAS_RELEASE_CHECKLIST.md.
 */
const MIN_LENGTH = 6

type Phase = 'checking' | 'ready' | 'no_session' | 'saving' | 'done'

export default function UpdatePasswordPage() {
  const [phase, setPhase] = useState<Phase>('checking')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setPhase(data.user ? 'ready' : 'no_session'))
      .catch(() => setPhase('no_session'))
  }, [])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirm = String(form.get('confirm') ?? '')
    setError(null)
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
    if (password !== confirm) return setError('The two passwords do not match.')

    setPhase('saving')
    const { error: updateError } = await createClient().auth.updateUser({ password })
    if (updateError) {
      setPhase('ready')
      setError(
        /session|jwt|expired/i.test(updateError.message)
          ? 'This reset link has expired. Ask for a new one below.'
          : updateError.message,
      )
      return
    }
    setPhase('done')
    // Full reload so middleware and server components see the session.
    window.setTimeout(() => window.location.assign('/dashboard'), 1200)
  }

  return (
    <AuthShell headline="Set a new password." body="Choose a password you have not used elsewhere. You stay signed in on this device.">
      <Card tone="light" className="flex w-full flex-col gap-1 p-8">
        <h1 className="font-display text-[26px] text-ink">New password</h1>
        {phase === 'checking' ? (
          <p role="status" className="mt-3 text-[14px] text-ink-muted">Checking your reset link…</p>
        ) : phase === 'no_session' ? (
          <div className="mt-3 flex flex-col gap-4">
            <p role="alert" className="rounded-lg border border-alert/40 bg-alert-soft px-3.5 py-2.5 text-[13px] leading-snug text-alert">
              This reset link has expired or was already used.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal px-4 text-[14px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
            >
              Send me a new link
            </Link>
          </div>
        ) : phase === 'done' ? (
          <p role="status" className="mt-3 rounded-lg border border-ok/30 bg-ok-soft px-3.5 py-2.5 text-[13px] leading-snug text-ok">
            Password updated. Taking you to your dashboard…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-4">
            <Input label="New password" name="password" type="password" autoComplete="new-password" required minLength={MIN_LENGTH} tone="light" />
            <Input label="Repeat new password" name="confirm" type="password" autoComplete="new-password" required minLength={MIN_LENGTH} tone="light" />
            {error ? (
              <p role="alert" className="rounded-lg border border-alert/40 bg-alert-soft px-3.5 py-2.5 text-[13px] leading-snug text-alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" disabled={phase === 'saving'} className="mt-1 w-full text-[14px]">
              {phase === 'saving' ? 'Saving…' : 'Save new password'}
            </Button>
          </form>
        )}
      </Card>
    </AuthShell>
  )
}
