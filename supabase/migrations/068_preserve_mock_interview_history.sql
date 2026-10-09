-- Founder requested all mock attempts, superseding only migration 065's mock cap.
-- Existing tables, ownership filters, invoker security and server-only grants stay.
-- CLI-generated file renamed to this repository's sequential migration convention.
BEGIN;

CREATE OR REPLACE FUNCTION public.package_append_mock_run(
  p_package_id uuid, p_user_id uuid, p_run jsonb, p_event jsonb
)
RETURNS boolean LANGUAGE sql SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH updated AS (
    UPDATE public.packages p
       SET mock_interview_runs = CASE
             WHEN EXISTS (SELECT 1 FROM unnest(coalesce(p.mock_interview_runs, '{}'::jsonb[])) r
                          WHERE r->>'id' = p_run->>'id') THEN p.mock_interview_runs
             ELSE array_append(coalesce(p.mock_interview_runs, '{}'::jsonb[]), p_run) END,
           service_events = CASE
             WHEN EXISTS (SELECT 1 FROM unnest(coalesce(p.mock_interview_runs, '{}'::jsonb[])) r
                          WHERE r->>'id' = p_run->>'id') THEN p.service_events
             ELSE array_append(coalesce(p.service_events, '{}'::jsonb[]), p_event) END
     WHERE p.id = p_package_id AND p.user_id = p_user_id
    RETURNING 1
  ) SELECT EXISTS (SELECT 1 FROM updated);
$$;
REVOKE EXECUTE ON FUNCTION public.package_append_mock_run(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.package_append_mock_run(uuid, uuid, jsonb, jsonb) TO service_role;

-- Restore only missing voice history from its already-persisted source.
-- Never replace a retained run/user edit, resurrect a deletion, or touch CV content.
UPDATE public.packages p
SET mock_interview_runs = coalesce(p.mock_interview_runs, '{}'::jsonb[]) || ARRAY(
  SELECT s.run_snapshot || jsonb_build_object(
    'id', s.id, 'generated_at', coalesce(s.run_snapshot->>'generated_at', s.created_at::text),
    'resume_fingerprint', s.resume_fingerprint, 'rubric_version', s.rubric_version,
    'status', CASE WHEN s.status = 'completed' THEN 'completed' ELSE 'in_progress' END,
    'completed_at', s.completed_at, 'final_report', s.report,
    'questions', (SELECT coalesce(jsonb_agg(q.value || coalesce(a.feedback, '{}'::jsonb) ||
      CASE WHEN a.saved_at IS NOT NULL THEN jsonb_build_object('answer', a.transcript, 'answered_at', a.saved_at)
           ELSE '{}'::jsonb END ORDER BY q.ordinality), '[]'::jsonb)
      FROM jsonb_array_elements(s.run_snapshot->'questions') WITH ORDINALITY q(value, ordinality)
      LEFT JOIN public.voice_interview_answers a ON a.session_id = s.id AND a.question_id::text = q.value->>'id')
  )
  FROM public.voice_interview_sessions s
  WHERE s.package_id = p.id AND s.user_id = p.user_id AND s.status <> 'deleting'
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.mock_interview_runs, '{}'::jsonb[])) r WHERE r->>'id' = s.id::text)
  ORDER BY s.created_at, s.id
)
WHERE EXISTS (
  SELECT 1 FROM public.voice_interview_sessions s
  WHERE s.package_id = p.id AND s.user_id = p.user_id AND s.status <> 'deleting'
    AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.mock_interview_runs, '{}'::jsonb[])) r WHERE r->>'id' = s.id::text)
);
COMMIT;

-- Application rollback needs no data deletion or schema rollback. If restoring
-- old behavior is explicitly required, replace ONLY package_append_mock_run with
-- its definition from 065. Do not undo recovery or remove already-saved attempts.
