-- Admin controls for previously unguarded model calls.
INSERT INTO public.ai_service_controls (action, service_key) VALUES
  ('typical_duties', 'job_description'),
  ('anonymous_claim_review', 'extraction')
ON CONFLICT (action) DO NOTHING;

-- All guest entry points share the existing allowance and honor existing
-- overrides. The conditional UPDATE makes admission and counting atomic.
CREATE OR REPLACE FUNCTION public.consume_anonymous_rate_limit(
  p_identity_hash text,
  p_action text,
  p_window_start date,
  p_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.anonymous_rate_limits (identity_hash, action, window_start, count)
  VALUES (p_identity_hash, p_action, p_window_start, 0)
  ON CONFLICT (identity_hash, action, window_start) DO NOTHING;

  UPDATE public.anonymous_rate_limits AS rate
  SET count = rate.count + 1
  WHERE rate.identity_hash = p_identity_hash
    AND rate.action = p_action
    AND rate.window_start = p_window_start
    AND rate.count < coalesce(
      CASE WHEN rate.limit_override >= 0 THEN rate.limit_override END,
      p_limit
    );

  RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_anonymous_rate_limit(text, text, date, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_anonymous_rate_limit(text, text, date, integer)
  TO service_role;

-- Voice reviews reserve a batch before launching independent answer requests.
-- Existing one-use callers continue through the same reservation functions.
ALTER TABLE public.rate_limit_reservations
  ADD COLUMN IF NOT EXISTS units integer NOT NULL DEFAULT 1 CHECK (units > 0);

CREATE OR REPLACE FUNCTION public.reserve_rate_limit_units(
  p_user_id uuid,
  p_action text,
  p_window_start date,
  p_identity_user_ids uuid[],
  p_limit integer,
  p_global_limit integer,
  p_max_concurrent integer,
  p_ttl_seconds integer,
  p_requested_units integer
)
RETURNS TABLE (status text, reservation_id uuid, used integer, pending integer, granted_units integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ids uuid[];
  v_identity uuid;
  v_used integer;
  v_pending integer;
  v_pending_units integer;
  v_global bigint;
  v_granted integer;
  v_id uuid;
BEGIN
  IF p_user_id IS NULL OR p_action IS NULL OR p_window_start IS NULL OR coalesce(p_requested_units, 0) < 1 THEN
    RAISE EXCEPTION 'reserve_rate_limit_units: missing or invalid argument';
  END IF;

  v_ids := ARRAY(SELECT DISTINCT id FROM unnest(coalesce(p_identity_user_ids, '{}'::uuid[]) || p_user_id) AS id WHERE id IS NOT NULL);
  FOR v_identity IN SELECT unnest(v_ids) ORDER BY 1 LOOP
    PERFORM pg_advisory_xact_lock(hashtext('rate_limit:' || p_action || ':' || v_identity::text));
  END LOOP;

  DELETE FROM public.rate_limit_reservations r
  WHERE r.action = p_action AND r.user_id = ANY (v_ids) AND r.expires_at < now() - interval '1 day';

  -- Read completed and pending counts from one snapshot so settlement cannot
  -- move units between the counters in the middle of a check.
  SELECT (SELECT coalesce(sum(rl.count), 0) FROM public.rate_limits rl
           WHERE rl.action = p_action AND rl.window_start = p_window_start AND rl.user_id = ANY (v_ids)),
         count(*), coalesce(sum(r.units), 0)
  INTO v_used, v_pending, v_pending_units
  FROM public.rate_limit_reservations r
  WHERE r.action = p_action AND r.user_id = ANY (v_ids) AND r.expires_at > now();

  IF v_pending >= greatest(coalesce(p_max_concurrent, 1), 1) THEN
    PERFORM public.bump_ai_service_stat(p_action, p_window_start, 'refused_busy');
    RETURN QUERY SELECT 'busy'::text, NULL::uuid, v_used, v_pending, 0;
    RETURN;
  END IF;

  v_granted := least(p_requested_units, greatest(coalesce(p_limit, 0), 0) - v_used - v_pending_units);
  IF v_granted < 1 THEN
    PERFORM public.bump_ai_service_stat(p_action, p_window_start, 'refused_limit');
    RETURN QUERY SELECT 'limit'::text, NULL::uuid, v_used, v_pending, 0;
    RETURN;
  END IF;

  IF p_global_limit IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext('rate_limit_global:' || p_action));
    SELECT (SELECT coalesce(sum(rl.count), 0) FROM public.rate_limits rl
             WHERE rl.action = p_action AND rl.window_start = p_window_start)
           + (SELECT coalesce(sum(r.units), 0) FROM public.rate_limit_reservations r
               WHERE r.action = p_action AND r.expires_at > now())
    INTO v_global;
    v_granted := least(v_granted, greatest(0, p_global_limit - v_global));
    IF v_granted < 1 THEN
      PERFORM public.bump_ai_service_stat(p_action, p_window_start, 'refused_global');
      RETURN QUERY SELECT 'global_limit'::text, NULL::uuid, v_used, v_pending, 0;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.rate_limit_reservations (user_id, action, window_start, expires_at, units)
  VALUES (p_user_id, p_action, p_window_start,
          now() + make_interval(secs => greatest(coalesce(p_ttl_seconds, 360), 30)), v_granted)
  RETURNING id INTO v_id;

  PERFORM public.bump_ai_service_stat(p_action, p_window_start, 'reserved');
  RETURN QUERY SELECT 'reserved'::text, v_id, v_used, v_pending + 1, v_granted;
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_rate_limit(
  p_user_id uuid, p_action text, p_window_start date, p_identity_user_ids uuid[],
  p_limit integer, p_global_limit integer, p_max_concurrent integer, p_ttl_seconds integer
)
RETURNS TABLE (status text, reservation_id uuid, used integer, pending integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT result.status, result.reservation_id, result.used, result.pending
  FROM public.reserve_rate_limit_units(
    p_user_id, p_action, p_window_start, p_identity_user_ids,
    p_limit, p_global_limit, p_max_concurrent, p_ttl_seconds, 1
  ) AS result;
$$;

CREATE OR REPLACE FUNCTION public.settle_rate_limit_units(p_reservation_id uuid, p_successful_units integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.rate_limit_reservations%ROWTYPE;
  v_count integer;
BEGIN
  DELETE FROM public.rate_limit_reservations
  WHERE id = p_reservation_id
  RETURNING * INTO v_row;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  v_count := least(greatest(coalesce(p_successful_units, 0), 0), v_row.units);
  IF v_count > 0 THEN
    INSERT INTO public.rate_limits (user_id, action, window_start, count)
    VALUES (v_row.user_id, v_row.action, v_row.window_start, v_count)
    ON CONFLICT (user_id, action, window_start)
    DO UPDATE SET count = public.rate_limits.count + excluded.count;
    PERFORM public.bump_ai_service_stat(v_row.action, v_row.window_start, 'succeeded');
  ELSE
    PERFORM public.bump_ai_service_stat(v_row.action, v_row.window_start, 'failed');
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_rate_limit_reservation(p_reservation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.settle_rate_limit_units(p_reservation_id, 1);
$$;

CREATE OR REPLACE FUNCTION public.release_rate_limit_reservation(p_reservation_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.settle_rate_limit_units(p_reservation_id, 0);
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_rate_limit_units(uuid,text,date,uuid[],integer,integer,integer,integer,integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.settle_rate_limit_units(uuid,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_rate_limit_units(uuid,text,date,uuid[],integer,integer,integer,integer,integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.settle_rate_limit_units(uuid,integer)
  TO service_role;
