-- ============================================================================
-- Migration 013 — operational tables
-- Per docs/ADMIN.md §4 (pii_access_log) and §5 (rate_limits, ai_usage_log).
--
-- Resolved preconditions (founder/CTO): the `profiles` table already exists
-- in the live Supabase project (predates these migrations; numbering starts
-- at 010). It is NOT created here — only is_admin is added, additively.
--
-- RLS policy on `is_admin` is intentionally omitted: admin panel routes read
-- via the server-side service-role client, which bypasses RLS and must stay
-- server-only (docs/RULES.md §6). Nothing here references profiles.is_admin.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) is_admin on the EXISTING profiles table (additive only)
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2) rate_limits — free-action rate limiting (docs/ADMIN.md §5)
-- Owner-only data (per user). PK on (user_id, action, window_start).
-- Default limit is configured via env var and enforced server-side in the
-- API route, NOT here; this table only records counts + admin overrides.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action         text NOT NULL,               -- e.g. 'profile_extraction'
  window_start   date NOT NULL,
  count          integer NOT NULL DEFAULT 0,
  limit_override integer,                     -- nullable; set by admin
  PRIMARY KEY (user_id, action, window_start)
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS rate_limits_owner_all ON public.rate_limits;
  CREATE POLICY rate_limits_owner_all
    ON public.rate_limits
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

-- ---------------------------------------------------------------------------
-- 3) ai_usage_log — cost tracking (docs/ADMIN.md §5)
-- Written on every model call. Owner-oriented; admin reads via service role.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route               text NOT NULL,          -- which endpoint called the model
  model               text NOT NULL,
  input_tokens        integer NOT NULL DEFAULT 0,
  output_tokens       integer NOT NULL DEFAULT 0,
  estimated_cost_inr  numeric NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS ai_usage_log_owner_all ON public.ai_usage_log;
  CREATE POLICY ai_usage_log_owner_all
    ON public.ai_usage_log
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
END $$;

-- ---------------------------------------------------------------------------
-- 4) pii_access_log — mandatory audit trail (docs/ADMIN.md §4)
-- APPEND-ONLY. Admin panel reads/writes go through the server-side
-- service_role client (docs/RULES.md §6; must stay server-only). Nothing in
-- the app writes this from the browser, so only service_role gets grants:
-- INSERT + SELECT, and NEVER UPDATE/DELETE. Regular users (authenticated/anon)
-- get no privileges here at all — the log is admin-only, "nobody else".
--
-- Enforced on two layers so append-only cannot be bypassed by a missing
-- grant or a hidden default:
--   (a) explicit GRANTs: INSERT and SELECT to service_role only; UPDATE and
--       DELETE are granted to no role. Service_role bypasses RLS for its own
--       reads/writes, but has no UPDATE/DELETE GRANT, so it cannot modify or
--       delete log rows either.
--   (b) RLS: policies exist for INSERT and SELECT only (satisfying the
--       "enforce with policies, not just omission" requirement); there is NO
--       UPDATE/DELETE policy, and non-service roles have no grants to reach
--       the table through RLS at all.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pii_access_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- who viewed
  target_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- whose data
  resource       text NOT NULL,               -- e.g. 'career_profile', 'package'
  resource_id    uuid NOT NULL,               -- which record; never field values
  accessed_at    timestamptz NOT NULL DEFAULT now()
);

-- Explicitly close every default grant path first (defensive: never rely on
-- a fresh table inheriting usable privileges by omission).
REVOKE ALL PRIVILEGES ON public.pii_access_log FROM anon;
REVOKE ALL PRIVILEGES ON public.pii_access_log FROM authenticated;
REVOKE ALL PRIVILEGES ON public.pii_access_log FROM service_role;

-- Append-only grants: INSERT + SELECT for service_role only. No UPDATE, no
-- DELETE for any role. (The table owner — the migration role — retains DDL
-- control for admin operations, but nothing in the app path holds UPDATE/
-- DELETE, and RLS adds a second denial layer below.)
GRANT SELECT, INSERT ON public.pii_access_log TO service_role;

ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Append : INSERT only, via service_role (bypasses RLS, policy is belt-and-
  -- suspenders documenting intent and satisfying "enforce via policies").
  DROP POLICY IF EXISTS pii_access_log_insert ON public.pii_access_log;
  CREATE POLICY pii_access_log_insert
    ON public.pii_access_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

  -- Read : SELECT only, via service_role.
  DROP POLICY IF EXISTS pii_access_log_select ON public.pii_access_log;
  CREATE POLICY pii_access_log_select
    ON public.pii_access_log
    FOR SELECT
    TO service_role
    USING (true);

  -- Deliberately NO UPDATE and NO DELETE policies, and no UPDATE/DELETE GRANT
  -- to any role. The log is append-only from every code path.
END $$;
