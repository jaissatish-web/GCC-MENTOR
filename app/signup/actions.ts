'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/safeRedirect'
import { authLinkOrigin } from '@/lib/authOrigin'
import { friendlyAuthError } from '@/lib/authMessages'
import type { AuthState } from '@/components/auth/types'

const MIN_PASSWORD = 6
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Sign-up server action (TASK-005; 2026-09-30: confirm password, plain-English
 * errors, "check your inbox" state).
 *
 * The password is checked twice — the form checks before sending, and this
 * checks again, because a server action can be called without the form.
 * If Supabase has email confirmation on, no session comes back and the form
 * shows the "check your inbox" screen for the address.
 */
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirmPassword') ?? '')

  if (!email || !EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' }
  if (password.length < MIN_PASSWORD) return { error: `Use at least ${MIN_PASSWORD} characters for your password.` }
  if (password !== confirm) return { error: 'The two passwords don’t match. Please type them again.' }

  const origin = authLinkOrigin((await headers()).get('origin'))

  // Where the user was headed before signing up (audit M09). A fresh account
  // with no destination still starts at onboarding, as before.
  const destination = safeRedirectPath(formData.get('redirectTo'), '/onboarding')
  const callback = new URL('/auth/callback', origin)
  if (destination !== '/onboarding') callback.searchParams.set('next', destination)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callback.toString() },
  })

  if (error) {
    const f = friendlyAuthError(error)
    if (f.kind === 'unknown') console.error('signup: failed', error.status ?? '', error.message)
    return { error: f.message, kind: f.kind }
  }

  // No session → email confirmation is on. Show the inbox screen.
  if (!data.session) return { kind: 'check_email', email }

  // A fresh signup has no Career Profile yet — straight into onboarding unless
  // they came from a specific page (login goes to /dashboard by default).
  redirect(destination)
}

/** Resend the sign-up confirmation email. Same neutral answer either way. */
export async function resendConfirmation(email: string): Promise<AuthState> {
  const clean = String(email ?? '').trim()
  if (!EMAIL_RE.test(clean)) return { error: 'Enter a valid email address.' }
  const origin = authLinkOrigin((await headers()).get('origin'))
  const supabase = await createClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: clean,
    options: { emailRedirectTo: new URL('/auth/callback', origin).toString() },
  })
  if (error) {
    const f = friendlyAuthError(error)
    if (f.kind === 'rate_limit') return { error: f.message, kind: f.kind }
    console.error('signup: resend failed', error.status ?? '', error.message)
  }
  return { success: 'sent' }
}
