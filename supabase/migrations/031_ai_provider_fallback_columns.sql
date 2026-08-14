-- ============================================================================
-- Migration 031 — ai_provider_config fallback provider/key columns
--
-- app/admin/actions.ts, app/admin/ai-provider/page.tsx, and
-- lib/ai/providerConfig.ts (committed 2026-08-13, founder-built directly)
-- already read/write `fallback_provider` and `fallback_api_key` on
-- ai_provider_config, but no migration ever added them — migration 019
-- only ever defined `fallback_model` (the OpenRouter-same-account retry
-- fallback). This is that missing migration, written retroactively against
-- already-shipped, already-live code.
--
-- IF NOT EXISTS on both columns: safe to run whether or not these were
-- already added by hand in the Supabase SQL editor. Does not touch
-- `fallback_model`, which migration 019 already defined and which continues
-- to mean something different (the same-provider OpenRouter retry list) —
-- unlike this cross-provider fallback, which is a second, independent
-- provider/model/key tried only after the primary genuinely fails
-- (lib/ai/provider.ts's callProvider()).
--
-- Same RLS posture as migration 019: this table holds live API keys and has
-- no policy for anon/authenticated, service_role only. Additive only.
-- ============================================================================

ALTER TABLE public.ai_provider_config
  ADD COLUMN IF NOT EXISTS fallback_provider text,
  ADD COLUMN IF NOT EXISTS fallback_api_key  text;
