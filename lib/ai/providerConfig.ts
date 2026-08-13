import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

export const AI_CONFIG_KEY_DEFAULT = 'default'

export interface AiProviderConfig {
  key: string
  provider: string
  model: string
  apiKey: string
  fallbackEnabled: boolean
  fallbackProvider: string | null
  fallbackModel: string | null
  fallbackApiKey: string | null
  updatedAt: string
  updatedBy: string | null
}

function mapConfig(data: Record<string, unknown>): AiProviderConfig {
  const fallbackProvider = (data.fallback_provider as string | null) ?? null
  const fallbackModel = (data.fallback_model as string | null) ?? null
  const fallbackApiKey = (data.fallback_api_key as string | null) ?? null
  return {
    key: data.key as string,
    provider: data.provider as string,
    model: data.model as string,
    apiKey: data.api_key as string,
    fallbackEnabled: Boolean(fallbackProvider && fallbackModel && fallbackApiKey),
    fallbackProvider,
    fallbackModel,
    fallbackApiKey,
    updatedAt: data.updated_at as string,
    updatedBy: (data.updated_by as string | null) ?? null,
  }
}

async function readConfigRow(key: string): Promise<AiProviderConfig | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('key, provider, model, api_key, fallback_provider, fallback_model, fallback_api_key, updated_at, updated_by')
    .eq('key', key)
    .maybeSingle()
  if (error) {
    console.error('ai_provider_config read error: key=' + key, error.message)
    return null
  }
  return data ? mapConfig(data as Record<string, unknown>) : null
}

export async function getProviderConfigExact(key: string): Promise<AiProviderConfig | null> {
  return readConfigRow(key)
}

export async function getProviderConfig(key: string = AI_CONFIG_KEY_DEFAULT): Promise<AiProviderConfig | null> {
  const specific = await readConfigRow(key)
  if (specific) return specific
  if (key === AI_CONFIG_KEY_DEFAULT) return null
  return readConfigRow(AI_CONFIG_KEY_DEFAULT)
}

export async function setProviderConfig(opts: {
  key?: string
  provider: string
  model: string
  fallbackProvider: string | null
  fallbackModel: string | null
  apiKey: string
  fallbackApiKey: string | null
  adminId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = opts.key?.trim() || AI_CONFIG_KEY_DEFAULT
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ai_provider_config').upsert({
    key,
    provider: opts.provider,
    model: opts.model,
    api_key: opts.apiKey,
    fallback_provider: opts.fallbackProvider,
    fallback_model: opts.fallbackModel,
    fallback_api_key: opts.fallbackApiKey,
    updated_by: opts.adminId,
  }, { onConflict: 'key' })
  if (error) {
    console.error('ai_provider_config write error: key=' + key, error.message)
    return { ok: false, error: 'Failed to save the AI provider configuration' }
  }
  return { ok: true }
}

export async function listProviderConfigs(): Promise<AiProviderConfig[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('key, provider, model, api_key, fallback_provider, fallback_model, fallback_api_key, updated_at, updated_by')
    .order('key')
  if (error) {
    console.error('ai_provider_config list error', error.message)
    return []
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map(mapConfig)
}

export async function deleteProviderConfig(key: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('ai_provider_config').delete().eq('key', key)
  if (error) {
    console.error('ai_provider_config delete error: key=' + key, error.message)
    return { ok: false, error: 'Could not remove this override' }
  }
  return { ok: true }
}
