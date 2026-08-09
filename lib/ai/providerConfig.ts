import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * AI provider configuration — founder-editable from /admin, migration 019.
 *
 * PER-CALL-SITE, not just one global row (TASK-062, 2026-08-09 founder
 * request: "even for each LLM call... I can choose from the admin panel").
 * No new migration needed — migration 019 already made `key` a free-text
 * primary key, not constrained to the single literal 'default' it happened
 * to be the only caller of until now. `key` is a feature/call-site
 * identifier: 'default', 'extraction', 'optimization', 'ats_scan',
 * 'cover_letter', etc. — free-text by the same convention as
 * `rate_limits.action` and `prompt_templates.key` elsewhere in this schema.
 *
 * FALLBACK, not a hard requirement per feature: `getProviderConfig(key)`
 * falls back to the 'default' row when no row exists for the specific key.
 * This means the founder only ever HAS to configure 'default' once for
 * every feature to work — a per-feature override is optional, added only
 * when they actually want one feature on a different model.
 *
 * Server-only (service-role client; the table has no anon/authenticated RLS
 * policy at all). Read live per call, not cached, matching lib/pricing.ts's
 * "an edited value is visible on the next request" behaviour — except this
 * table has no safe default to fall back to when even 'default' is unset,
 * since there's no such thing as a default API key. Absent config is a real
 * "not configured" state, not silently patched over.
 */

export const AI_CONFIG_KEY_DEFAULT = 'default'

export interface AiProviderConfig {
  key: string
  provider: string
  model: string
  fallbackModel: string | null
  apiKey: string
  updatedAt: string
  updatedBy: string | null
}

/**
 * Exact-key lookup, no fallback to 'default'. Use this (not
 * getProviderConfig) when the caller needs to know whether THIS SPECIFIC
 * key has its own saved row — e.g. the admin "keep existing key on blank
 * submission" flow, which must never silently borrow 'default'’s API key
 * into a different row.
 */
export async function getProviderConfigExact(key: string): Promise<AiProviderConfig | null> {
  return readConfigRow(key)
}

async function readConfigRow(key: string): Promise<AiProviderConfig | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('key, provider, model, fallback_model, api_key, updated_at, updated_by')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    console.error('ai_provider_config read error: key=' + key, error.message)
    return null
  }
  if (!data) return null

  return {
    key: data.key as string,
    provider: data.provider as string,
    model: data.model as string,
    fallbackModel: (data.fallback_model as string | null) ?? null,
    apiKey: data.api_key as string,
    updatedAt: data.updated_at as string,
    updatedBy: (data.updated_by as string | null) ?? null,
  }
}

/**
 * Resolve the config for a call site: the specific key's row if one exists,
 * otherwise the 'default' row, otherwise null ("not configured at all").
 * Every caller of lib/ai/provider.ts's generate() should pass its real
 * feature key here (via configKey) rather than relying on the implicit
 * 'default' — see docs/TASKS.md TASK-062 for the list of known keys.
 */
export async function getProviderConfig(key: string = AI_CONFIG_KEY_DEFAULT): Promise<AiProviderConfig | null> {
  const specific = await readConfigRow(key)
  if (specific) return specific
  if (key === AI_CONFIG_KEY_DEFAULT) return null
  return readConfigRow(AI_CONFIG_KEY_DEFAULT)
}

/**
 * Upsert one keyed row. Validation (non-empty provider/model/key) is the
 * caller's responsibility (the admin server action) — this is a dumb
 * write, same division of labour as lib/admin/adminData.ts's other setters.
 */
export async function setProviderConfig(opts: {
  key?: string
  provider: string
  model: string
  fallbackModel: string | null
  apiKey: string
  adminId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = opts.key?.trim() || AI_CONFIG_KEY_DEFAULT
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ai_provider_config').upsert(
    {
      key,
      provider: opts.provider,
      model: opts.model,
      fallback_model: opts.fallbackModel,
      api_key: opts.apiKey,
      updated_by: opts.adminId,
    },
    { onConflict: 'key' }
  )

  if (error) {
    console.error('ai_provider_config write error: key=' + key, error.message)
    return { ok: false, error: 'Failed to save the AI provider configuration' }
  }
  return { ok: true }
}

/** All configured rows (not resolved/fallback — the raw list), for the admin UI. */
export async function listProviderConfigs(): Promise<AiProviderConfig[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('key, provider, model, fallback_model, api_key, updated_at, updated_by')
    .order('key')

  if (error) {
    console.error('ai_provider_config list error', error.message)
    return []
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    key: r.key as string,
    provider: r.provider as string,
    model: r.model as string,
    fallbackModel: (r.fallback_model as string | null) ?? null,
    apiKey: r.api_key as string,
    updatedAt: r.updated_at as string,
    updatedBy: (r.updated_by as string | null) ?? null,
  }))
}

/**
 * Delete a per-feature override, falling back to 'default' again. Deleting
 * 'default' itself is allowed (same as never having set it) but not
 * special-cased — the caller sees the same "not configured" behavior it
 * would if 'default' had never been created.
 */
export async function deleteProviderConfig(key: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ai_provider_config').delete().eq('key', key)
  if (error) {
    console.error('ai_provider_config delete error: key=' + key, error.message)
    return { ok: false, error: 'Could not remove this override' }
  }
  return { ok: true }
}
