import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * How many times a user may RECREATE their Career Profile from a CV in a month
 * (founder decision 2026-09-11): 2 on the free plan, 5 for paid users. Every
 * recreate is a paid model call, and an unlimited one is an open tap.
 *
 * WHAT COUNTS. A successful CV read by someone who ALREADY has a saved profile.
 * The first build is not a recreate — the signup extraction is free
 * (2026-08-18). And only a SUCCESS counts: a read that fails is our failure,
 * not the user's (open items §B9), so a model hiccup never spends their quota.
 *
 * WHEN IT RESETS. The calendar month in UTC, on the 1st — the same shape as the
 * planned monthly template counter. The date is returned formatted so the
 * screen says exactly when, rather than "next month".
 *
 * WHO IS PAID. Owns a paid resume (`packages.is_paid`), or holds any credit or
 * grant (`user_service_credits`, `optimization_credits`). While the paid locks
 * are off almost everyone is free; revisit this when payment goes live.
 *
 * WHERE IT LIVES. The existing `rate_limits` table, keyed on the first of the
 * month instead of a day — `increment_rate_limit` already takes any window
 * start, so no migration. The admin's per-user `limit_override` works on this
 * row unchanged. The daily extraction limit (lib/rateLimit.ts) still applies
 * on top.
 *
 * Server-only: it uses the service-role client, because the credits tables
 * have no user-readable policy at all.
 */

export const LIMIT_ACTION_RECREATION = 'profile_recreation'

const DEFAULT_FREE_PER_MONTH = 2
const DEFAULT_PAID_PER_MONTH = 5

function envLimit(raw: string | undefined, fallback: number): number {
  const n = Number.parseInt(raw ?? '', 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

/** The monthly cap for a plan. Env-overridable, like the daily limits. */
export function recreationLimitFor(paid: boolean): number {
  return paid
    ? envLimit(process.env.RECREATIONS_PER_MONTH_PAID, DEFAULT_PAID_PER_MONTH)
    : envLimit(process.env.RECREATIONS_PER_MONTH_FREE, DEFAULT_FREE_PER_MONTH)
}

/** The first of the current month (UTC) — this counter's window key. */
export function monthWindowStart(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`
}

function nextMonthStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

export interface RecreationStatus {
  /** A saved profile exists, so a CV read now would be a recreate. */
  isRecreate: boolean
  paid: boolean
  limit: number
  used: number
  remaining: number
  /** YYYY-MM-DD, the first of next month. */
  resetsOn: string
  /** e.g. "1 October" — what the screen shows. */
  resetsOnLabel: string
  /** May this user read a CV now? Always true when it is not a recreate. */
  allowed: boolean
  message?: string
}

export async function getRecreationStatus(userId: string): Promise<RecreationStatus> {
  const supabase = createServiceRoleClient()
  const reset = nextMonthStart()
  const resetsOn = reset.toISOString().slice(0, 10)
  const resetsOnLabel = reset.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })

  const [profile, paidResume, serviceCredit, optimizationCredit, counter] = await Promise.all([
    supabase.from('career_profiles').select('full_name').eq('user_id', userId).maybeSingle(),
    supabase.from('packages').select('id').eq('user_id', userId).eq('is_paid', true).limit(1),
    supabase.from('user_service_credits').select('id').eq('user_id', userId).limit(1),
    supabase.from('optimization_credits').select('id').eq('user_id', userId).limit(1),
    supabase
      .from('rate_limits')
      .select('count, limit_override')
      .eq('user_id', userId)
      .eq('action', LIMIT_ACTION_RECREATION)
      .eq('window_start', monthWindowStart())
      .maybeSingle(),
  ])

  const failed = [profile, paidResume, serviceCredit, optimizationCredit, counter].find((r) => r.error)
  if (failed) {
    // Fail CLOSED, like the daily limit: a model call we cannot account for
    // must not go through on a database blip.
    console.error('recreateLimit: could not read usage user=' + userId, failed.error?.message ?? '')
    return {
      isRecreate: true,
      paid: false,
      limit: recreationLimitFor(false),
      used: 0,
      remaining: 0,
      resetsOn,
      resetsOnLabel,
      allowed: false,
      message: 'We could not check your usage right now. Please try again in a moment.',
    }
  }

  const isRecreate = Boolean(String(profile.data?.full_name ?? '').trim())
  const paid =
    (paidResume.data?.length ?? 0) > 0 ||
    (serviceCredit.data?.length ?? 0) > 0 ||
    (optimizationCredit.data?.length ?? 0) > 0
  const override = counter.data?.limit_override
  const limit = typeof override === 'number' && override >= 0 ? override : recreationLimitFor(paid)
  const used = counter.data?.count ?? 0
  const remaining = Math.max(0, limit - used)
  const allowed = !isRecreate || used < limit

  return {
    isRecreate,
    paid,
    limit,
    used,
    remaining,
    resetsOn,
    resetsOnLabel,
    allowed,
    message: allowed
      ? undefined
      : `You've used all ${limit} profile recreation${limit === 1 ? '' : 's'} for this month. ` +
        `You can recreate your profile again from ${resetsOnLabel} — and every field can still be edited by hand.`,
  }
}

/**
 * Count one recreate. Call only AFTER a successful read, and only when
 * `isRecreate` was true. Same atomic RPC as the daily counters, so two
 * concurrent calls cannot both read the old count.
 */
export async function recordRecreation(userId: string): Promise<void> {
  const supabase = createServiceRoleClient()
  const { error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: userId,
    p_action: LIMIT_ACTION_RECREATION,
    p_window_start: monthWindowStart(),
  })
  if (error) console.error('recreateLimit increment error: user=' + userId, error.message)
}
