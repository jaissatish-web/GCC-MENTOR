'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { safeRedirectPath } from '@/lib/safeRedirect'
import { friendlyAuthError } from '@/lib/authMessages'
import type { AuthState } from '@/components/auth/types'

/**
 * Sign-in server action (TASK-005). Uses the Supabase SSR server client.
 *
 * Email + password only (docs/RULES.md §5). Errors come back in plain English
 * (lib/authMessages.ts) with a `kind`, so the form can offer the right next
 * step — reset the password, or resend an unconfirmed account's email.
 */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Enter your email and password.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    const f = friendlyAuthError(error)
    if (f.kind === 'unknown') console.error('login: failed', error.status ?? '', error.message)
    return { error: f.message, kind: f.kind, email }
  }

  // Back to what the user was trying to open before sign-in (audit M09) —
  // validated, so a crafted link cannot send them off-site (H05).
  redirect(safeRedirectPath(formData.get('redirectTo')))
}
