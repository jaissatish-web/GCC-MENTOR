-- ============================================================================
-- Migration 055 — lightweight Library listing + "saved" as the starting stage
-- Audit 2026-09-15: M08 (the Library sent every CV snapshot, letter, Q&A set
-- and mock transcript for every job, to every screen that listed jobs) and M07
-- (a new job started as "applied").
--
-- REQUIRES 053 TO HAVE BEEN APPLIED (and committed) FIRST — it uses 'saved'.
--
-- 1) New jobs start as 'saved'. Existing rows are NOT changed.
-- 2) list_package_summaries(): one page of the caller's jobs as small rows —
--    identity, stage, tracker fields and FLAGS/COUNTS for what each job has
--    (CV built, letters, Q&A, latest finished mock report) — never the documents
--    themselves. Search, stage filter and keyset paging happen here, in SQL, so
--    searching finds older jobs that are not on the current page.
--    SECURITY INVOKER + auth.uid(): runs as the signed-in user; the existing
--    owner RLS on packages applies on top of the explicit user filter.
-- 3) An index for the newest-first listing.
-- ============================================================================

ALTER TABLE public.packages ALTER COLUMN status SET DEFAULT 'saved';

CREATE INDEX IF NOT EXISTS packages_user_created_idx
  ON public.packages (user_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.list_package_summaries(
  p_limit             integer     DEFAULT 20,
  p_before_created    timestamptz DEFAULT NULL,
  p_before_id         uuid        DEFAULT NULL,
  p_query             text        DEFAULT NULL,
  p_stage             text        DEFAULT NULL,
  p_only_with_resume  boolean     DEFAULT false
)
RETURNS TABLE (
  id                     uuid,
  profile_id             uuid,
  name                   text,
  target_job_title       text,
  target_company         text,
  target_country         text,
  target_industry        text,
  status                 text,
  optimization_level     text,
  template_id            text,
  is_paid                boolean,
  created_at             timestamptz,
  updated_at             timestamptz,
  job_url                text,
  application_deadline   date,
  interview_date         timestamptz,
  application_notes      text,
  has_resume             boolean,
  cover_letter_count     integer,
  qa_question_count      integer,
  mock_completed_run_id  text,
  mock_in_progress       boolean
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH q AS (
    SELECT CASE
             WHEN coalesce(btrim(p_query), '') = '' THEN NULL
             ELSE '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
           END AS pat
  )
  SELECT
    p.id,
    p.profile_id,
    p.name,
    p.target_job_title,
    p.target_company,
    p.target_country::text,
    p.target_industry,
    p.status::text,
    p.optimization_level::text,
    p.template_id,
    p.is_paid,
    p.created_at,
    p.updated_at,
    p.job_url,
    p.application_deadline,
    p.interview_date,
    p.application_notes,
    p.optimized_content IS NOT NULL,
    coalesce(array_length(p.cover_letters, 1), 0),
    CASE WHEN jsonb_typeof(p.interview_questions -> 'questions') = 'array'
         THEN jsonb_array_length(p.interview_questions -> 'questions') ELSE 0 END,
    (SELECT r ->> 'id'
       FROM unnest(coalesce(p.mock_interview_runs, '{}'::jsonb[])) AS r
      WHERE r ->> 'status' = 'completed'
        AND jsonb_typeof(r -> 'final_report') = 'object'
      ORDER BY r ->> 'generated_at' DESC
      LIMIT 1),
    EXISTS (SELECT 1
              FROM unnest(coalesce(p.mock_interview_runs, '{}'::jsonb[])) AS r
             WHERE r ->> 'status' = 'in_progress')
  FROM public.packages p, q
  WHERE p.user_id = auth.uid()
    AND (p_stage IS NULL OR p.status::text = p_stage)
    AND (NOT coalesce(p_only_with_resume, false) OR p.optimized_content IS NOT NULL)
    AND (
      q.pat IS NULL
      OR p.target_job_title ILIKE q.pat ESCAPE '\'
      OR coalesce(p.name, '') ILIKE q.pat ESCAPE '\'
      OR coalesce(p.target_company, '') ILIKE q.pat ESCAPE '\'
      OR replace(coalesce(p.target_country::text, ''), '_', ' ') ILIKE q.pat ESCAPE '\'
    )
    AND (
      p_before_created IS NULL OR p_before_id IS NULL
      OR (p.created_at, p.id) < (p_before_created, p_before_id)
    )
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 101);
$$;

REVOKE EXECUTE ON FUNCTION public.list_package_summaries(integer, timestamptz, uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_package_summaries(integer, timestamptz, uuid, text, text, boolean) TO authenticated;
