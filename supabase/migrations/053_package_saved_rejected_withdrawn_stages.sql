-- ============================================================================
-- Migration 053 — application stages: saved / rejected / withdrawn
-- Audit 2026-09-15: M07. Preparing a CV for a job is not the same as applying
-- for it, and the stage list had no way to say "saved, not applied yet", nor
-- how an application ended if it did not end in an offer.
--
-- ADDITIVE: three enum values. No existing row is changed — packages already
-- marked 'applied' stay 'applied', because there is no reliable evidence of
-- which of them were really submitted.
--
-- HOW A NEW PACKAGE BECOMES 'saved': through the COLUMN DEFAULT set by migration
-- 055, not through application code. app/api/optimize/route.ts does not send a
-- status at all, so a new row takes whatever the column default is — 'applied'
-- until 055 is applied, 'saved' afterwards. This file only adds enum values.
--
-- Run on its own: Postgres does not allow a new enum value to be USED in the
-- same transaction that adds it.
-- ============================================================================

ALTER TYPE public.package_status_enum ADD VALUE IF NOT EXISTS 'saved' BEFORE 'applied';
ALTER TYPE public.package_status_enum ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE public.package_status_enum ADD VALUE IF NOT EXISTS 'withdrawn';
