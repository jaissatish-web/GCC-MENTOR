-- Migration 034 — freeze what was delivered (TASK-132).
--
-- THE BUG THIS CLOSES. A package freezes only the AI-written TEXT
-- (optimized_content) and the visibility toggles (field_visibility_snapshot).
-- Every fixed field — name, contact details, nationality, education,
-- certifications, photo — is read LIVE from career_profiles at render time, by
-- app/api/packages/[id]/pdf, /preview-image and the on-screen /package/[id].
--
-- So editing the Career Profile silently rewrites resumes the user has ALREADY
-- PAID FOR. Re-downloading a CV bought last week can produce a different
-- document. Found while answering the founder's question about what happens
-- when an existing user uploads a new resume: that path replaces the profile
-- wholesale (docs/TASKS.md Unplanned #13), which turns this from a slow drift
-- into an immediate, total rewrite of every delivered document.
--
-- WHAT IS STORED, and what deliberately is not. document_snapshot holds the
-- output of buildResumeDocument() — the RENDERED document: exactly the lines
-- that appear on the CV, with field visibility already applied. It is not a
-- copy of career_profiles. A field the user chose to hide, or that this
-- template never prints, is absent from the snapshot rather than duplicated
-- into a second table. That matters because these columns are not encrypted at
-- rest: the snapshot must not become a second, wider copy of someone's
-- passport and visa details.
--
-- NULL means "generated before this migration" — those packages keep rendering
-- from the live profile exactly as they do today, so nothing breaks and no
-- backfill is invented from data we cannot reconstruct.

alter table public.packages
  add column if not exists document_snapshot jsonb;

comment on column public.packages.document_snapshot is
  'The rendered resume as delivered: buildResumeDocument() output, field visibility already applied. Written once at generation. Renderers prefer it over the live profile so a paid document can never change after purchase. NULL = generated before migration 034; those fall back to the live profile.';
