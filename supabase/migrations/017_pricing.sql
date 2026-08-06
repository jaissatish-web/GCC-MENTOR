-- ============================================================================
-- Migration 017 — pricing config
--
-- Founder request: pricing is not finalized (one resume package today, more
-- services planned — ATS score, cover letter, interview Q&A, mock interview,
-- per docs/MVP.md's phased rollout) and must never be hard-coded in the app.
-- Changing a price should be a row edit in the Supabase Table Editor, visible
-- on the next page load — no code change, no redeploy.
--
-- This extends docs/RULES.md §5's existing open decision ("keep packages and
-- payment records model-neutral so tiers can be added without migration") one
-- step further: the number itself is data, not code, from day one.
--
-- SCHEMA NOTE: `key` is a natural text primary key, not a UUID. This is
-- config data, not user data — a UUID would only make it harder for the
-- founder to identify which row is which while editing directly in the
-- Table Editor. Deliberate exception to the usual UUID-PK convention.
--
-- RLS: public SELECT only (anon + authenticated) — pricing is not sensitive,
-- it is literally displayed on the public landing page. No INSERT/UPDATE/
-- DELETE policy for any app role: the only writer is the founder, editing
-- directly via the Supabase dashboard (which uses the table-owner role and
-- bypasses RLS entirely) — same manual-editing model as every migration in
-- this project. If a future ticket needs the app itself to write prices
-- (e.g. an admin pricing screen), that is a new decision, not assumed here.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pricing (
  key         text PRIMARY KEY,
  label       text NOT NULL,
  amount_inr  integer NOT NULL CHECK (amount_inr >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_public_read ON public.pricing;
CREATE POLICY pricing_public_read
  ON public.pricing
  FOR SELECT
  TO anon, authenticated
  USING (true);

INSERT INTO public.pricing (key, label, amount_inr) VALUES
  ('resume_optimization', 'Optimize resume for a job', 499)
ON CONFLICT (key) DO NOTHING;
