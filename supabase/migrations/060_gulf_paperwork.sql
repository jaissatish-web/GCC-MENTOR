-- 060_gulf_paperwork.sql
--
-- Gulf Readiness v2 (founder decision 2026-10-01): the paperwork and presentation
-- facts Gulf hiring actually checks first, so the readiness verdict can say
-- "ready / almost / not ready" honestly instead of scoring CV text alone.
--
-- All five are OPTIONAL answers on career_profiles. NULL = not answered yet,
-- which the engine reports as "not checked" — never as a failure.
--
--   photo_checklist_confirmed  the user confirmed their photo meets the
--                              professional checklist (plain light background,
--                              formal clothes, head and shoulders, recent). We
--                              cannot judge a photo by code; this is their word.
--   degree_attestation         degree attested for a Gulf work permit
--                              (UAE skill levels 1–3 require it).
--   professional_licence       licence / licensing exam for a regulated job
--                              (health regulators, Saudi Council of Engineers…).
--   saudi_verification         Saudi professional verification (QVP / SVP),
--                              required for most Saudi work visas since 2024–25.
--   arabic_level               spoken Arabic, a plus on Gulf applications.
--
-- No document copies, no numbers — statuses only (docs/15_DECISION_LOG.md
-- standing rule on passports and documents). Owner-only RLS on career_profiles
-- (migration 010+) covers every new column. save_career_profile() (051) writes
-- whichever columns the caller sends, so it needs no change.
-- Additive and safe to re-run.

ALTER TABLE public.career_profiles
  ADD COLUMN IF NOT EXISTS photo_checklist_confirmed boolean,
  ADD COLUMN IF NOT EXISTS degree_attestation text,
  ADD COLUMN IF NOT EXISTS professional_licence text,
  ADD COLUMN IF NOT EXISTS saudi_verification text,
  ADD COLUMN IF NOT EXISTS arabic_level text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'career_profiles_degree_attestation_check') THEN
    ALTER TABLE public.career_profiles ADD CONSTRAINT career_profiles_degree_attestation_check
      CHECK (degree_attestation IS NULL OR degree_attestation IN ('done', 'in_progress', 'not_started', 'not_needed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'career_profiles_professional_licence_check') THEN
    ALTER TABLE public.career_profiles ADD CONSTRAINT career_profiles_professional_licence_check
      CHECK (professional_licence IS NULL OR professional_licence IN ('done', 'in_progress', 'not_started', 'not_needed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'career_profiles_saudi_verification_check') THEN
    ALTER TABLE public.career_profiles ADD CONSTRAINT career_profiles_saudi_verification_check
      CHECK (saudi_verification IS NULL OR saudi_verification IN ('done', 'in_progress', 'not_started', 'not_needed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'career_profiles_arabic_level_check') THEN
    ALTER TABLE public.career_profiles ADD CONSTRAINT career_profiles_arabic_level_check
      CHECK (arabic_level IS NULL OR arabic_level IN ('none', 'basic', 'conversational', 'fluent', 'native'));
  END IF;
END $$;
