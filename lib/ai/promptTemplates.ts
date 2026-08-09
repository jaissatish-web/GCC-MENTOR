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
