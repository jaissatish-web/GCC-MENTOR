-- 059_pending_draft_parse_report.sql
--
-- Resume parsing v2 (2026-10-01, lib/resumeParse): keep the reader's report
-- with the CV reading it describes.
--
-- WHAT. One nullable jsonb column on pending_profile_drafts (migration 047):
-- how long the read took, how many model calls, layout notes ("pdf: page 1
-- read as two columns"), and the "please check" list the Career Profile editor
-- shows — FIELD PATHS and fixed messages only, never a value from the CV. So a
-- reading reopened after a refresh still shows what to check.
--
-- Additive and nullable: rows written before it simply have no report, and the
-- app reads and writes the table with or without the column (lib/pendingDraft.ts,
-- app/api/profile/pending-draft/route.ts), so deploy order does not matter.
-- RLS is unchanged — the owner-only policy from 047 covers every column.
-- Safe to re-run.

ALTER TABLE public.pending_profile_drafts
  ADD COLUMN IF NOT EXISTS report jsonb;
