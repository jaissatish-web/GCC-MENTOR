'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthCard, AuthShell } from '@/components/auth/AuthShell'
import { Notice } from '@/components/auth/Notice'
import { PasswordField } from '@/components/auth/PasswordField'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

/**
 * /auth/update-password — step 3 of password recovery (audit M03, 2026-09-15;
 * redesigned 2026-09-30).
 *
 * Reached from the emailed reset link, which /auth/confirm (token hash, any
 * device), /auth/callback (PKCE) or the hash handler (implicit flow) has
 * already turned into a session. With no session the link expired or was used
 * — say so and offer a new one, rather than a form that cannot work.
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
    if (password !== confirm) return setError('The two passwords don’t match. Please type them again.')

    setPhase('saving')
    const { error: updateError } = await createClient().auth.updateUser({ password })
    if (updateError) {
      setPhase('ready')
      setError(
        /session|jwt|expired/i.test(updateError.message)
          ? 'This reset link has expired. Ask for a new one below.'
          : /different from the old|same.*password/i.test(updateError.message)
            ? 'Choose a password you haven’t used before.'
            : 'We couldn’t save that password. Try a longer one, mixing letters and numbers.',
      )
      return
    }
    setPhase('done')
    // Full reload so middleware and server components see the session.
    window.setTimeout(() => window.location.assign('/dashboard'), 1500)
  }

  return (
    <AuthShell
      panelTitle="Set a new password and pick up where you left off."
      panelBody="Your Career Profile, CVs and interview practice are exactly as you left them."
      aside={{ prompt: 'Need help?', label: 'Sign in', href: '/login' }}
    >
      <AuthCard title="Set a new password" subtitle="Choose a password you haven’t used on other sites.">
        {phase === 'checking' ? (
          <Notice tone="info">Checking your reset link…</Notice>
        ) : phase === 'no_session' ? (
          <div className="flex flex-col gap-4">
            <Notice tone="error" title="This link has expired or was already used">
              Reset links work once and expire after a short time. Ask for a new one — it only takes a minute.
            </Notice>
            <Link
              href="/forgot-password"
              className="inline-flex min-h-12 items-center justify-center rounded-ctl bg-gold px-4 text-[15px] font-bold text-ink hover:bg-gold-ink hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
            >
              Send me a new link
            </Link>
          </div>
        ) : phase === 'done' ? (
          <Notice tone="success" title="Password updated">
            You’re signed in. Taking you to your dashboard…
          </Notice>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <PasswordField label="New password" name="password" autoComplete="new-password" minLength={MIN_LENGTH} hint={`At least ${MIN_LENGTH} characters. Longer, with letters and numbers, is safer.`} />
            <PasswordField label="Confirm new password" name="confirm" autoComplete="new-password" minLength={MIN_LENGTH} invalid={Boolean(error?.includes('match'))} />
            {error ? <Notice tone="error">{error}</Notice> : null}
            <Button type="submit" variant="primary" disabled={phase === 'saving'} className="mt-1 w-full text-[15px]">
              {phase === 'saving' ? 'Saving…' : 'Save new password'}
            </Button>
          </form>
        )}
      </AuthCard>
    </AuthShell>
  )
}
