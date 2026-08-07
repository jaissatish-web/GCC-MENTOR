import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { withPiiAccessLog } from '@/lib/admin/piiAccessLog'
import { windowStart, LIMIT_ACTION_EXTRACTION, LIMIT_ACTION_OPTIMIZATION } from '@/lib/rateLimit'
import type { PackageStatus } from '@/types/package'

/**
 * Admin data access — TASK-040.
 *
 * SERVICE-ROLE ONLY, by necessity, not convenience: career_profiles and
 * packages both carry owner-only RLS (`user_id = auth.uid()`), and neither
 * table has an is_admin-aware bypass policy — adding one would widen the RLS
 * surface for every regular user's row, not just the admin's read path. The
 * narrower, already-audited alternative this project uses elsewhere (see
 * lib/rateLimit.ts's identity lookup, and pii_access_log's own grants) is a
 * server-only service-role client whose access is gated by an explicit
 * is_admin check upstream (lib/admin/adminAuth.ts + middleware.ts) and, for
 * PII resources, mandatory pii_access_log writes before every read.
 *
 * WHAT GETS LOGGED TO pii_access_log AND WHAT DOESN'T (docs/ADMIN.md §6's own
 * worked example is the source for this split): step 2, "founder finds them
 * in the admin users list by email or phone," is NOT the logged step — only
 * step 3, "founder opens their Library package," is. So: searchUsers() below
 * is NOT logged (it surfaces derived, non-raw-value metadata — a completeness
 * score and a signup date — to let the founder confirm they found the right
 * person, the same purpose the search box itself serves). listPackages() DOES
 * write one pii_access_log row per package actually returned, resource
 * 'package'. Nothing in this file's scope reads a full career_profile record
 * (TASK-040 has no such screen), so the 'career_profile' PiiResource stays
 * unused here — reserved by TASK-041 for whatever admin flow needs it later.
 */

// ---------------------------------------------------------------------------
// Users list (docs/ADMIN.md §2.1) — NOT pii_access_log-logged, see file header.
// ---------------------------------------------------------------------------

export interface AdminUserSummary {
  userId: string
  fullName: string | null
  phone: string | null
  email: string | null
  readinessScore: number | null
  readinessCategory: string | null
  signupDate: string | null // ISO, from auth.users.created_at
}

/** Escape PostgREST ilike wildcards so a search term can't inject its own pattern. */
function escapeIlike(s: string): string {
  return s.replace(/[%_]/g, (c) => '\\' + c)
}

/**
 * Search by phone or email. Server-side only — never ships the full user
 * list to the client and filters there (docs/ADMIN.md §2.1, "search must not
 * leak"). Empty/blank query returns no results rather than everyone.
 */
export async function searchUsers(rawQuery: string): Promise<AdminUserSummary[]> {
  const query = rawQuery.trim()
  if (query.length < 2) return []

  const supabase = createServiceRoleClient()
  const pattern = `%${escapeIlike(query)}%`

  const { data, error } = await supabase
    .from('career_profiles')
    .select('user_id, full_name, phone, email, readiness_score, readiness_category')
    .or(`phone.ilike.${pattern},email.ilike.${pattern}`)
    .limit(20)

  if (error) {
    console.error('admin searchUsers error', error.message)
    return []
  }

  const rows = (data ?? []) as Array<{
    user_id: string
    full_name: string | null
    phone: string | null
    email: string | null
    readiness_score: number | null
    readiness_category: string | null
  }>

  // Bounded (<=20) — one auth lookup per matched row for signup date. No bulk
  // auth.admin.listUsers() call exists that filters by phone/email directly.
  const withSignupDate = await Promise.all(
    rows.map(async (row) => {
      let signupDate: string | null = null
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id)
        signupDate = authUser?.user?.created_at ?? null
      } catch {
        signupDate = null
      }
      return {
        userId: row.user_id,
        fullName: row.full_name,
        phone: row.phone,
        email: row.email,
        readinessScore: row.readiness_score,
        readinessCategory: row.readiness_category,
        signupDate,
      }
    })
  )

  return withSignupDate
}

// ---------------------------------------------------------------------------
// Payments / packages view (docs/ADMIN.md §2.2) — read-only, logged per row.
// ---------------------------------------------------------------------------

export interface AdminPackageSummary {
  id: string
  userId: string
  targetJobTitle: string
  targetCountry: string
  status: PackageStatus
  isPaid: boolean
  paymentId: string | null
  createdAt: string
}

/**
 * List packages (optionally scoped to one user, via the "view their Library
 * packages" link from the users list). Every row returned is logged to
 * pii_access_log BEFORE being included in the result — via withPiiAccessLog,
 * so a log failure on any row excludes that row rather than crashing the
 * whole list (fail closed per-row, not fail-closed-the-whole-page).
 */
export async function listPackages(
  opts: { userId?: string; limit?: number },
  admin: { id: string }
): Promise<AdminPackageSummary[]> {
  const supabase = createServiceRoleClient()
  let q = supabase
    .from('packages')
    .select('id, user_id, target_job_title, target_country, status, is_paid, payment_id, created_at')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 50)

  if (opts.userId) q = q.eq('user_id', opts.userId)

  const { data, error } = await q
  if (error) {
    console.error('admin listPackages error', error.message)
    return []
  }

  const rows = (data ?? []) as Array<{
    id: string
    user_id: string
    target_job_title: string
    target_country: string
    status: PackageStatus
    is_paid: boolean
    payment_id: string | null
    created_at: string
  }>

  const results: AdminPackageSummary[] = []
  for (const row of rows) {
    try {
      await withPiiAccessLog(
        {
          adminUserId: admin.id,
          targetUserId: row.user_id,
          resource: 'package',
          resourceId: row.id,
        },
        async () => row
      )
      results.push({
        id: row.id,
        userId: row.user_id,
        targetJobTitle: row.target_job_title,
        targetCountry: row.target_country,
        status: row.status,
        isPaid: row.is_paid,
        paymentId: row.payment_id,
        createdAt: row.created_at,
      })
    } catch {
      // Fail closed for this ONE row (docs/ADMIN.md §4): if the audit log
      // write failed, this package is silently excluded rather than shown
      // unaudited. The rest of the list still renders.
    }
  }
  return results
}

// ---------------------------------------------------------------------------
// Rate-limit override (docs/ADMIN.md §2.4). Not PII — counts and an
// override integer only, no field values — so this is not pii_access_log
// territory; a console.info audit line is the project's existing pattern for
// non-PII admin mutations (matches TASK-039/041 style).
// ---------------------------------------------------------------------------

export const RATE_LIMIT_ACTIONS = [LIMIT_ACTION_EXTRACTION, LIMIT_ACTION_OPTIMIZATION] as const

export interface RateLimitRow {
  action: string
  windowStart: string
  count: number
  limitOverride: number | null
}

/**
 * Today's rate_limits rows for a user, one per known action. A user with no
 * attempts yet today has no row for that action — represented as count: 0,
 * limitOverride: null so the admin UI always has something to render.
 */
export async function getTodayRateLimits(userId: string): Promise<RateLimitRow[]> {
  const supabase = createServiceRoleClient()
  const today = windowStart()

  const { data, error } = await supabase
    .from('rate_limits')
    .select('action, count, limit_override')
    .eq('user_id', userId)
    .eq('window_start', today)

  if (error) {
    console.error('admin getTodayRateLimits error', error.message)
  }

  const byAction = new Map(
    ((data ?? []) as Array<{ action: string; count: number; limit_override: number | null }>).map((r) => [
      r.action,
      r,
    ])
  )

  return RATE_LIMIT_ACTIONS.map((action) => {
    const row = byAction.get(action)
    return {
      action,
      windowStart: today,
      count: row?.count ?? 0,
      limitOverride: row?.limit_override ?? null,
    }
  })
}

/**
 * Set (or clear, with override: null) today's limit override for one user +
 * action. docs/ADMIN.md §2.4 describes an immediate unblock ("if they are
 * legitimately blocked"), and the schema's PK includes window_start (a
 * single calendar date) — this is deliberately a TODAY-only override, not a
 * standing raise; it needs to be set again if the same user is blocked on a
 * later day. A plain upsert is safe here (not the atomic RPC used for
 * increments): this SETS a value rather than incrementing one, so there is
 * no lost-update race to guard against, and it never touches `count` for an
 * existing row (only the columns passed are updated on conflict).
 */
export async function setRateLimitOverride(opts: {
  userId: string
  action: string
  override: number | null
  admin: { id: string }
  reason: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!RATE_LIMIT_ACTIONS.includes(opts.action as (typeof RATE_LIMIT_ACTIONS)[number])) {
    return { ok: false, error: 'Unknown action' }
  }
  if (opts.override !== null && (!Number.isInteger(opts.override) || opts.override < 0)) {
    return { ok: false, error: 'Override must be a non-negative integer, or empty to clear it' }
  }

  const supabase = createServiceRoleClient()
  const { error } = await supabase.from('rate_limits').upsert(
    {
      user_id: opts.userId,
      action: opts.action,
      window_start: windowStart(),
      limit_override: opts.override,
    },
    { onConflict: 'user_id,action,window_start' }
  )

  if (error) {
    console.error('admin setRateLimitOverride error', error.message)
    return { ok: false, error: 'Failed to save the override' }
  }

  // Audit line — non-PII (a count-limit integer, not profile data), so
  // console.info is the project's existing pattern rather than pii_access_log.
  console.info(
    `admin rate-limit override: admin=${opts.admin.id} target=${opts.userId} action=${opts.action} ` +
      `override=${opts.override ?? 'CLEARED'} reason="${opts.reason}"`
  )

  return { ok: true }
}

// ---------------------------------------------------------------------------
// PII access log viewer (docs/ADMIN.md §2.5). Reading the LOG is not itself a
// PII read (the log holds no field values, only who/what/when) so this is
// not wrapped in withPiiAccessLog — logging the reading of the log would be
// recursive busywork with no audit value.
// ---------------------------------------------------------------------------

export interface PiiAccessLogRow {
  id: string
  adminUserId: string
  targetUserId: string
  resource: string
  resourceId: string
  accessedAt: string
}

export async function listPiiAccessLog(limit = 50): Promise<PiiAccessLogRow[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('pii_access_log')
    .select('id, admin_user_id, target_user_id, resource, resource_id, accessed_at')
    .order('accessed_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('admin listPiiAccessLog error', error.message)
    return []
  }

  return ((data ?? []) as Array<{
    id: string
    admin_user_id: string
    target_user_id: string
    resource: string
    resource_id: string
    accessed_at: string
  }>).map((r) => ({
    id: r.id,
    adminUserId: r.admin_user_id,
    targetUserId: r.target_user_id,
    resource: r.resource,
    resourceId: r.resource_id,
    accessedAt: r.accessed_at,
  }))
}
