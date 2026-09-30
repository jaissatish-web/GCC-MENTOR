'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { authLinkOrigin } from '@/lib/authOrigin'
import type { AuthState } from '@/components/auth/types'

/**
 * Request a password-reset email (audit M03, 2026-09-15).
 *
 * THE SAME ANSWER WHETHER OR NOT THE ACCOUNT EXISTS. Saying "no account with that
 * email" would let anyone test which emails are registered. Only a rate limit is
 * reported differently, because that says nothing about the address.
 *
 * The emailed link returns through /auth/callback, which exchanges the code for
 * a session and — through the validated redirect rule — opens
 * /auth/update-password. Supabase must list that callback URL under
 * Authentication -> URL Configuration -> Redirect URLs (docs/SAAS_RELEASE_CHECKLIST.md).
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: 'Enter the email address you signed up with.' }
  }

  // Never localhost (2026-09-30): see lib/authOrigin.ts.
  const origin = authLinkOrigin((await headers()).get('origin'))
  const callback = new URL('/auth/callback', origin)
  callback.searchParams.set('next', '/auth/update-password')

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: callback.toString() })

  if (error && (error.status === 429 || /rate limit/i.test(error.message))) {
    return { error: 'Too many requests. Please wait a minute, then try again.' }
  }
  if (error) {
    // Logged without the address. The user still sees the neutral answer.
    console.error('forgot-password: reset request failed', error.status ?? '', error.message)
  }

  // The form turns this into a "check your email" screen naming the address.
  return { kind: 'check_email', email }
}
