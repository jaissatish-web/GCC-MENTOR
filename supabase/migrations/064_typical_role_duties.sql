-- Typical duties for a job TITLE (2026-10-03, launch audit I1).
--
-- Many Gulf CVs list jobs with no duties at all (title, employer, dates). The
-- optimizer then has nothing true to work from. The Career Profile offers
-- "typical duties of a <title> — tick what you really did", generated ONCE
-- per normalised title WITHOUT seeing anyone's profile and kept here, so every
-- user with the same title sees the same list (consistent, one model call per
-- title instead of per user).
--
-- Shared reference text, not user data: no user_id, nothing personal. Written
-- and read only by the server with the service role; RLS on with no policies.
CREATE TABLE IF NOT EXISTS public.typical_role_duties (
  key         text PRIMARY KEY CHECK (char_length(key) BETWEEN 2 AND 200),  -- normalised title
  title       text NOT NULL,
  duties      jsonb NOT NULL CHECK (jsonb_typeof(duties) = 'array' AND jsonb_array_length(duties) BETWEEN 4 AND 14),
  model       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.typical_role_duties ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.typical_role_duties FROM anon, authenticated;
GRANT SELECT, INSERT ON public.typical_role_duties TO service_role;
