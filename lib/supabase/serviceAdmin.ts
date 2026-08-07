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
 * CORRECTED (TASK-040): an earlier version of this note said admin reads of
 * profile/package data "should still go through the anon-key session client
 * so RLS is the primary guard." That does not actually work — career_profiles
 * and packages both carry OWNER-ONLY RLS (`user_id = auth.uid()`) with no
 * is_admin-aware bypass policy, so the anon-key client scoped to the ADMIN's
 * own session can only ever see the admin's own rows, never another user's.
 * Cross-user admin reads (lib/admin/adminData.ts) correctly use THIS client
 * instead, gated by an explicit is_admin check upstream (middleware.ts +
 * lib/admin/adminAuth.ts) and, for PII resources, a mandatory
 * pii_access_log write before every read (lib/admin/piiAccessLog.ts). This
 * client is for any server-only privileged read/write RLS cannot express for
 * a legitimate reason — not just the pii_access_log write.
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
