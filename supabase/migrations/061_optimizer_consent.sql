-- 061_optimizer_consent.sql
--
-- Optimizer v3 (founder decision 2026-10-02): the one-time agreement.
--
-- Moderate and High add points typical of the candidate's own field (never
-- certificates, licences, education, employers, titles, dates or personal
-- details). The first time a user optimizes, they read what each level does and
-- agree: "I will only send CVs that are true about me." From then on they
-- optimize and download in one step, with no line-by-line review.
--
-- WHAT. One nullable timestamp on career_profiles: when they agreed. NULL = not
-- yet. Set server-side by /api/optimize (Phase A) when the request carries the
-- agreement; owner-only RLS on career_profiles covers it. Additive, safe to re-run.

ALTER TABLE public.career_profiles
  ADD COLUMN IF NOT EXISTS optimizer_consent_at timestamptz;
