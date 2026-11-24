-- Admin controls for previously unguarded model calls.
INSERT INTO public.ai_service_controls (action, service_key) VALUES
  ('typical_duties', 'job_description'),
  ('anonymous_claim_review', 'extraction')
ON CONFLICT (action) DO NOTHING;

-- All guest entry points share the existing allowance and honor existing
-- overrides. The conditional UPDATE makes admission and counting atomic.
CREATE FUNCTION public.consume_anonymous_rate_limit(
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
