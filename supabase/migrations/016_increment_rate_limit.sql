-- ============================================================================
-- Migration 016 — atomic rate-limit increment (TASK-038 review fix)
--
-- TASK-038's original incrementRateLimit did read-then-upsert (SELECT count,
-- then UPSERT count+1) as two separate round trips — a race. Two concurrent
-- requests from the same user could read the same count and both write the
-- same +1, silently dropping an increment. Rapid repeat calls are exactly the
-- realistic abuse pattern this ticket exists to stop.
--
-- This replaces that with a single atomic Postgres function: one
-- INSERT ... ON CONFLICT ... DO UPDATE SET count = rate_limits.count + 1
-- statement, executed server-side in one round trip. The increment is
-- concurrency-safe under PostgreSQL's ON CONFLICT row locking — concurrent
-- increments serialize on the PK and each adds exactly 1.
--
-- Depends on rate_limits (migration 013, already applied). Additive — creates
-- a function, drops/alters nothing. RLS: the function is SECURITY DEFINER
-- (owned by the migration role, so it can see rate_limits regardless of the
-- caller's RLS-scoped role), which is correct for an internal server-side
-- counter invoked only via the service-role client.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_user_id   uuid,
  p_action    text,
  p_window_start date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (p_user_id, p_action, p_window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- The function runs as its owner (postgres / migration role), which bypasses
-- RLS. Because it is SECURITY DEFINER, EXECUTE must be locked down explicitly —
-- Postgres grants EXECUTE on new functions to PUBLIC by default (functions are
-- opt-out, unlike tables which are opt-in), and Supabase/PostgREST exposes any
-- function a caller's role can execute as an RPC endpoint. Without a REVOKE,
-- any authenticated (even anonymous) role could call it directly with an
-- arbitrary p_user_id — a working IDOR that lets a stranger manipulate or
-- exhaust another user's rate limit under elevated privilege.
--
-- Restrict to service_role only, matching the explicit-REVOKE-then-GRANT
-- pattern already used for pii_access_log (migration 013) and ai_usage_log
-- (migration 015). The function is only ever invoked server-side via the
-- service-role client, so no other role needs EXECUTE.
REVOKE EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(uuid, text, date) TO service_role;