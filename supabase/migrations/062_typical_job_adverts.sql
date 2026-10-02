-- Typical Gulf job adverts for a job TITLE (2026-10-02, founder: many Gulf
-- jobs arrive by WhatsApp or an agent with only a title).
--
-- When the user has no advert, the optimizer writes ONE typical advert for the
-- title — without seeing anyone's profile — and keeps it here, so every user
-- targeting the same title is matched against the same requirements
-- (consistent, honest, and one model call per title instead of per user).
--
-- Shared reference text, not user data: no user_id, nothing personal. Written
-- and read only by the server with the service role; RLS is on with no
-- policies, so the anon and authenticated roles cannot touch it.
CREATE TABLE IF NOT EXISTS public.typical_job_adverts (
  key         text PRIMARY KEY CHECK (char_length(key) BETWEEN 2 AND 400),  -- normalised "title|industry"
  title       text NOT NULL,
  industry    text,
  advert      text NOT NULL CHECK (char_length(advert) BETWEEN 200 AND 12000),
  model       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.typical_job_adverts ENABLE ROW LEVEL SECURITY;
