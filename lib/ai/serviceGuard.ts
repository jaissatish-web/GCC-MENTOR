import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { getDefaultDailyLimit, identityUserIds, resetAtIso, windowStart } from '@/lib/rateLimit'

/**
 * The one server-side gate in front of every paid model call (audit H01, H03,
 * M14 — 2026-09-15).
 *
 * In order, for one quota action:
 *   1. SERVICE SWITCH — the founder's pause in /admin/services
 *      (ai_service_controls.enabled). Enforced here, on the server, so hiding
 *      a button is never the only thing standing between a user and a spend.
 *   2. ALLOWANCE — a per-user admin override (the existing /admin/users
 *      control) wins; otherwise the founder's per-action setting; otherwise the
 *      code default in lib/rateLimit.ts.
 *   3. RESERVATION — reserve_rate_limit (migration 049) atomically checks the
 *      day's count PLUS in-flight reservations, a concurrency cap and an optional
 *      all-users daily cap, and holds one slot.
 *
 * The caller then runs the model call and calls `finish(true)` after the result
 * is SAVED (the slot becomes one counted use) or `finish(false)` on any failure
 * (the slot is released — a failure that was not the user's fault costs them
 * nothing, the project's long-standing rule). If the function is killed before
 * either, the reservation expires after `ttlSeconds` and stops counting.
 *
 * FAILS CLOSED. If the controls or the counters cannot be read, the request is
 * refused with a "try again" — a limit we cannot verify must not pass.
 */

export interface ServiceControl {
  action: string
  service_key: string
  enabled: boolean
  daily_limit_per_user: number | null
  global_daily_limit: number | null
  max_concurrent_per_user: number
  paused_message: string | null
}

export type GuardFailureCode = 'paused' | 'limit' | 'global_limit' | 'busy' | 'unavailable'

export type ReserveResult =
  | { ok: true; reservationId: string; limit: number; finish: (succeeded: boolean) => Promise<void> }
  | { ok: false; status: 409 | 429 | 503; code: GuardFailureCode; error: string }

const DEFAULT_TTL_SECONDS = 360

const MESSAGES = {
  paused: 'This service is paused for a short while. Nothing was used — please try again later.',
  busy: 'This is already being prepared in another tab or request. Wait for it to finish, then try again.',
  global: 'This service has reached its capacity for today. Nothing was used — please try again tomorrow.',
  unavailable: 'We could not check your usage right now. Nothing was used — please try again in a moment.',
}

export function limitMessage(limit: number): string {
  return (
    `You've reached today's limit of ${limit} for this service. It resets at ${resetAtIso()}. ` +
    'Need more? Email the founder — replies within a day.'
  )
}

export async function reserveAiAction(opts: {
  userId: string
  action: string
  phone?: string | null
  email?: string | null
  ttlSeconds?: number
}): Promise<ReserveResult> {
  const supabase = createServiceRoleClient({ fresh: true })

  const { data: control, error: controlError } = await supabase
    .from('ai_service_controls')
    .select('action, service_key, enabled, daily_limit_per_user, global_daily_limit, max_concurrent_per_user, paused_message')
    .eq('action', opts.action)
    .maybeSingle()
  if (controlError) {
    console.error('serviceGuard: controls unreadable action=' + opts.action, controlError.message)
    return { ok: false, status: 503, code: 'unavailable', error: MESSAGES.unavailable }
  }
  const c = control as ServiceControl | null
  if (c && c.enabled === false) {
    return { ok: false, status: 503, code: 'paused', error: c.paused_message?.trim() || MESSAGES.paused }
  }

  const ids = await identityUserIds(opts.userId, opts.phone, opts.email)
  const today = windowStart()

  const { data: overrides, error: overrideError } = await supabase
    .from('rate_limits')
    .select('limit_override')
    .eq('action', opts.action)
    .eq('window_start', today)
    .in('user_id', ids)
  if (overrideError) {
    console.error('serviceGuard: counters unreadable action=' + opts.action + ' user=' + opts.userId, overrideError.message)
    return { ok: false, status: 503, code: 'unavailable', error: MESSAGES.unavailable }
  }
  const override = ((overrides ?? []) as Array<{ limit_override: number | null }>).find((r) => r.limit_override != null)
    ?.limit_override
  const limit =
    override != null && override >= 0 ? override : c?.daily_limit_per_user ?? getDefaultDailyLimit(opts.action)

  const { data, error } = await supabase.rpc('reserve_rate_limit', {
    p_user_id: opts.userId,
    p_action: opts.action,
    p_window_start: today,
    p_identity_user_ids: ids,
    p_limit: limit,
    p_global_limit: c?.global_daily_limit ?? null,
    p_max_concurrent: c?.max_concurrent_per_user ?? 1,
    p_ttl_seconds: opts.ttlSeconds ?? DEFAULT_TTL_SECONDS,
  })
  if (error) {
    console.error('serviceGuard: reserve failed action=' + opts.action + ' user=' + opts.userId, error.message)
    return { ok: false, status: 503, code: 'unavailable', error: MESSAGES.unavailable }
  }

  const row = (Array.isArray(data) ? data[0] : data) as { status?: string; reservation_id?: string | null } | null
  switch (row?.status) {
    case 'reserved': {
      const reservationId = String(row.reservation_id)
      let settled = false
      return {
        ok: true,
        reservationId,
        limit,
        finish: async (succeeded: boolean) => {
          if (settled) return
          settled = true
          const fn = succeeded ? 'consume_rate_limit_reservation' : 'release_rate_limit_reservation'
          const { error: settleError } = await createServiceRoleClient().rpc(fn, { p_reservation_id: reservationId })
          if (settleError) {
            // Never thrown: the user's result is already saved (or already
            // failed). An unsettled reservation simply expires.
            console.error(`serviceGuard: ${fn} failed action=${opts.action} user=${opts.userId}`, settleError.message)
          }
        },
      }
    }
    case 'limit':
      return { ok: false, status: 429, code: 'limit', error: limitMessage(limit) }
    case 'busy':
      return { ok: false, status: 409, code: 'busy', error: MESSAGES.busy }
    case 'global_limit':
      return { ok: false, status: 503, code: 'global_limit', error: MESSAGES.global }
    default:
      console.error('serviceGuard: unexpected reserve result action=' + opts.action, JSON.stringify(row))
      return { ok: false, status: 503, code: 'unavailable', error: MESSAGES.unavailable }
  }
}

/** Pause check alone — for paths with their own quota (the anonymous scan). */
export async function isServicePaused(action: string): Promise<{ paused: boolean; message: string }> {
  const { data, error } = await createServiceRoleClient({ fresh: true })
    .from('ai_service_controls')
    .select('enabled, paused_message')
    .eq('action', action)
    .maybeSingle()
  if (error) {
    console.error('serviceGuard: controls unreadable action=' + action, error.message)
    return { paused: true, message: MESSAGES.unavailable }
  }
  const row = data as { enabled: boolean; paused_message: string | null } | null
  return row && row.enabled === false
    ? { paused: true, message: row.paused_message?.trim() || MESSAGES.paused }
    : { paused: false, message: '' }
}
