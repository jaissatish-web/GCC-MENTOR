import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * Service packages, quotas, and the generalized credit ledger — migration
 * 026. Founder request 2026-08-09: admin-defined bundles ("Pro = 3
 * optimizations + 2 cover letters"), fully controlled from /admin.
 *
 * SERVICE-ROLE ONLY, same posture as promoCodes.ts/credits.ts: nothing here
 * is ever readable or writable by a normal session (migration 026's RLS).
 *
 * Payment-adjacent — Needs Review per docs/RULES.md §4, built only after
 * explicit founder sign-off in conversation, 2026-08-09.
 *
 * Known service_key values as of this file: 'resume_optimization',
 * 'cover_letter'. Free-text by convention (matches rate_limits.action
 * elsewhere) — adding a new service later never needs a migration, just a
 * new key used consistently by whatever route consumes it.
 */

export interface ServicePackageItemInput {
  serviceKey: string
  quota: number
}

export interface CreateServicePackageParams {
  name: string
  description: string | null
  priceInr: number
  items: ServicePackageItemInput[]
  adminUserId: string
}

export async function createServicePackage(
  params: CreateServicePackageParams
): Promise<{ ok: true; packageId: string } | { ok: false; error: string }> {
  const name = params.name?.trim() ?? ''
  const adminUserId = params.adminUserId?.trim() ?? ''

  if (!name) return { ok: false, error: 'Package name is required' }
  if (!adminUserId) return { ok: false, error: 'Missing admin identity' }
  if (!Number.isFinite(params.priceInr) || params.priceInr < 0) {
    return { ok: false, error: 'Price must be a non-negative number' }
  }
  const items = (params.items ?? []).filter((i) => i.serviceKey?.trim())
  if (items.length === 0) {
    return { ok: false, error: 'A package needs at least one service and quota' }
  }
  for (const item of items) {
    if (!Number.isInteger(item.quota) || item.quota <= 0) {
      return { ok: false, error: `Quota for "${item.serviceKey}" must be a positive whole number` }
    }
  }

  const supabase = createServiceRoleClient()
  const { data: pkg, error: pkgError } = await supabase
    .from('service_packages')
    .insert({
      name,
      description: params.description?.trim() || null,
      price_inr: params.priceInr,
      updated_by: adminUserId,
    })
    .select('id')
    .single()

  if (pkgError || !pkg) {
    console.error(`service package create FAILED: admin=${adminUserId}`, pkgError?.message ?? 'no row')
    return { ok: false, error: 'Could not create the package' }
  }

  const { error: itemsError } = await supabase.from('service_package_items').insert(
    items.map((i) => ({ package_id: pkg.id, service_key: i.serviceKey.trim(), quota: i.quota }))
  )
  if (itemsError) {
    console.error(`service package items create FAILED: package=${pkg.id}`, itemsError.message)
    return { ok: false, error: 'Package created, but could not save its quotas — edit it to fix' }
  }

  console.info(`service package created: id=${pkg.id} name="${name}" admin=${adminUserId}`)
  return { ok: true, packageId: pkg.id as string }
}

export async function setServicePackageActive(
  packageId: string,
  isActive: boolean,
  adminUserId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('service_packages')
    .update({ is_active: isActive, updated_by: adminUserId })
    .eq('id', packageId)

  if (error) {
    console.error(`service package active-toggle FAILED: id=${packageId}`, error.message)
    return { ok: false, error: 'Could not update the package' }
  }
  return { ok: true }
}

export interface ServicePackageRow {
  id: string
  name: string
  description: string | null
  priceInr: number
  isActive: boolean
  items: { serviceKey: string; quota: number }[]
  createdAt: string
}

/** All packages, newest first, each with its quota line items. */
export async function listServicePackages(): Promise<ServicePackageRow[]> {
  const supabase = createServiceRoleClient()
  const { data: packages, error } = await supabase
    .from('service_packages')
    .select('id, name, description, price_inr, is_active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('admin listServicePackages error', error.message)
    return []
  }
  if (!packages || packages.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from('service_package_items')
    .select('package_id, service_key, quota')
    .in('package_id', packages.map((p) => p.id as string))

  if (itemsError) {
    console.error('admin listServicePackages items error', itemsError.message)
  }

  return (packages as Array<Record<string, unknown>>).map((p) => ({
    id: p.id as string,
    name: p.name as string,
    description: (p.description as string | null) ?? null,
    priceInr: Number(p.price_inr),
    isActive: p.is_active as boolean,
    items: ((items ?? []) as Array<Record<string, unknown>>)
      .filter((i) => i.package_id === p.id)
      .map((i) => ({ serviceKey: i.service_key as string, quota: i.quota as number })),
    createdAt: p.created_at as string,
  }))
}

/**
 * Manual admin grant of one service credit — generalized version of
 * lib/admin/credits.ts's grantOptimizationCredit, for any service_key.
 * Deliberately not idempotent, same reasoning as the original: a duplicate
 * click costs one credit and is visible in the ledger, which is the safer
 * failure direction for a support tool than silently swallowing a second
 * legitimate grant.
 */
export async function grantServiceCredit(params: {
  targetUserId: string
  serviceKey: string
  adminUserId: string
  reason: string
}): Promise<{ ok: true; creditId: string } | { ok: false; error: string }> {
  const targetUserId = params.targetUserId?.trim() ?? ''
  const serviceKey = params.serviceKey?.trim() ?? ''
  const adminUserId = params.adminUserId?.trim() ?? ''
  const reason = params.reason?.trim() ?? ''

  if (!targetUserId) return { ok: false, error: 'Missing target user' }
  if (!serviceKey) return { ok: false, error: 'Missing service' }
  if (!adminUserId) return { ok: false, error: 'Missing admin identity' }
  if (!reason) return { ok: false, error: 'A reason is required for every credit grant' }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('user_service_credits')
    .insert({
      user_id: targetUserId,
      service_key: serviceKey,
      source: 'admin_grant',
      granted_by: adminUserId,
      reason,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error(`service credit grant FAILED: admin=${adminUserId} target=${targetUserId} service=${serviceKey}`, error?.message ?? 'no row')
    return { ok: false, error: 'Could not grant the credit' }
  }

  console.info(`service credit granted: id=${data.id} service=${serviceKey} admin=${adminUserId} target=${targetUserId} reason="${reason}"`)
  return { ok: true, creditId: data.id as string }
}

/**
 * Atomically consume one available credit for (user, service). The
 * atomicity lives in Postgres (migration 026's consume_service_credit,
 * FOR UPDATE SKIP LOCKED) — same reasoning as consumeOptimizationCredit:
 * a read-then-write here would let two concurrent requests both claim the
 * same last credit.
 */
export async function consumeServiceCredit(userId: string, serviceKey: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('consume_service_credit', {
    p_user_id: userId,
    p_service_key: serviceKey,
  })

  if (error) {
    console.error(`service credit consume error: user=${userId} service=${serviceKey}`, error.message)
    return false
  }

  const creditId = (data as string | null) ?? null
  if (!creditId) return false

  console.info(`service credit consumed: id=${creditId} user=${userId} service=${serviceKey}`)
  return true
}

export interface ServiceCreditRow {
  id: string
  serviceKey: string
  source: string
  reason: string | null
  grantedAt: string
  consumedAt: string | null
}

/** Credits for one user, newest grant first — for the admin user detail screen. */
export async function listServiceCreditsForUser(userId: string, limit = 30): Promise<ServiceCreditRow[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('user_service_credits')
    .select('id, service_key, source, reason, granted_at, consumed_at')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('admin listServiceCreditsForUser error', error.message)
    return []
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    serviceKey: r.service_key as string,
    source: r.source as string,
    reason: (r.reason as string | null) ?? null,
    grantedAt: r.granted_at as string,
    consumedAt: (r.consumed_at as string | null) ?? null,
  }))
}

/**
 * Redeem a promo code that is tied to a package (promo_codes.package_id set)
 * — grants that package's credits atomically via migration 026's
 * redeem_package_promo_code RPC. Deliberately a SEPARATE path from the
 * existing single-resume redeem-promo route (TASK-051) — that one is
 * untouched and keeps working exactly as it does today for codes with no
 * package_id.
 */
export async function redeemPackagePromoCode(code: string, userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('redeem_package_promo_code', {
    p_code: code,
    p_user_id: userId,
  })

  if (error) {
    console.error(`package promo redeem error: user=${userId} code=${code}`, error.message)
    return false
  }
  return Boolean(data)
}
