import { createClient } from '@/lib/supabase/server'
import { DEFAULT_TEMPLATE_ID, isTemplateId, type TemplateId } from '@/lib/templates'

/**
 * What the FREE plan includes (TASK-163, migration 039).
 *
 * ONE QUESTION, ONE ANSWER. Every gate in the product asks this module rather than
 * carrying its own copy of the rule, so the founder changes the free tier in one
 * place — a table he edits from /admin — instead of asking for a deploy. That was
 * the explicit reason for building this before any of the screens.
 *
 * WHAT THIS DOES NOT DECIDE. Whether a specific resume may be served is decided by
 * lib/packageAccess.ts, on whether the row holds AI-written text. That gate protects
 * something already sold and must not become editable from an admin screen — a
 * mis-click would hand out paid work. This module governs what a free user may
 * START, not what they have already bought. Keeping the two apart is deliberate.
 *
 * FAILURE BEHAVIOUR IS CLOSED FOR PAID FEATURES, OPEN FOR FREE ONES. If the table
 * cannot be read — a network blip, a bad row — a feature marked as costing money
 * stays refused, and the two features that cost nothing to run stay available. A
 * readiness score is arithmetic; refusing it on a database hiccup would break the
 * top of the funnel for no benefit. An AI call is money, so silence means no.
 */

export type FeatureKey =
  | 'gcc_readiness_scan'
  | 'typed_profile'
  | 'resume_extraction'
  | 'free_resume'
  | 'templates'
  | 'pdf_download'
  | 'job_match'
  | 'resume_optimization'
  | 'cover_letter'

export interface Entitlement {
  feature: string
  label: string
  description: string | null
  free_allowed: boolean
  free_limit: number | null
  free_value: unknown
  requires_ai: boolean
  sort_order: number
}

/**
 * The answer used when the table cannot be read.
 *
 * Only the two genuinely costless features default to allowed. Everything that
 * spends money defaults to refused, so an outage can never turn into a bill.
 */
const FALLBACK_ALLOWED: ReadonlySet<string> = new Set([
  'gcc_readiness_scan',
  'typed_profile',
  'pdf_download',
])

/** Used only if the table is unreadable — mirrors migration 039's seed. */
const FALLBACK_FREE_TEMPLATES: TemplateId[] = ['ats_classic', 'gulf_minimal']

export async function loadEntitlements(): Promise<Entitlement[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('plan_entitlements')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('plan_entitlements read failed:', error.message)
    return []
  }
  return (data ?? []) as Entitlement[]
}

/**
 * May a FREE user use this feature?
 *
 * A paid user is not asked about — entitlement for paid work is a credit or an
 * `is_paid` row, checked at the point of sale. This answers the free question only,
 * which is why it takes no user argument and cannot be confused with an ownership
 * check.
 */
export async function freeAllows(feature: FeatureKey): Promise<boolean> {
  const rows = await loadEntitlements()
  if (rows.length === 0) return FALLBACK_ALLOWED.has(feature)
  const row = rows.find((r) => r.feature === feature)
  // An unknown feature is refused. Adding a gate before adding its row should fail
  // shut, not silently open a paid feature to everyone.
  if (!row) return FALLBACK_ALLOWED.has(feature)
  return row.free_allowed === true
}

/** The free cap for a feature, or null for "no limit". */
export async function freeLimit(feature: FeatureKey): Promise<number | null> {
  const rows = await loadEntitlements()
  const row = rows.find((r) => r.feature === feature)
  return row?.free_limit ?? null
}

/**
 * Which templates a free user may pick.
 *
 * Validated against the real registry rather than trusted: the founder edits this
 * list by hand, and a typo must not produce a resume that cannot render. Unknown
 * ids are dropped; if that leaves nothing, the default template is returned so a
 * free user is never left with an empty gallery.
 */
export async function freeTemplateIds(): Promise<TemplateId[]> {
  const rows = await loadEntitlements()
  const row = rows.find((r) => r.feature === 'templates')
  if (!row) return FALLBACK_FREE_TEMPLATES
  if (row.free_allowed !== true) return []

  const raw = Array.isArray(row.free_value) ? row.free_value : []
  const valid = raw.filter((v): v is TemplateId => isTemplateId(v))
  return valid.length > 0 ? valid : [DEFAULT_TEMPLATE_ID]
}

/**
 * Write one feature's free-plan settings (TASK-163).
 *
 * SERVICE-ROLE CLIENT, deliberately. `plan_entitlements` grants only SELECT to
 * `anon` and `authenticated` and carries no write policy at all, so a write cannot
 * be made with a user's own key even by an admin — which is the point. The caller
 * is responsible for having checked requireAdmin() first; this function does not
 * check, because a data-layer function that quietly enforced authorization would
 * hide where the real gate is.
 *
 * Validation happens here rather than in the form: the limit is clamped to a sane
 * range, and template ids are checked against the real registry so a stray value
 * can never produce a resume that fails to render.
 */
export async function setEntitlement(input: {
  feature: string
  freeAllowed: boolean
  freeLimit: number | null
  freeTemplates?: string[] | null
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { createServiceRoleClient } = await import('@/lib/supabase/serviceAdmin')
  const supabase = createServiceRoleClient()

  const patch: Record<string, unknown> = {
    free_allowed: input.freeAllowed,
    free_limit:
      input.freeLimit === null || Number.isNaN(input.freeLimit)
        ? null
        : Math.min(100000, Math.max(0, Math.round(input.freeLimit))),
    updated_at: new Date().toISOString(),
  }

  // Only the templates row carries a list, and only known ids are stored.
  if (input.feature === 'templates' && input.freeTemplates) {
    patch.free_value = input.freeTemplates.filter((t) => isTemplateId(t))
  }

  const { error } = await supabase
    .from('plan_entitlements')
    .update(patch)
    .eq('feature', input.feature)

  if (error) {
    console.error('plan_entitlements write failed: feature=' + input.feature, error.message)
    return { ok: false, error: 'Could not save that setting.' }
  }
  return { ok: true }
}
