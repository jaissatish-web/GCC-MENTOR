-- ============================================================================
-- Migration 024 — allow ai_usage_log.user_id to be NULL (TASK-049 prep)
--
-- The free ATS/Gulf-readiness scanner (TASK-049) is a no-login, anonymous
-- route — there is no authenticated user_id to attach a usage-log row to.
-- ai_usage_log.user_id was NOT NULL (migration 013), which would make
-- logging AI cost for anonymous calls impossible without either faking a
-- user_id (wrong) or silently skipping the log for anonymous routes (a real
-- cost-tracking blind spot on exactly the surface most exposed to abuse,
-- per docs/MVP.md §5 — "unlimited free usage is a genuine cost risk").
--
-- Additive-safe per supabase/migrations/README.md rule 3: relaxing a NOT
-- NULL constraint to nullable does not drop or rename anything, and every
-- existing row already has a non-null user_id, so no existing data is
-- affected. The FK to auth.users(id) is untouched — a NULL user_id simply
-- means "no user," never "an invalid user."
--
-- No RLS/grant change needed here — ai_usage_log is already service-role-
-- only (migration 015), so this does not open any new access path.
-- ============================================================================

ALTER TABLE public.ai_usage_log
  ALTER COLUMN user_id DROP NOT NULL;
