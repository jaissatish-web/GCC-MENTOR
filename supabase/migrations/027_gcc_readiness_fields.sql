-- ============================================================================
-- Migration 027 — GCC Readiness data layer: driving license + GCC-tagged
-- work experience.
--
-- Phase 1 of docs/GCC_READINESS_JOB_MATCH.md (founder spec, 2026-08-10),
-- §5 "Driving License" and §5 "GCC Experience". Additive only — no existing
-- column, table, or constraint is touched. No RLS change needed: both
-- targets already have owner-scoped RLS (career_profiles' own policy;
-- profile_work_experience's policy resolved through its parent), which new
-- nullable columns automatically inherit.
--
-- SCOPE DECISION, logged here rather than silently assumed: driving license
-- gets NO field_visibility toggle in this migration. The founder's spec
-- frames it purely as a GCC Readiness / Job Match INPUT ("its importance
-- may depend on the user's profile and/or specific job" — never once framed
-- as "print this on the resume"). Whether it should ever appear on the
-- rendered CV (like passport_type/visa_status do) is a template decision,
-- not a data-layer one — flag to the founder if wanted later rather than
-- guessing a visibility default now.
--
-- SCOPE DECISION #2: GCC experience is NOT a new parallel table. The
-- founder's spec lists Country/Company/Role/Duration/Industry/
-- Responsibilities for "GCC experience" — every one of those already exists
-- per-entry on profile_work_experience except "is this entry GCC-based, and
-- which country." Duplicating company/role/dates into a second table would
-- violate this project's own "avoid duplicating profile data, use
-- references" principle (docs/DASHBOARD_LIBRARY.md architecture,
-- restated in the new spec's own §34). One column, added to the table that
-- already holds the rest of the facts. "Currently in the Gulf" stays a
-- separate, user-declared STATUS field (career_profiles.currently_in_gulf,
-- migration 010) — untouched — this is about the WORK HISTORY, not current
-- status; deriving one from the other is a lib/readiness.ts decision for
-- later, not a schema one now.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Driving license — career_profiles (a fixed identity/relocation field,
-- same category as passport_type/visa_status).
-- has_driving_license is nullable on purpose: NULL = "not yet answered",
-- distinct from FALSE = "explicitly does not have one". The founder's spec
-- is explicit that a missing license must not automatically penalize every
-- candidate — that distinction has to survive into the data itself, not
-- just the scoring logic that reads it later.
-- ---------------------------------------------------------------------------
ALTER TABLE public.career_profiles
  ADD COLUMN IF NOT EXISTS has_driving_license boolean,
  ADD COLUMN IF NOT EXISTS driving_license_country text,
  ADD COLUMN IF NOT EXISTS driving_license_category text,
  ADD COLUMN IF NOT EXISTS driving_license_validity_date date;

-- ---------------------------------------------------------------------------
-- GCC-tagged work experience — profile_work_experience.
-- Reuses target_country_enum (migration 010) rather than a new type — a
-- past GCC job is either a specific member country or, for older resume
-- data where the country isn't clearly stated, 'generic_gulf'. NULL = this
-- entry is not GCC experience at all (the common case for most users).
-- ---------------------------------------------------------------------------
ALTER TABLE public.profile_work_experience
  ADD COLUMN IF NOT EXISTS gcc_country public.target_country_enum;
