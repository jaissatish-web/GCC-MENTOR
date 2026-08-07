import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * Promo codes — TASK-051 (payment bypass while Razorpay stays blocked on
 * the founder's Saudi Arabia residency / India-only KYC).
 *
 * SERVICE-ROLE ONLY, load-bearing not convenience: migration 021 grants
 * `promo_codes` to service_role alone, no policy for `authenticated`/`anon`.
 * A code's existence/validity must never be directly readable by a client —
 * only through the rate-limited redemption route (app/api/packages/[id]/
 * redeem-promo/route.ts), which calls the atomic `redeem_promo_code` RPC,
 * never reads/writes this table's rows directly.
 *
 * Payment-adjacent code, "Needs Review" per docs/RULES.md §4 — built only
 * after explicit founder sign-off in conversation, 2026-08-07.
 */

export interface CreatePromoCodeParams {
  code: string
  description: string
  maxRedemptions: number | null
  expiresAt: string | null // ISO, or null for no expiry
  adminUserId: string
}

/** Normalise a founder-typed code to a consistent, redemption-matching form. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

export async function createPromoCode(
  params: CreatePromoCodeParams
): Promise<{ ok: true } | { ok: false; error: string }> {
  const code = normalizeCode(params.code)
  const description = params.description?.trim() ?? ''
  const adminUserId = params.adminUserId?.trim() ?? ''

  if (!code) return { ok: false, error: 'Code is required' }
  if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
    return { ok: false, error: 'Code must be 3-32 characters: letters, numbers, hyphens only' }
  }
  if (!description) return { ok: false, error: 'A description is required for every code' }
  if (!adminUserId) return { ok: false, error: 'Missing admin identity' }
  if (
    params.maxRedemptions !== null &&
    (!Number.isInteger(params.maxRedemptions) || params.maxRedemptions <= 0)
  ) {
    return { ok: false, error: 'Max redemptions must be a positive whole number, or blank for unlimited' }
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('promo_codes').insert({
    code,
    description,
    max_redemptions: params.maxRedemptions,
    expires_at: params.expiresAt,
    created_by: adminUserId,
  })

  if (error) {
    console.error(`promo code create FAILED: admin=${adminUserId} code=${code}`, error.message)
    if (error.code === '23505') return { ok: false, error: 'That code already exists' }
    return { ok: false, error: 'Could not create the promo code' }
  }

  console.info(`promo code created: code=${code} admin=${adminUserId} description="${description}"`)
  return { ok: true }
}

export interface PromoCodeRow {
  code: string
  description: string
  maxRedemptions: number | null
  redemptionCount: number
  expiresAt: string | null
  active: boolean
  createdAt: string
}

export async function listPromoCodes(limit = 50): Promise<PromoCodeRow[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('promo_codes')
    .select('code, description, max_redemptions, redemption_count, expires_at, active, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('admin listPromoCodes error', error.message)
    return []
  }

  return ((data ?? []) as Array<{
    code: string
    description: string
    max_redemptions: number | null
    redemption_count: number
    expires_at: string | null
    active: boolean
    created_at: string
  }>).map((r) => ({
    code: r.code,
    description: r.description,
    maxRedemptions: r.max_redemptions,
    redemptionCount: r.redemption_count,
    expiresAt: r.expires_at,
    active: r.active,
    createdAt: r.created_at,
  }))
}

/**
 * Deactivate a code (soft — never deleted, so redemption history/audit stays
 * intact). Distinct from letting it expire/exhaust naturally: this is for
 * "stop this code right now" (e.g. it leaked).
 */
export async function deactivatePromoCode(
  code: string,
  adminUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('promo_codes')
    .update({ active: false })
    .eq('code', normalizeCode(code))

  if (error) {
    console.error(`promo code deactivate FAILED: admin=${adminUserId} code=${code}`, error.message)
    return { ok: false, error: 'Could not deactivate the code' }
  }
  console.info(`promo code deactivated: code=${normalizeCode(code)} admin=${adminUserId}`)
  return { ok: true }
}
