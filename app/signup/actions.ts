'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/components/auth/types'

/**
 * Sign-up server action (TASK-005). Uses the Supabase SSR server client.
 *
 * Email + password only (login method is an open decision, docs/RULES.md §5).
 * If Supabase has email confirmation enabled, no session is returned and we
 * tell the user to confirm before the next step.
 */
export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }
  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters.' }
  }

  const headersList = await headers()
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (error) {
    return { error: error.message }
  }

  // No session after signup → email confirmation is on. Tell the user.
  if (!data.session) {
    return { success: 'Check your inbox to confirm your email, then sign in.' }
  }

  redirect('/dashboard')
}
