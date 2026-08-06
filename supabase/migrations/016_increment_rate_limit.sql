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
-- RLS. No role should be able to invoke it from a normal session: it is only
-- reachable through the service-role client (server-side), which already holds
-- bypass-RLS. Empirically safe either way — RLS on rate_limits is owner-only
-- (user_id = auth.uid()), and the function itself never reads/returns PII.