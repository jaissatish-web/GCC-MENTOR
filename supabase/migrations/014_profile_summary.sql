-- ============================================================================
-- Migration 014 — professional_summary on career_profiles
-- Per docs/CAREER_PROFILE.md §2, "Professional summary".
--
-- The user's OWN summary — the source side of an AI-rewritten block, exactly
-- like work-description bullets. The AI's rewrite lives in
-- packages.optimized_content.summary.generated (docs/DASHBOARD_LIBRARY.md §4);
-- this column is that block's source_profile_summary, the "before" the diff
-- renders against.
--
-- NEVER write generated text back into this column. Doing so destroys the
-- "before" permanently and makes the diff impossible on every later run —
-- the exact failure the previous build shipped (DASHBOARD_LIBRARY.md §4).
--
-- Nullable by design: the manual and fresher onboarding paths often have no
-- existing summary. Consumers must handle null as "no before", not as empty.
--
-- No field_visibility key is added: the summary is core resume content, not a
-- disclosure decision, and the spec states it gets no toggle.
--
-- Additive only. No RLS change — the column inherits career_profiles' existing
-- owner-only policy from migration 010. No other column or table is touched.
-- ============================================================================

ALTER TABLE public.career_profiles
  ADD COLUMN IF NOT EXISTS professional_summary text;
