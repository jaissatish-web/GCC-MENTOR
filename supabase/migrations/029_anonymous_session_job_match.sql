-- ============================================================================
-- Migration 029 — add job_match_result to anonymous_analysis_sessions
--
-- TASK-071. Additive only. Same table, same RLS posture (migration 028) —
-- a new nullable column inherits it, no policy change needed. Mirrors
-- ats_score_result's own nullable-jsonb pattern: a row can exist with this
-- unset (no job description was given, or the Job Match engine's own AI
-- calls failed) without invalidating the rest of the session.
-- ============================================================================

ALTER TABLE public.anonymous_analysis_sessions
  ADD COLUMN IF NOT EXISTS job_match_result jsonb;
