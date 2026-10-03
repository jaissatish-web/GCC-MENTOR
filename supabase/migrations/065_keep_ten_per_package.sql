-- Every generated Q&A set is kept, and each package keeps its 10 newest
-- cover letters, Q&A sets and mock interviews (2026-10-03, founder decision).
--
-- Before this, interview_questions held ONE set and a new one overwrote it,
-- while letters and mock runs were appended without limit. Now all three are
-- lists capped at 10 per package: when an 11th is saved the oldest is dropped.
-- The cap protects storage and will line up with per-service points when
-- services become chargeable.
--
-- interview_questions stays as "the newest set", so every existing reader
-- (summaries, the workspace, readiness ticks) keeps working unchanged.
--
-- Additive: one new column, server-only like the other generated columns
-- (migration 050's GRANT UPDATE lists only user metadata columns, so
-- authenticated users cannot write it). Existing sets are copied in, so nothing
-- is lost.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS interview_question_sets jsonb[] NOT NULL DEFAULT '{}'::jsonb[];

UPDATE public.packages
   SET interview_question_sets = ARRAY[interview_questions]
 WHERE interview_questions IS NOT NULL
   AND cardinality(interview_question_sets) = 0;

-- Cover letters: append, keep the newest 10.
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
    UPDATE public.packages p
       SET cover_letters  = (SELECT s.a[greatest(1, cardinality(s.a) - 9):]
                               FROM (SELECT array_append(coalesce(p.cover_letters, '{}'::jsonb[]), p_letter) AS a) s),
           service_events = array_append(coalesce(p.service_events, '{}'::jsonb[]), p_event)
     WHERE p.id = p_package_id AND p.user_id = p_user_id
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

-- Q&A: the new set is the newest (interview_questions) AND appended to the
-- list, which keeps the newest 10.
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
    UPDATE public.packages p
       SET interview_questions     = p_questions,
           interview_question_sets = (SELECT s.a[greatest(1, cardinality(s.a) - 9):]
                                        FROM (SELECT array_append(coalesce(p.interview_question_sets, '{}'::jsonb[]), p_questions) AS a) s),
           service_events          = array_append(coalesce(p.service_events, '{}'::jsonb[]), p_event)
     WHERE p.id = p_package_id AND p.user_id = p_user_id
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

-- Mock interviews: append a run, keep the newest 10.
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
    UPDATE public.packages p
       SET mock_interview_runs = (SELECT s.a[greatest(1, cardinality(s.a) - 9):]
                                    FROM (SELECT array_append(coalesce(p.mock_interview_runs, '{}'::jsonb[]), p_run) AS a) s),
           service_events      = array_append(coalesce(p.service_events, '{}'::jsonb[]), p_event)
     WHERE p.id = p_package_id AND p.user_id = p_user_id
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM updated);
$$;

REVOKE EXECUTE ON FUNCTION public.package_append_cover_letter(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_set_interview_questions(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.package_append_mock_run(uuid, uuid, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.package_append_cover_letter(uuid, uuid, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_set_interview_questions(uuid, uuid, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.package_append_mock_run(uuid, uuid, jsonb, jsonb) TO service_role;
