-- Migration 043 — packages.target_industry becomes optional.
--
-- Founder decision 2026-08-18: the target industry on the resume optimization
-- screen (/optimize/target) should not be a required choice. The prompt
-- builder already has a graceful fallback for any unset or unrecognized
-- industry — getPersona() (lib/ai/personas.ts) returns the generic Gulf
-- recruitment-specialist persona whenever the value has no dedicated persona,
-- including an empty string. So requiring it here bought nothing: the AI
-- pipeline was already prepared to run without it.
--
-- Mirrors migration 030 (target_country) and migration 042
-- (career_profiles.target_job_title / target_industry) — the same reasoning
-- applied to the one remaining NOT NULL target field, this time on `packages`
-- rather than `career_profiles`.
--
-- Existing rows are unaffected — relaxing NOT NULL to nullable never rewrites
-- data. The API validation (app/api/optimize/route.ts), the prompt builders
-- (lib/ai/buildOptimizationPrompt.ts, lib/ai/buildCoverLetterPrompt.ts) and
-- the optimize/target UI are updated in the same change.

alter table public.packages alter column target_industry drop not null;

comment on column public.packages.target_industry is
  'Optional. Persona selection for the optimization prompt — drives which reviewer voice writes the resume. Null falls back to the generic Gulf recruitment-specialist persona (lib/ai/personas.ts). Nullable since migration 043.';
