-- ============================================================================
-- Migration 054 — retention purge for expired operational data
-- Audit 2026-09-15: H07. anonymous_analysis_sessions rows carry a CV and its
-- parsed profile with a seven-day expires_at, but expiry only HID them; nine
-- expired rows were still stored. Nothing deleted them.
--
-- purge_expired_operational_data() deletes, in one transaction:
--   * anonymous_analysis_sessions past expires_at (the promised seven days),
--   * anonymous_rate_limits windows older than p_rate_limit_days (salted IP
--     hashes and counts only; 30 days by default),
--   * rate_limit_reservations that expired more than a day ago.
-- It returns COUNTS only — never content — so the run log holds no CV text.
--
-- NOT purged here, deliberately: ai_usage_log, pending_profile_drafts and user
-- data. Their retention is a founder/privacy-policy decision (audit M11), listed
-- in docs/SAAS_RELEASE_CHECKLIST.md.
--
-- maintenance_runs records each run (who/what/when/counts/error) so the founder
-- can see in /admin that cleanup is happening. Service-role only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.maintenance_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job          text NOT NULL,
  trigger      text NOT NULL,                  -- 'cron' | 'admin'
  started_at   timestamptz NOT NULL DEFAULT now(),
  finished_at  timestamptz,
  ok           boolean,
  summary      jsonb,
  error        text CHECK (error IS NULL OR char_length(error) <= 500)
);

CREATE INDEX IF NOT EXISTS maintenance_runs_job_started_idx
  ON public.maintenance_runs (job, started_at DESC);

ALTER TABLE public.maintenance_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.maintenance_runs FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.maintenance_runs TO service_role;

CREATE OR REPLACE FUNCTION public.purge_expired_operational_data(
  p_rate_limit_days integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_sessions      integer;
  v_anon_limits   integer;
  v_reservations  integer;
BEGIN
  DELETE FROM public.anonymous_analysis_sessions WHERE expires_at < now();
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  DELETE FROM public.anonymous_rate_limits
   WHERE window_start < (now() - make_interval(days => greatest(coalesce(p_rate_limit_days, 30), 1)))::date;
  GET DIAGNOSTICS v_anon_limits = ROW_COUNT;

  DELETE FROM public.rate_limit_reservations WHERE expires_at < now() - interval '1 day';
  GET DIAGNOSTICS v_reservations = ROW_COUNT;

  RETURN jsonb_build_object(
    'anonymous_sessions_deleted', v_sessions,
    'anonymous_rate_limit_rows_deleted', v_anon_limits,
    'stale_reservations_deleted', v_reservations
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_operational_data(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_operational_data(integer) TO service_role;
