import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * AI provider configuration — founder-editable from /admin, migration 019.
 *
 * Server-only (service-role client; the table has no anon/authenticated RLS
 * policy at all). Read live per call, not cached, matching lib/pricing.ts's
 * "an edited value is visible on the next request" behaviour — except this
 * table has no safe default to fall back to when unset, since there's no
 * such thing as a default API key. Absent config is a real "not configured"
 * state, not silently patched over.
 */

export interface AiProviderConfig {
  provider: string
  model: string
  fallbackModel: string | null
  apiKey: string
  updatedAt: string
  updatedBy: string | null
}

export async function getProviderConfig(): Promise<AiProviderConfig | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('provider, model, fallback_model, api_key, updated_at, updated_by')
    .eq('key', 'default')
    .maybeSingle()

  if (error) {
    console.error('ai_provider_config read error', error.message)
    return null
  }
  if (!data) return null

  return {
    provider: data.provider as string,
    model: data.model as string,
    fallbackModel: (data.fallback_model as string | null) ?? null,
    apiKey: data.api_key as string,
    updatedAt: data.updated_at as string,
    updatedBy: (data.updated_by as string | null) ?? null,
  }
}

/**
 * Upsert the single 'default' row. Validation (non-empty provider/model/key)
 * is the caller's responsibility (the admin server action) — this is a
 * dumb write, same division of labour as lib/admin/adminData.ts's other
 * setters.
 */
export async function setProviderConfig(opts: {
  provider: string
  model: string
  fallbackModel: string | null
  apiKey: string
  adminId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ai_provider_config').upsert(
    {
      key: 'default',
      provider: opts.provider,
      model: opts.model,
      fallback_model: opts.fallbackModel,
      api_key: opts.apiKey,
      updated_by: opts.adminId,
    },
    { onConflict: 'key' }
  )

  if (error) {
    console.error('ai_provider_config write error', error.message)
    return { ok: false, error: 'Failed to save the AI provider configuration' }
  }
  return { ok: true }
}
