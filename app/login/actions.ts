'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { AuthState } from '@/components/auth/types'

/**
 * Sign-in server action (TASK-005). Uses the Supabase SSR server client.
 *
 * The login method is an open decision (docs/RULES.md §5). This ships
 * email + password only. Additional methods (OAuth / OTP) would be added as
 * sibling actions returning the same AuthState — no restructuring needed.
 */
export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}
