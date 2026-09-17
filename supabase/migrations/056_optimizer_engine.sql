-- ============================================================================
-- Migration 056 — optimizer engine: job analysis cache + match report
-- 2026-09-17. docs/17_OPTIMIZER_ENGINE.md.
--
-- 1) job_analyses. The setup screen now shows the candidate's match score for a
--    target BEFORE anything is generated. That needs the advert (or job title)
--    analysed into matchable requirements, plus the evidence bridge against the
--    profile — two model calls. Creating the package later must not pay for
--    them again, and re-opening the same job must not either, so the result is
--    cached per (user, input hash).
--
--    It holds requirement keywords and short verbatim quotes from the user's own
--    profile, so it is PERSONAL DATA: service-role only (the API returns what the
--    screen needs), deleted with the user, and purged 30 days after creation by
--    purge_expired_operational_data() below.
--
-- 2) packages.match_report. The before/after match score, the requirements it
--    was computed against, the verified evidence, and which blocks kept the
--    candidate's own text. Server-derived: NOT added to the authenticated
--    column UPDATE grant from migration 050, so only server routes write it.
--
-- Additive: no table, column, row or policy is dropped or renamed.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.job_analyses (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  profile_id           uuid REFERENCES public.career_profiles (id) ON DELETE CASCADE,
  input_hash           text NOT NULL CHECK (char_length(input_hash) = 64),
  mode                 text NOT NULL CHECK (mode IN ('job_description', 'target_title_only')),
  target_job_title     text NOT NULL CHECK (char_length(target_job_title) BETWEEN 1 AND 300),
  target_profile       jsonb NOT NULL,
  bridges              jsonb NOT NULL DEFAULT '[]'::jsonb,
  profile_fingerprint  text,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  expires_at           timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  UNIQUE (user_id, input_hash)
);

CREATE INDEX IF NOT EXISTS job_analyses_expires_idx ON public.job_analyses (expires_at);

ALTER TABLE public.job_analyses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_analyses FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_analyses TO service_role;

COMMENT ON TABLE public.job_analyses IS
  'Cached target analysis (requirements + verified profile evidence) per user and input. Service-role only; purged 30 days after creation. Migration 056.';

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS match_report jsonb;

COMMENT ON COLUMN public.packages.match_report IS
  'Deterministic before/after match score, the requirements and verified evidence it used, and blocks that kept original text. Server-written only. NULL for packages built before migration 056. Migration 056.';

-- ---------------------------------------------------------------------------
-- Retention: the migration-054 purge, plus expired job analyses.
-- ---------------------------------------------------------------------------
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
  v_analyses      integer;
BEGIN
  DELETE FROM public.anonymous_analysis_sessions WHERE expires_at < now();
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  DELETE FROM public.anonymous_rate_limits
   WHERE window_start < (now() - make_interval(days => greatest(coalesce(p_rate_limit_days, 30), 1)))::date;
  GET DIAGNOSTICS v_anon_limits = ROW_COUNT;

  DELETE FROM public.rate_limit_reservations WHERE expires_at < now() - interval '1 day';
  GET DIAGNOSTICS v_reservations = ROW_COUNT;

  DELETE FROM public.job_analyses WHERE expires_at < now();
  GET DIAGNOSTICS v_analyses = ROW_COUNT;

  RETURN jsonb_build_object(
    'anonymous_sessions_deleted', v_sessions,
    'anonymous_rate_limit_rows_deleted', v_anon_limits,
    'stale_reservations_deleted', v_reservations,
    'job_analyses_deleted', v_analyses
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.purge_expired_operational_data(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_operational_data(integer) TO service_role;
