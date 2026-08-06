-- ============================================================================
-- Migration 015 — tighten ai_usage_log to service-role only
--
-- CTO follow-up, found during TASK-039 review. Migration 013 gave
-- ai_usage_log an owner-only "FOR ALL" policy (USING user_id = auth.uid()),
-- the same pattern as ordinary user-owned tables. That means a normal
-- authenticated session could SELECT its own rows — including
-- estimated_cost_inr, which is internal unit-economics data
-- (docs/ADMIN.md §5) with no documented end-user use case. The only writer
-- is lib/ai/provider.ts, which already uses the service-role client.
--
-- This brings ai_usage_log in line with pii_access_log's model
-- (migration 013): explicit REVOKE, GRANT to service_role only, no
-- authenticated/anon access of any kind. Additive-safe — no table or column
-- is dropped, only the access policy on an existing table is replaced.
-- ============================================================================

DROP POLICY IF EXISTS ai_usage_log_owner_all ON public.ai_usage_log;

REVOKE ALL PRIVILEGES ON public.ai_usage_log FROM anon;
REVOKE ALL PRIVILEGES ON public.ai_usage_log FROM authenticated;
REVOKE ALL PRIVILEGES ON public.ai_usage_log FROM service_role;
GRANT SELECT, INSERT ON public.ai_usage_log TO service_role;

DO $$
BEGIN
  DROP POLICY IF EXISTS ai_usage_log_service_insert ON public.ai_usage_log;
  CREATE POLICY ai_usage_log_service_insert
    ON public.ai_usage_log
    FOR INSERT
    TO service_role
    WITH CHECK (true);

  DROP POLICY IF EXISTS ai_usage_log_service_select ON public.ai_usage_log;
  CREATE POLICY ai_usage_log_service_select
    ON public.ai_usage_log
    FOR SELECT
    TO service_role
    USING (true);
END $$;
