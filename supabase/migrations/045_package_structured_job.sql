-- 045 — store the structured job description on the package.
--
-- WHY: /api/optimize Phase B made TWO sequential model calls when a job
-- description was present — structuring the advert, then writing the resume.
-- Measured 2026-09-05 on the same request: 9.6s to structure, 18.4s to write,
-- 29.6s total locally. Against production that exceeded Vercel's function
-- ceiling and returned 504 FUNCTION_INVOCATION_TIMEOUT, while passing locally.
-- The account is on the Hobby plan, where 60s is a hard cap that no
-- maxDuration setting can raise, so the only fix is to make Phase B do less.
--
-- Structuring the advert depends ONLY on the advert, never on the profile, so
-- it can happen in Phase A — which today makes no model call and returns in
-- milliseconds. Phase B then reads the structured result and spends its whole
-- budget on the one call that actually writes the resume.
--
-- Deliberately storing the STRUCTURED JOB and not the computed match
-- categories: categories depend on the profile, which the user may edit
-- between creating a package and generating it. Phase B recomputes them from
-- this column against the profile as it stands at generation time, so the
-- findings stay correct.
--
-- Nullable, with no backfill. Packages created before this migration, and any
-- package with no job description, simply have NULL — Phase B falls back to
-- structuring inline exactly as it did before, so nothing that works today
-- stops working.

alter table public.packages
  add column if not exists structured_job jsonb;

comment on column public.packages.structured_job is
  'The job description parsed into structured requirements, produced in Phase A so Phase B stays inside the serverless function timeout. NULL means no job description, or a package created before migration 045 — Phase B then structures it inline.';
