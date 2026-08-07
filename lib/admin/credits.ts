import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * Manual credit grant — TASK-045.
 *
 * docs/ADMIN.md §2.3: an admin grants a user ONE free optimization; the
 * optimize flow checks for a credit before requiring payment. §6's support
 * loop is the reason this exists: user emails that a paid run broke → founder
 * finds them → founder grants a credit → user re-runs at no cost.
 *
 * SERVICE-ROLE ONLY, and that is load-bearing, not convenience: migration 018
 * grants `optimization_credits` to service_role alone, with no policy for
 * `authenticated`. A user who could write this table could mint themselves
 * unlimited free optimizations. Nothing here may ever be called from a client
 * component.
 *
 * Both functions below are payment-path code. Per docs/RULES.md §4 this whole
 * ticket is "Needs Review" and was built only after explicit founder sign-off.
 */

export interface GrantCreditParams {
  /** The user receiving the free optimization. */
  targetUserId: string
  /** The admin granting it — always auth.uid() of the caller, never from a form field. */
  adminUserId: string
  /** Required. Free text, written by the admin, stored verbatim for the audit trail. */
  reason: string
}

/**
 * Grant one free optimization. Every grant records admin id, target user,
 * timestamp and reason (docs/ADMIN.md §2.3) — the timestamp comes from the
 * database default, not the client clock.
 *
 * Deliberately NOT idempotent and deliberately unbounded: an admin who clicks
 * twice grants two credits. That matches the doc ("a button to grant a user one
 * free optimization") and is the safe direction to err for a support tool — a
 * duplicate grant costs one optimization and is visible in the ledger, whereas
 * silently swallowing a second legitimate grant would leave a support case
 * unresolved with no signal.
 */
export async function grantOptimizationCredit(
  params: GrantCreditParams
): Promise<{ ok: true; creditId: string } | { ok: false; error: string }> {
  const targetUserId = params.targetUserId?.trim() ?? ''
  const adminUserId = params.adminUserId?.trim() ?? ''
  const reason = params.reason?.trim() ?? ''

  if (!targetUserId) return { ok: false, error: 'Missing target user' }
  if (!adminUserId) return { ok: false, error: 'Missing admin identity' }
  // Reason is required by docs/ADMIN.md §2.3 — an unexplained grant is not a
  // usable audit record. Enforced here, not just in the form.
  if (!reason) return { ok: false, error: 'A reason is required for every credit grant' }

  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('optimization_credits')
    .insert({
      user_id: targetUserId,
      granted_by: adminUserId,
      reason,
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error(
      `credit grant FAILED: admin=${adminUserId} target=${targetUserId}`,
      error?.message ?? 'insert returned no row'
    )
    return { ok: false, error: 'Could not grant the credit' }
  }

  // Audit line. Non-PII (ids + an admin-authored reason, never profile field
  // values) so console.info matches the project's existing pattern for
  // non-PII admin mutations — same as the rate-limit override in adminData.ts.
  console.info(
    `credit granted: id=${data.id} admin=${adminUserId} target=${targetUserId} reason="${reason}"`
  )
  return { ok: true, creditId: data.id as string }
}

/**
 * Atomically consume one available credit for a user, attributing it to the
 * package it paid for. Returns true when a credit was consumed.
 *
 * The atomicity lives in Postgres (migration 018's
 * `consume_optimization_credit`, which uses FOR UPDATE SKIP LOCKED), NOT here.
 * A read-then-write in JS would let two concurrent optimize requests — an
 * impatient double-click is enough — both claim the same credit and get two
 * free optimizations from one grant. This is the same race migration 016
 * closed for rate limits.
 */
export async function consumeOptimizationCredit(
  userId: string,
  packageId: string
): Promise<boolean> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.rpc('consume_optimization_credit', {
    p_user_id: userId,
    p_package_id: packageId,
  })

  if (error) {
    // Fail CLOSED for the user's benefit is not an option here — the package
    // already exists. Log and treat as "no credit": the package stays unpaid,
    // which is the safe, reversible direction (the founder can grant again, or
    // the user pays). Never silently mark something paid on an error path.
    console.error(
      `credit consume error: user=${userId} package=${packageId}`,
      error.message
    )
    return false
  }

  const creditId = (data as string | null) ?? null
  if (!creditId) return false

  console.info(`credit consumed: id=${creditId} user=${userId} package=${packageId}`)
  return true
}

export interface CreditRow {
  id: string
  reason: string
  grantedAt: string
  grantedBy: string
  consumedAt: string | null
}

/** Credits for one user, newest grant first — shown on the admin screen. */
export async function listCreditsForUser(userId: string, limit = 20): Promise<CreditRow[]> {
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase
    .from('optimization_credits')
    .select('id, reason, granted_at, granted_by, consumed_at')
    .eq('user_id', userId)
    .order('granted_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('admin listCreditsForUser error', error.message)
    return []
  }

  return ((data ?? []) as Array<{
    id: string
    reason: string
    granted_at: string
    granted_by: string
    consumed_at: string | null
  }>).map((r) => ({
    id: r.id,
    reason: r.reason,
    grantedAt: r.granted_at,
    grantedBy: r.granted_by,
    consumedAt: r.consumed_at,
  }))
}
