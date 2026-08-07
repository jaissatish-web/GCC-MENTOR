import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Admin authorization — TASK-040.
 *
 * docs/ADMIN.md §1: "Check is_admin server-side in the route handler AND in
 * middleware. Never rely on a client-side check." Middleware (see
 * middleware.ts) is the first gate; this is the second, independent check
 * inside the page/action itself — defense in depth, not redundancy for its
 * own sake. Server Actions in particular are their own POST endpoints and
 * are NOT covered by the page's middleware-gated render, so every admin
 * Server Action must call this too, not just app/admin/page.tsx.
 *
 * Uses the regular anon-key session client, not the service role: reading
 * the CALLER's OWN profiles.is_admin row is always permitted under normal
 * RLS (it is their own row), so no elevated client is needed for this check.
 * Elevated (service-role) access is reserved for the actual cross-user admin
 * DATA reads in lib/admin/adminData.ts, never for the identity check itself.
 *
 * SCHEMA NOTE: `profiles` predates this project's migrations (migration 013's
 * own comment) — it is the same live table carried over, not one this repo
 * creates. It keys off `user_id`, not `id`, as the FK to auth.users: every
 * reference/*.reference.ts file that touches this table uses
 * `.eq('user_id', user.id)` / `upsert(..., { onConflict: 'user_id' })`
 * consistently, never `.eq('id', ...)`. Matched here for that reason.
 */

export interface AdminIdentity {
  id: string
  email: string | null
}

/**
 * Resolve the caller as an admin, or redirect to /dashboard.
 *
 * docs/ADMIN.md §1: "Never expose an admin route or admin data to a
 * non-admin session, even in an error message." A redirect to /dashboard —
 * the same place a non-admin lands anywhere else — reveals nothing about
 * whether /admin exists or why access was refused.
 */
export async function requireAdmin(): Promise<AdminIdentity> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/dashboard')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.is_admin !== true) {
    redirect('/dashboard')
  }

  return { id: user.id, email: user.email ?? null }
}
