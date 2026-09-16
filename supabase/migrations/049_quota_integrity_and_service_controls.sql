-- ============================================================================
-- Migration 049 — quota integrity, atomic reservations, founder service controls
-- Audit 2026-09-15: H01 (rate-limit state client-writable), H03 (no enforced
-- budget on the service journey), M14 (no effective pause/budget control).
--
-- ADDITIVE except for one policy swap on rate_limits. Nothing is dropped,
-- no row is changed, no existing function's signature is altered.
--
-- 1) rate_limits: the owner may READ their own counters and may no longer
--    WRITE them. Migration 013 gave `authenticated` an owner ALL policy plus the
--    default Supabase table grants, so a signed-in user could raise
--    limit_override or reset count on their own row through the data API and
--    walk past every daily limit. All writes already happen server-side through
--    the service-role client (lib/rateLimit.ts) and the admin panel, which
--    bypass RLS and keep working.
--
-- 2) rate_limit_reservations: a slot is RESERVED before the model call and
--    either CONSUMED (success) or RELEASED (failure) afterwards. Pending
--    reservations count toward the limit, so N concurrent requests cannot all
--    pass a check that reads the same old count — the gap in the previous
--    check-then-increment design. A reservation left behind by a killed
--    function expires (p_ttl_seconds) and stops counting, so a platform
--    timeout never permanently costs the user a try.
--
-- 3) ai_service_controls: one row per quota action. `enabled = false` pauses
--    the action server-side; limits left NULL fall back to the code defaults in
--    lib/rateLimit.ts (env-overridable), so no commercial allowance is invented
--    here. ai_service_control_changes is the append-only history of edits.
--
-- Every new object is service-role only. Clients get no grants and no
-- policies; RLS stays enabled so a future grant cannot silently expose rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) rate_limits: read-only for the owner
-- ---------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE ON public.rate_limits FROM authenticated;
REVOKE ALL ON public.rate_limits FROM anon;

DO $$
BEGIN
  DROP POLICY IF EXISTS rate_limits_owner_all ON public.rate_limits;
  DROP POLICY IF EXISTS rate_limits_owner_select ON public.rate_limits;
  CREATE POLICY rate_limits_owner_select
    ON public.rate_limits
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
END $$;

-- ---------------------------------------------------------------------------
-- 2) Reservations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rate_limit_reservations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        text NOT NULL,
  window_start  date NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_reservations_lookup_idx
  ON public.rate_limit_reservations (action, user_id, expires_at);

ALTER TABLE public.rate_limit_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_reservations FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.rate_limit_reservations TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Founder service controls + change history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_service_controls (
  action                   text PRIMARY KEY,         -- quota action, e.g. 'interview_qa'
  service_key              text NOT NULL,            -- lib/ai/services.ts key it belongs to
  enabled                  boolean NOT NULL DEFAULT true,
  daily_limit_per_user     integer CHECK (daily_limit_per_user IS NULL OR daily_limit_per_user >= 0),
  global_daily_limit       integer CHECK (global_daily_limit IS NULL OR global_daily_limit >= 0),
  max_concurrent_per_user  integer NOT NULL DEFAULT 1 CHECK (max_concurrent_per_user BETWEEN 1 AND 5),
  paused_message           text CHECK (paused_message IS NULL OR char_length(paused_message) <= 300),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  updated_by               uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.ai_service_controls ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_service_controls FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_service_controls TO service_role;

CREATE TABLE IF NOT EXISTS public.ai_service_control_changes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action       text NOT NULL,
  changed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at   timestamptz NOT NULL DEFAULT now(),
  before_value jsonb,
  after_value  jsonb NOT NULL
);

ALTER TABLE public.ai_service_control_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_service_control_changes FROM anon, authenticated;
-- Append-only: no UPDATE or DELETE grant for any application role.
REVOKE ALL ON public.ai_service_control_changes FROM service_role;
GRANT SELECT, INSERT ON public.ai_service_control_changes TO service_role;

-- Daily counters per action — what the founder sees in /admin/services. COUNTS
-- ONLY: no user id, no content. Bumped inside the reserve/consume/release
-- functions below, in the same transaction as the event they count.
CREATE TABLE IF NOT EXISTS public.ai_service_daily_stats (
  action          text NOT NULL,
  day             date NOT NULL,
  reserved        integer NOT NULL DEFAULT 0,   -- a model call was allowed to start
  succeeded       integer NOT NULL DEFAULT 0,   -- ...and its result was saved
  failed          integer NOT NULL DEFAULT 0,   -- ...and it failed; the slot was given back
  refused_limit   integer NOT NULL DEFAULT 0,   -- the user's daily allowance was used up
  refused_busy    integer NOT NULL DEFAULT 0,   -- another request of theirs was still running
  refused_global  integer NOT NULL DEFAULT 0,   -- the all-users daily cap was reached
  PRIMARY KEY (action, day)
);

ALTER TABLE public.ai_service_daily_stats ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_service_daily_stats FROM anon, authenticated;
GRANT SELECT ON public.ai_service_daily_stats TO service_role;

-- Internal: called only from the SECURITY DEFINER functions below.
CREATE OR REPLACE FUNCTION public.bump_ai_service_stat(p_action text, p_day date, p_column text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_column NOT IN ('reserved', 'succeeded', 'failed', 'refused_limit', 'refused_busy', 'refused_global') THEN
    RAISE EXCEPTION 'bump_ai_service_stat: unknown counter %', p_column;
  END IF;
  EXECUTE format(
    'INSERT INTO public.ai_service_daily_stats (action, day, %1$I) VALUES ($1, $2, 1)
     ON CONFLICT (action, day) DO UPDATE SET %1$I = public.ai_service_daily_stats.%1$I + 1',
    p_column
  ) USING p_action, p_day;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.bump_ai_service_stat(text, date, text) FROM PUBLIC, anon, authenticated, service_role;

-- One row per quota action. Limits NULL = "use the code default" — the values
-- are a founder decision, recorded in docs/SAAS_RELEASE_CHECKLIST.md.
INSERT INTO public.ai_service_controls (action, service_key) VALUES
  ('profile_extraction',     'extraction'),
  ('anonymous_scan',         'extraction'),
  ('job_description',        'job_description'),
  ('optimization',           'optimization'),
  ('cover_letter',           'cover_letter'),
  ('interview_qa',           'qa_generation'),
  ('mock_interview_start',   'mock_interview'),
  ('mock_interview_answer',  'mock_interview'),
  ('mock_interview_report',  'mock_interview')
ON CONFLICT (action) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4) reserve / consume / release
-- ---------------------------------------------------------------------------
-- status: 'reserved' | 'limit' | 'global_limit' | 'busy'
CREATE OR REPLACE FUNCTION public.reserve_rate_limit(
  p_user_id            uuid,
  p_action             text,
  p_window_start       date,
  p_identity_user_ids  uuid[],
  p_limit              integer,
  p_global_limit       integer,
  p_max_concurrent     integer,
  p_ttl_seconds        integer
)
RETURNS TABLE (status text, reservation_id uuid, used integer, pending integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids      uuid[];
  v_used     integer;
  v_pending  integer;
  v_global   integer;
  v_id       uuid;
BEGIN
  IF p_user_id IS NULL OR p_action IS NULL OR p_window_start IS NULL THEN
    RAISE EXCEPTION 'reserve_rate_limit: missing argument';
  END IF;

  v_ids := ARRAY(SELECT DISTINCT x FROM unnest(coalesce(p_identity_user_ids, '{}'::uuid[]) || p_user_id) AS x);

  -- Serialise reservations for this user+action for the rest of the
  -- transaction, so two concurrent calls cannot both read the same totals.
  PERFORM pg_advisory_xact_lock(hashtext('rate_limit:' || p_action || ':' || p_user_id::text));

  -- Housekeeping: forget reservations that expired more than a day ago.
  DELETE FROM public.rate_limit_reservations r
   WHERE r.action = p_action AND r.user_id = ANY (v_ids) AND r.expires_at < now() - interval '1 day';

  SELECT coalesce(sum(rl.count), 0)::integer INTO v_used
    FROM public.rate_limits rl
   WHERE rl.action = p_action AND rl.window_start = p_window_start AND rl.user_id = ANY (v_ids);

  SELECT count(*)::integer INTO v_pending
    FROM public.rate_limit_reservations r
   WHERE r.action = p_action AND r.user_id = ANY (v_ids) AND r.expires_at > now();

  IF v_pending >= greatest(coalesce(p_max_concurrent, 1), 1) THEN
    PERFORM public.bump_ai_service_stat(p_action, p_window_start, 'refused_busy');
    RETURN QUERY SELECT 'busy'::text, NULL::uuid, v_used, v_pending;
    RETURN;
  END IF;

  IF v_used + v_pending >= greatest(coalesce(p_limit, 0), 0) THEN
    PERFORM public.bump_ai_service_stat(p_action, p_window_start, 'refused_limit');
    RETURN QUERY SELECT 'limit'::text, NULL::uuid, v_used, v_pending;
    RETURN;
  END IF;

  IF p_global_limit IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('rate_limit_global:' || p_action));
    SELECT (SELECT coalesce(sum(rl.count), 0) FROM public.rate_limits rl
             WHERE rl.action = p_action AND rl.window_start = p_window_start)
         + (SELECT count(*) FROM public.rate_limit_reservations r
             WHERE r.action = p_action AND r.expires_at > now())
      INTO v_global;
    IF v_global >= p_global_limit THEN
      PERFORM public.bump_ai_service_stat(p_action, p_window_start, 'refused_global');
      RETURN QUERY SELECT 'global_limit'::text, NULL::uuid, v_used, v_pending;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.rate_limit_reservations (user_id, action, window_start, expires_at)
  VALUES (p_user_id, p_action, p_window_start,
          now() + make_interval(secs => greatest(coalesce(p_ttl_seconds, 360), 30)))
  RETURNING id INTO v_id;

  PERFORM public.bump_ai_service_stat(p_action, p_window_start, 'reserved');
  RETURN QUERY SELECT 'reserved'::text, v_id, v_used, v_pending + 1;
END;
$$;

-- Success: turn the reservation into one counted use. Idempotent — a second
-- call for the same reservation finds nothing and counts nothing.
CREATE OR REPLACE FUNCTION public.consume_rate_limit_reservation(p_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.rate_limit_reservations%ROWTYPE;
BEGIN
  DELETE FROM public.rate_limit_reservations
   WHERE id = p_reservation_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.rate_limits (user_id, action, window_start, count)
  VALUES (v_row.user_id, v_row.action, v_row.window_start, 1)
  ON CONFLICT (user_id, action, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1;

  PERFORM public.bump_ai_service_stat(v_row.action, v_row.window_start, 'succeeded');
  RETURN true;
END;
$$;

-- Failure: give the slot back. Idempotent.
CREATE OR REPLACE FUNCTION public.release_rate_limit_reservation(p_reservation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.rate_limit_reservations%ROWTYPE;
BEGIN
  DELETE FROM public.rate_limit_reservations WHERE id = p_reservation_id RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  PERFORM public.bump_ai_service_stat(v_row.action, v_row.window_start, 'failed');
  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_rate_limit(uuid, text, date, uuid[], integer, integer, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_rate_limit_reservation(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_rate_limit_reservation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_rate_limit(uuid, text, date, uuid[], integer, integer, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit_reservation(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_rate_limit_reservation(uuid) TO service_role;
