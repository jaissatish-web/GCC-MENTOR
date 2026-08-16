-- Migration 036 — a resume the user can name (TASK-139).
--
-- Until now a resume was identified in the Library only by its target job
-- title, which the user cannot change and which is often identical across
-- several attempts at the same role. Someone with four resumes aimed at
-- "Senior Mechanical Engineer" saw four identical rows.
--
-- `name` is what the USER calls it ("Aramco application", "Short version").
-- NULL means they have not renamed it, and the UI falls back to the target job
-- title — the label they see today — so nothing changes until they choose to
-- change it. Deliberately not backfilled with a copy of the title: a written
-- value would look like a name the user chose.

alter table public.packages
  add column if not exists name text;

comment on column public.packages.name is
  'User-chosen label for this resume, editable any time. NULL = never renamed; display falls back to target_job_title.';
