-- ============================================================================
-- Migration 023 — anonymous rate limiting (TASK-048)
--
-- lib/rateLimit.ts / the rate_limits table (migration 013) is keyed on
-- user_id, NOT NULL, FK to auth.users(id) — there is no anonymous row it can
-- hold. TASK-049 (free ATS/Gulf-readiness scanner, no login required) has no
-- authenticated user to key against, so the existing table's shape does not
-- fit (per TASK-048's own text: "extends existing migration 013 table/016
-- function if the shape fits; new migration only if it doesn't"). This adds a
-- SEPARATE table/function for the no-login path — the existing user-keyed
-- mechanism (rate_limits, increment_rate_limit) is untouched.
--
-- Identity: callers are keyed by a SALTED HASH of their client IP
-- (identity_hash), never the raw IP. Nothing in docs/RULES.md §3 requires
-- this, but it costs nothing here and avoids storing a raw identifier with no
-- product need to ever display or reverse it — see lib/anonymousRateLimit.ts
-- for how the hash is computed.
--
-- SECURITY DEFINER lesson applied from the start (Unplanned #18, migration
-- 022): every prior function in this project revoked EXECUTE FROM PUBLIC
-- only, which this Supabase project's project-level default privilege
-- (EXECUTE granted directly to anon/authenticated, separate from PUBLIC)
-- silently did not touch — three functions were exploitable until fixed.
-- This migration revokes FROM PUBLIC, anon, AND authenticated together, in
-- the same file, so it ships correct rather than needing a follow-up fix.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) anonymous_rate_limits — no user_id, no owner. PK on
-- (identity_hash, action, window_start), same shape as rate_limits otherwise.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anonymous_rate_limits (
  identity_hash  text NOT NULL,               -- salted hash of client IP
  action         text NOT NULL,               -- e.g. 'ats_scan'
  window_start   date NOT NULL,
  count          integer NOT NULL DEFAULT 0,
  limit_override integer,                     -- nullable; set by admin
  PRIMARY KEY (identity_hash, action, window_start)
);

ALTER TABLE public.anonymous_rate_limits ENABLE ROW LEVEL SECURITY;

-- No owner concept exists for an anonymous caller (unlike rate_limits' owner-
-- only policy) — there is no session to scope a policy to. Same posture as
-- promo_codes (migration 021): service-role-only, no authenticated/anon
-- policy at all. A client can never read or write this table directly; only
-- the server-side service-role client (via the RPC below) touches it.
REVOKE ALL PRIVILEGES ON public.anonymous_rate_limits FROM anon;
REVOKE ALL PRIVILEGES ON public.anonymous_rate_limits FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.anonymous_rate_limits TO service_role;

-- ---------------------------------------------------------------------------
-- 2) increment_anonymous_rate_limit — atomic increment, mirrors
-- increment_rate_limit (migration 016) exactly, keyed on identity_hash
-- instead of user_id. Single INSERT ... ON CONFLICT ... DO UPDATE statement:
-- concurrent increments from the same identity serialize on the PK, so rapid
-- repeat calls (the realistic abuse pattern here) can't drop a count.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_anonymous_rate_limit(
  p_identity_hash text,
  p_action        text,
  p_window_start  date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.anonymous_rate_limits (identity_hash, action, window_start, count)
  VALUES (p_identity_hash, p_action, p_window_start, 1)
  ON CONFLICT (identity_hash, action, window_start)
  DO UPDATE SET count = public.anonymous_rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- Both REVOKEs together from the start (see header note) — PUBLIC covers the
-- ANSI-standard default; anon/authenticated covers this project's separate
-- default privilege. Without both, any client (even unauthenticated) could
-- call this directly via Supabase's auto-exposed REST RPC with an arbitrary
-- p_identity_hash, manipulating or exhausting another identity's count.
REVOKE EXECUTE ON FUNCTION public.increment_anonymous_rate_limit(text, text, date) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_anonymous_rate_limit(text, text, date) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_anonymous_rate_limit(text, text, date) TO service_role;
