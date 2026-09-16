-- ============================================================================
-- Migration 050 — package integrity + atomic service writes
-- Audit 2026-09-15: H02 (owner could write payment and generated-output fields
-- through the data API), H04 (whole-array JSON rewrites lost concurrent work),
-- M05 (mock interview run lifecycle).
--
-- 1) COLUMN GRANTS. `authenticated` keeps SELECT and DELETE on its own rows
--    (RLS unchanged) and may UPDATE only the metadata a user legitimately edits:
--    name, status (application stage), template choice, style, and the tracker
--    fields. is_paid, payment_id, optimized_content, document_snapshot,
--    profile_id, cover_letters, interview_questions, mock_interview_runs,
--    service_events and every other server-derived column are written only by
--    server routes through the service-role client, after they have
--    authenticated the caller and scoped the write to `user_id`.
--    INSERT is server-only for the same reason (a package row carries
--    server-derived fields from its first write).
--
-- 2) ATOMIC WRITES. Each function below changes one package row in ONE
--    statement or under a row lock, so two tabs or two services finishing at
--    the same moment both keep their result. Previously each route read the
--    array, appended in memory and wrote the whole array back — the second
--    writer silently erased the first.
--
--    SECURITY INVOKER and EXECUTE for service_role only: every function takes
--    p_user_id and matches it, and only the server may call them.
--
-- Additive: no column, row or existing policy is dropped.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.packages FROM anon;
REVOKE INSERT, UPDATE ON public.packages FROM authenticated;
GRANT SELECT, DELETE ON public.packages TO authenticated;
GRANT UPDATE (
  name,
  status,
  template_id,
  template_version,
  style_overrides,
  job_url,
  application_deadline,
  interview_date,
  application_notes
) ON public.packages TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Service history: append one event.
--    p_dedupe_seconds > 0 skips the append when an event of the same type
--    already exists within that window (a PDF re-download, a retried request)
--    — anywhere in the history, not only as the newest entry, so downloading,
--    writing a letter and downloading again still records one download.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.package_append_event(
  p_package_id      uuid,
  p_user_id         uuid,
  p_event           jsonb,
  p_dedupe_seconds  integer DEFAULT 0
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_events  jsonb[];
BEGIN
  SELECT service_events INTO v_events
    FROM public.packages
   WHERE id = p_package_id AND user_id = p_user_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  IF coalesce(p_dedupe_seconds, 0) > 0 AND EXISTS (
       SELECT 1 FROM unnest(coalesce(v_events, '{}'::jsonb[])) AS e
        WHERE e->>'type' = p_event->>'type'
          AND (e->>'at')::timestamptz > now() - make_interval(secs => p_dedupe_seconds)
     ) THEN
    RETURN true;
  END IF;

  UPDATE public.packages
     SET service_events = array_append(coalesce(service_events, '{}'::jsonb[]), p_event)
   WHERE id = p_package_id AND user_id = p_user_id;
  RETURN true;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3) Cover letter: append the letter and its event in one statement.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.package_append_cover_letter(
  p_package_id  uuid,
  p_user_id     uuid,
  p_letter      jsonb,
  p_event       jsonb
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH updated AS (
    UPDATE public.packages
       SET cover_letters  = array_append(coalesce(cover_letters, '{}'::jsonb[]), p_letter),
           service_events = array_append(coalesce(service_events, '{}'::jsonb[]), p_event)
     WHERE id = p_package_id AND user_id = p_user_id
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

-- ---------------------------------------------------------------------------
-- 4) Interview Q&A: replace the current set (existing product behaviour — a new
--    set supersedes the old) and record the event, atomically.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.package_set_interview_questions(
  p_package_id  uuid,
  p_user_id     uuid,
  p_questions   jsonb,
  p_event       jsonb
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH updated AS (
    UPDATE public.packages
       SET interview_questions = p_questions,
           service_events      = array_append(coalesce(service_events, '{}'::jsonb[]), p_event)
     WHERE id = p_package_id AND user_id = p_user_id
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

-- ---------------------------------------------------------------------------
-- 5) Mock interview: start a run (append).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.package_append_mock_run(
  p_package_id  uuid,
  p_user_id     uuid,
  p_run         jsonb,
  p_event       jsonb
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH updated AS (
    UPDATE public.packages
       SET mock_interview_runs = array_append(coalesce(mock_interview_runs, '{}'::jsonb[]), p_run),
           service_events      = array_append(coalesce(service_events, '{}'::jsonb[]), p_event)
     WHERE id = p_package_id AND user_id = p_user_id
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

-- ---------------------------------------------------------------------------
-- 6) Mock interview: record one answer. The run must be in progress and the
--    question unanswered — an answer, once saved, is never overwritten.
--    Returns {status, run}; status is one of
--      saved | package_not_found | run_not_found | run_not_in_progress |
--      question_not_found | already_answered
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.package_record_mock_answer(
  p_package_id   uuid,
  p_user_id      uuid,
  p_run_id       text,
  p_question_id  text,
  p_fields       jsonb,
  p_event        jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_runs   jsonb[];
  v_run    jsonb;
  v_ridx   integer;
  v_qs     jsonb;
  v_q      jsonb;
  v_qidx   integer := -1;
  v_n      integer;
  i        integer;
BEGIN
  SELECT mock_interview_runs INTO v_runs
    FROM public.packages
   WHERE id = p_package_id AND user_id = p_user_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'package_not_found');
  END IF;

  FOR i IN 1 .. coalesce(array_length(v_runs, 1), 0) LOOP
    IF v_runs[i]->>'id' = p_run_id THEN
      v_ridx := i;
      EXIT;
    END IF;
  END LOOP;
  IF v_ridx IS NULL THEN
    RETURN jsonb_build_object('status', 'run_not_found');
  END IF;

  v_run := v_runs[v_ridx];
  IF coalesce(v_run->>'status', '') <> 'in_progress' THEN
    RETURN jsonb_build_object('status', 'run_not_in_progress', 'run', v_run);
  END IF;

  v_qs := coalesce(v_run->'questions', '[]'::jsonb);
  v_n := jsonb_array_length(v_qs);
  FOR i IN 0 .. v_n - 1 LOOP
    IF v_qs->i->>'id' = p_question_id THEN
      v_qidx := i;
      EXIT;
    END IF;
  END LOOP;
  IF v_qidx < 0 THEN
    RETURN jsonb_build_object('status', 'question_not_found', 'run', v_run);
  END IF;

  v_q := v_qs->v_qidx;
  IF v_q ? 'answer' AND jsonb_typeof(v_q->'answer') <> 'null' THEN
    RETURN jsonb_build_object('status', 'already_answered', 'run', v_run);
  END IF;

  v_q   := v_q || p_fields;
  v_qs  := jsonb_set(v_qs, ARRAY[v_qidx::text], v_q);
  v_run := jsonb_set(v_run, '{questions}', v_qs);
  v_run := jsonb_set(v_run, '{current_index}', to_jsonb(least(v_qidx + 1, v_n - 1)));
  v_runs[v_ridx] := v_run;

  UPDATE public.packages
     SET mock_interview_runs = v_runs,
         service_events      = array_append(coalesce(service_events, '{}'::jsonb[]), p_event)
   WHERE id = p_package_id AND user_id = p_user_id;

  RETURN jsonb_build_object('status', 'saved', 'run', v_run);
END;
$$;

-- ---------------------------------------------------------------------------
-- 7) Mock interview: complete a run with its final report. A completed run is
--    immutable — a repeated finish returns the saved report unchanged
--    (status already_completed) and writes nothing.
--    Returns {status, run}; status is one of
--      completed | package_not_found | run_not_found | already_completed |
--      no_answers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.package_complete_mock_run(
  p_package_id  uuid,
  p_user_id     uuid,
  p_run_id      text,
  p_report      jsonb,
  p_event       jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_runs      jsonb[];
  v_run       jsonb;
  v_ridx      integer;
  v_answered  integer;
  v_n         integer;
  i           integer;
BEGIN
  SELECT mock_interview_runs INTO v_runs
    FROM public.packages
   WHERE id = p_package_id AND user_id = p_user_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'package_not_found');
  END IF;

  FOR i IN 1 .. coalesce(array_length(v_runs, 1), 0) LOOP
    IF v_runs[i]->>'id' = p_run_id THEN
      v_ridx := i;
      EXIT;
    END IF;
  END LOOP;
  IF v_ridx IS NULL THEN
    RETURN jsonb_build_object('status', 'run_not_found');
  END IF;

  v_run := v_runs[v_ridx];
  IF v_run->>'status' = 'completed' THEN
    RETURN jsonb_build_object('status', 'already_completed', 'run', v_run);
  END IF;

  v_n := jsonb_array_length(coalesce(v_run->'questions', '[]'::jsonb));
  SELECT count(*)::integer INTO v_answered
    FROM jsonb_array_elements(coalesce(v_run->'questions', '[]'::jsonb)) q
   WHERE q ? 'answer' AND jsonb_typeof(q->'answer') <> 'null';
  IF v_answered = 0 THEN
    RETURN jsonb_build_object('status', 'no_answers', 'run', v_run);
  END IF;

  v_run := v_run
    || jsonb_build_object(
         'status', 'completed',
         'completed_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
         'current_index', least(v_answered, greatest(v_n - 1, 0)),
         'final_report', p_report
       );
  v_runs[v_ridx] := v_run;

  UPDATE public.packages
     SET mock_interview_runs = v_runs,
         service_events      = array_append(coalesce(service_events, '{}'::jsonb[]), p_event)
   WHERE id = p_package_id AND user_id = p_user_id;

  RETURN jsonb_build_object('status', 'completed', 'run', v_run);
END;
$$;

-- ---------------------------------------------------------------------------
-- 8) Privileges: server only.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.package_append_event(uuid, uuid, jsonb, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_append_cover_letter(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_set_interview_questions(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_append_mock_run(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_record_mock_answer(uuid, uuid, text, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_complete_mock_run(uuid, uuid, text, jsonb, jsonb) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.package_append_event(uuid, uuid, jsonb, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_append_cover_letter(uuid, uuid, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_set_interview_questions(uuid, uuid, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_append_mock_run(uuid, uuid, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_record_mock_answer(uuid, uuid, text, text, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_complete_mock_run(uuid, uuid, text, jsonb, jsonb) TO service_role;
