-- 047_pending_profile_drafts.sql
--
-- A CV reading waiting for the user's decision (founder request 2026-09-11).
--
-- WHY. Reading a CV is a paid model call, and its result used to live only in
-- the browser tab: a recreate's keep-or-replace screen was React state, and a
-- first-time draft without a name, phone or email was never auto-saved. A
-- refresh or a closed browser threw the paid result away — and, with the
-- monthly recreation limit, one of the user's recreations with it.
--
-- WHAT. One row per user, the latest successful reading, written by the parse
-- routes (/api/parse/upload, /api/parse/text) before they answer. Deleted when
-- the user resolves it: their choice is saved, or they keep their profile as it
-- is. No silent expiry — deleting a reading the user paid for is what this
-- exists to prevent.
--
-- PII. Holds what career_profiles holds, from the same CV. Owner-only RLS, like
-- every table here. Deleted with the account (FK cascade on auth.users) and by
-- "Delete my data" (app/settings/actions.ts) — NOT by the career_profiles
-- cascade, because a first-time user's reading has no profile row to hang off.
--
-- Additive only. Safe to re-run: every statement is IF NOT EXISTS or replaces
-- itself.

CREATE TABLE IF NOT EXISTS public.pending_profile_drafts (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  draft      jsonb NOT NULL,                                        -- types/careerProfile.ts CareerProfileDraft
  source     text NOT NULL CHECK (source IN ('upload', 'paste')),  -- how the CV arrived
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pending_profile_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pending_profile_drafts_owner_all ON public.pending_profile_drafts;
CREATE POLICY pending_profile_drafts_owner_all
  ON public.pending_profile_drafts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Nothing for anonymous callers at all, and none of the table-level privileges
-- migration 040 took away from every other table.
REVOKE ALL ON public.pending_profile_drafts FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.pending_profile_drafts FROM authenticated;
