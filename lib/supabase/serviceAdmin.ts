import { createClient } from '@supabase/supabase-js'

/**
 * SERVER-ONLY. Uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely
 * (docs/RULES.md §6 — must never reach a client component).
 *
 * This does NOT modify lib/supabase/client.ts or lib/supabase/server.ts
 * (both protected files, docs/HERMES.md §7). Those two are the anon-key,
 * user-session clients every normal route uses. This is a separate,
 * narrowly-scoped client for the one thing RLS cannot express: writing to
 * pii_access_log, whose grants (supabase/migrations/013_operations.sql)
 * permit INSERT/SELECT to the service_role only — no user session, however
 * privileged, can write there.
 *
 * Do not use this for anything else. A normal admin read of profile/package
 * data should still go through the anon-key session client so RLS is the
 * primary guard; this client exists only for the audit-log write itself.
 */
export function createServiceRoleClient() {
  if (typeof window !== 'undefined') {
    throw new Error(
      'createServiceRoleClient must never be called in a browser context',
    )
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
