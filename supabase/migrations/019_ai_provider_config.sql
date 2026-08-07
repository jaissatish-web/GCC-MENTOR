-- ============================================================================
-- Migration 019 — ai_provider_config
--
-- Founder-editable AI provider/model/key, controlled from /admin instead of
-- hard-coded in application code or environment variables — same reasoning
-- as migration 017's pricing table ("changing it must not need a code change
-- or redeploy"), applied to the AI provider itself. Founder request
-- 2026-08-07: control provider/model/key from the admin panel, with the
-- data shape ready for a v2 fallback model (OpenRouter's own `models` +
-- `route: fallback` retry feature — no custom fallback logic needed here).
--
-- SINGLE ROW, unlike pricing's multi-key table: there is exactly one active
-- AI provider configuration for the whole app at a time (lib/ai/provider.ts
-- is the ONLY caller of any model, per TASK-015). `key` stays for the same
-- upsert-by-key convention as `pricing`, but only 'default' is ever used.
--
-- SERVICE-ROLE ONLY — unlike pricing, which is intentionally public-SELECT
-- (a price is not a secret). This table holds a live API key, so it follows
-- pii_access_log / optimization_credits' locked-down model instead: no
-- policy for `anon` or `authenticated` at all. Only lib/ai/provider.ts
-- (server-only, already the sole holder of the old ANTHROPIC_API_KEY env
-- var) and the admin server action read/write it, both via the service-role
-- client.
--
-- Additive only. No table dropped or altered.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_provider_config (
  key            text PRIMARY KEY DEFAULT 'default',
  provider       text NOT NULL,           -- e.g. 'openrouter'
  model          text NOT NULL,           -- e.g. 'anthropic/claude-sonnet-4.5'
  fallback_model text,                    -- nullable; v2 — OpenRouter models[] + route:'fallback'
  api_key        text NOT NULL,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL -- which admin last changed it
);

DROP TRIGGER IF EXISTS ai_provider_config_set_updated_at ON public.ai_provider_config;
CREATE TRIGGER ai_provider_config_set_updated_at
  BEFORE UPDATE ON public.ai_provider_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — service-role only. No policy for anon/authenticated: a live API key
-- must never be readable by a normal session, matching pii_access_log
-- (migration 013) and optimization_credits (migration 018).
-- ---------------------------------------------------------------------------
REVOKE ALL PRIVILEGES ON public.ai_provider_config FROM anon;
REVOKE ALL PRIVILEGES ON public.ai_provider_config FROM authenticated;
REVOKE ALL PRIVILEGES ON public.ai_provider_config FROM service_role;

GRANT SELECT, INSERT, UPDATE ON public.ai_provider_config TO service_role;

ALTER TABLE public.ai_provider_config ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS ai_provider_config_service_all ON public.ai_provider_config;
  CREATE POLICY ai_provider_config_service_all
    ON public.ai_provider_config
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  -- Deliberately NO policy for `authenticated` or `anon`.
END $$;

-- No seed row. lib/ai/provider.ts treats an absent row as "not configured
-- yet" and throws a clear, typed error rather than falling back to any
-- guessed default model/key — there is no safe default for a live secret,
-- unlike pricing's ₹499 fallback. The admin panel shows an empty form until
-- the founder saves one.
