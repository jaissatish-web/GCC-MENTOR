-- Counts only; no user data, policies, tables or stored counters are changed.
-- Generated with Supabase CLI, numbered to match this repository's bootstrap.
-- Reverse after reverting the UI/API: DROP FUNCTION public.dashboard_overview();
CREATE OR REPLACE FUNCTION public.dashboard_overview()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH profile AS (
    SELECT EXISTS (SELECT 1 FROM public.career_profiles WHERE user_id = (SELECT auth.uid())) AS present
  ), items AS (
    SELECT p.status, p.tier,
      p.tier IS DISTINCT FROM 'free' AND p.optimized_content IS NOT NULL AS optimized,
      CASE WHEN p.tier = 'free' THEN profile.present ELSE p.optimized_content IS NOT NULL END AS ready,
      coalesce(cardinality(p.cover_letters), 0) AS letters,
      CASE WHEN coalesce(cardinality(p.interview_question_sets), 0) > 0
        THEN cardinality(p.interview_question_sets)
        WHEN jsonb_typeof(p.interview_questions -> 'questions') = 'array'
          THEN CASE WHEN jsonb_array_length(p.interview_questions -> 'questions') > 0 THEN 1 ELSE 0 END
        ELSE 0 END AS qa_sets,
      m.runs, m.completed, m.in_progress, m.score_sum, m.scored
    FROM public.packages p CROSS JOIN profile
    CROSS JOIN LATERAL (
      SELECT count(*) AS runs,
        count(*) FILTER (WHERE r ->> 'status' = 'completed' AND jsonb_typeof(r -> 'final_report') = 'object') AS completed,
        count(*) FILTER (WHERE r ->> 'status' = 'in_progress') AS in_progress,
        sum(CASE WHEN r ->> 'status' = 'completed'
          AND score BETWEEN 0 AND 100
          THEN score END) AS score_sum,
        count(*) FILTER (WHERE r ->> 'status' = 'completed'
          AND score BETWEEN 0 AND 100) AS scored
      FROM unnest(coalesce(p.mock_interview_runs, '{}'::jsonb[])) AS r
      CROSS JOIN LATERAL (SELECT CASE WHEN jsonb_typeof(r -> 'final_report' -> 'overall_score') = 'number'
        THEN (r -> 'final_report' ->> 'overall_score')::numeric END AS score) scores
    ) m
    WHERE p.user_id = (SELECT auth.uid())
  ), totals AS (
    SELECT
      count(*) FILTER (WHERE optimized) AS optimized_resumes,
      count(*) FILTER (WHERE tier IS DISTINCT FROM 'free') AS target_jobs,
      count(*) FILTER (WHERE tier IS DISTINCT FROM 'free' AND NOT ready) AS drafts,
      coalesce(sum(letters), 0) AS letters, coalesce(sum(qa_sets), 0) AS qa_sets,
      coalesce(sum(runs), 0) AS mocks, coalesce(sum(completed), 0) AS completed,
      coalesce(sum(in_progress), 0) AS in_progress,
      round(sum(score_sum) / nullif(sum(scored), 0), 1) AS average_score,
      count(*) FILTER (WHERE ready AND letters > 0) AS with_letter,
      count(*) FILTER (WHERE ready AND qa_sets > 0) AS with_qa,
      count(*) FILTER (WHERE ready AND completed > 0) AS with_mock
    FROM items
  ), stages AS (
    SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb) AS counts
    FROM (SELECT status::text, count(*) AS n FROM items WHERE tier IS DISTINCT FROM 'free' GROUP BY status) s
  )
  SELECT jsonb_build_object(
    'resume_count', optimized_resumes + CASE WHEN present THEN 1 ELSE 0 END,
    'profile_resume_count', CASE WHEN present THEN 1 ELSE 0 END,
    'optimized_resume_count', optimized_resumes, 'target_job_count', target_jobs,
    'draft_resume_count', drafts, 'cover_letter_count', letters, 'qa_set_count', qa_sets,
    'mock_interview_count', mocks, 'mock_completed_count', completed,
    'mock_in_progress_count', in_progress, 'average_mock_score', average_score,
    'resumes_with_letter', with_letter, 'resumes_with_qa', with_qa, 'resumes_with_mock', with_mock,
    'stages', '{"saved":0,"applied":0,"shortlisted":0,"interview":0,"visa_processing":0,"offer":0,"rejected":0,"withdrawn":0}'::jsonb || stages.counts
  ) FROM totals CROSS JOIN profile CROSS JOIN stages;
$$;

REVOKE EXECUTE ON FUNCTION public.dashboard_overview() FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.dashboard_overview() TO authenticated;
