-- Migration 035 — template selection and versioning (TASK-136).
--
-- Implements §14 and §18 of the template-system spec: every saved resume
-- records WHICH template rendered it and WHICH VERSION of that template, so a
-- document stays reproducible after a template is revised.
--
-- WHY BOTH COLUMNS. template_id alone is not enough. When gcc_engineering v2
-- ships with different spacing, every resume ever generated with v1 would
-- silently change shape on next open. Storing the version means an old resume
-- can keep rendering the way it was delivered, which is the same promise
-- migration 034's document_snapshot makes about content.
--
-- NULL means "generated before templates were selectable". Those render with
-- the default (gulf_premium), which is exactly what they were rendered with —
-- so nothing changes for an existing user, per §37 backward compatibility.
-- Deliberately NOT backfilled: a written value would claim the user chose it.
--
-- No new table. The spec (§36, §38) says extend rather than duplicate, and a
-- template choice is a property of the resume, not an entity of its own.

alter table public.packages
  add column if not exists template_id text;

alter table public.packages
  add column if not exists template_version integer;

comment on column public.packages.template_id is
  'Stable template id from lib/templates.ts (e.g. gulf_premium, ats_classic). NULL = pre-selection, renders with the default.';

comment on column public.packages.template_version is
  'Version of that template at generation time, so a later template revision cannot restyle an already-delivered resume.';
