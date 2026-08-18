-- Migration 042 — target job title and industry become optional.
--
-- Founder decision 2026-08-18: when a resume is uploaded, the extracted Career
-- Profile must AUTO-SAVE the moment extraction finishes, so nothing is lost and
-- the user is not asked to press Save.
--
-- THE BLOCKER THIS REMOVES. `target_job_title` and `target_industry` were NOT
-- NULL, but a resume does not state them — the target is the job you are AIMING
-- for, not something written on your CV. So an auto-save straight after
-- extraction would have failed validation on two fields the resume can never
-- supply. Making them nullable is also the correct model: the target belongs to
-- a specific optimization run (collected at /optimize/target), not to the base
-- profile. It mirrors migration 030, which already made `target_country`
-- nullable for the same reason.
--
-- Existing rows are unaffected — a NOT NULL column relaxing to NULL never
-- rewrites data. The API validation and the profile save are updated in the same
-- change so an empty target is stored as NULL rather than an empty string.

alter table public.career_profiles alter column target_job_title drop not null;
alter table public.career_profiles alter column target_industry drop not null;

comment on column public.career_profiles.target_job_title is
  'Optional. The role the user is aiming for. Not on a resume, so it is null after extraction and filled per optimization. Nullable since migration 042.';
comment on column public.career_profiles.target_industry is
  'Optional. Nullable since migration 042 — see target_job_title.';
