import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * Admin-editable prompt FRAMING text — founder-editable from /admin,
 * migration 025.
 *
 * SCOPE BOUNDARY, enforced by what callers are allowed to do with the
 * returned string, not just by convention — read migration 025's header
 * comment before adding a new key. A template returned from here may only
 * ever be used as an intro/persona/tone paragraph, concatenated BEFORE a
 * caller's own hard-coded grounding constraint and output-schema
 * instructions. Never interpolate a template's content into a position
 * where it could replace or precede-and-override the grounding block, and
 * never let a template control the output JSON schema.
 *
 * Server-only (service-role client; no anon/authenticated RLS policy at
 * all, same as ai_provider_config). Read live per call, not cached — an
 * edited value is visible on the next request, matching lib/pricing.ts and
 * lib/ai/providerConfig.ts's behaviour.
 */

/**
 * Template keys that a live AI call actually reads today.
 *
 * `ats_scan_intro` (the only row migration 025 seeds) is deliberately NOT here:
 * since TASK-109 the free scan is computed by lib/gccReadiness/analyzeResume.ts
 * with no model call, so nothing consumes that template any more. Editing it
 * still saves, and would still take effect if the scan ever returns to a
 * prompt — but it changes nothing today, and the admin screen says so rather
 * than showing a form that quietly does nothing.
 *
 * Add a key here the moment a real call site starts reading it.
 */
export const LIVE_PROMPT_TEMPLATE_KEYS: readonly string[] = []

export async function getPromptTemplate(key: string): Promise<string | null> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('content')
    .eq('key', key)
    .maybeSingle()

  if (error) {
    console.error('prompt_templates read error: key=' + key, error.message)
    return null
  }
  return (data?.content as string | undefined) ?? null
}

/**
 * List ALL prompt templates, ordered by key — for the admin list view.
 */
export async function getAllPromptTemplates(): Promise<
  { key: string; description: string | null; content: string; updatedBy: string | null; updatedAt: string | null }[]
> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('prompt_templates')
    .select('key, description, content, updated_by, updated_at')
    .order('key')
  if (error) {
    console.error('prompt_templates list error:', error.message)
    return []
  }
  return (data ?? []).map((row: Record<string, unknown>) => ({
    key: row.key as string,
    description: (row.description as string | null) ?? null,
    content: (row.content as string) ?? '',
    updatedBy: (row.updated_by as string | null) ?? null,
    updatedAt: (row.updated_at as string | null) ?? null,
  }))
}

/**
 * Upsert a template. Validation (non-empty content) is the caller's
 * responsibility (the admin server action) — this is a dumb write, same
 * division of labour as lib/ai/providerConfig.ts's setProviderConfig.
 */
export async function setPromptTemplate(opts: {
  key: string
  content: string
  adminId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('prompt_templates').upsert(
    {
      key: opts.key,
      content: opts.content,
      updated_by: opts.adminId,
    },
    { onConflict: 'key' }
  )

  if (error) {
    console.error('prompt_templates write error: key=' + opts.key, error.message)
    return { ok: false, error: 'Failed to save the prompt template' }
  }
  return { ok: true }
}