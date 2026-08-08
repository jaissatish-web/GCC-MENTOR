import { createHmac } from 'crypto'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { windowStart } from '@/lib/rateLimit'
import type { RateLimitStatus } from '@/lib/rateLimit'

/**
 * Anonymous rate limiting (TASK-048).
 *
 * `lib/rateLimit.ts` is keyed on an authenticated user_id (NOT NULL, FK to
 * auth.users). TASK-049 (the free ATS/Gulf-readiness scanner, no login
 * required) has no user_id to key against, so that mechanism does not fit —
 * this is a SEPARATE path against a separate table (migration 023,
 * `anonymous_rate_limits`), not a change to the existing one.
 *
 * Same enforcement discipline as lib/rateLimit.ts: server-side, in the route,
 * BEFORE the expensive call. This module is server-only by construction (the
 * service-role client, plus request headers no client component has reason
 * to read).
 */

const DEFAULT_ANONYMOUS_LIMIT = 3

function parsePositiveEnvInt(v: string | undefined): number | null {
  if (!v) return null
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/**
 * Per-action daily cap, env-driven by convention: `RATE_LIMIT_ANON_<ACTION>_PER_DAY`
 * (action upper-cased). No action is wired to this module yet — TASK-049 will
 * add its own env var following this convention when it defines its action
 * string, the same way each action in lib/rateLimit.ts got its own var.
 */
export function getAnonymousDefaultDailyLimit(action: string, fallback = DEFAULT_ANONYMOUS_LIMIT): number {
  const envKey = `RATE_LIMIT_ANON_${action.toUpperCase()}_PER_DAY`
  return parsePositiveEnvInt(process.env[envKey]) ?? fallback
}

/**
 * Identity for an anonymous caller = a salted hash of their client IP, never
 * the raw IP. Keyed with SUPABASE_SERVICE_ROLE_KEY (already a server-only
 * secret, never shipped to the client) rather than introducing a new env var
 * for something that isn't itself sensitive — this just avoids storing a raw,
 * reversible identifier with no product need to ever display or reverse it.
 *
 * Header order: `x-forwarded-for` (first hop, i.e. the original client, per
 * standard proxy convention) then `x-real-ip`. If neither is present (e.g.
 * local dev with no proxy in front), every caller collapses onto one shared
 * bucket rather than getting an unlimited free pass — a deliberate fail-safe
 * choice, not an oversight, since this exists specifically to stop abuse.
 */
export function getClientIdentityHash(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = (forwardedFor?.split(',')[0]?.trim()) || realIp?.trim() || 'unknown'

  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'anonymous-rate-limit-dev-fallback'
  return createHmac('sha256', pepper).update(ip).digest('hex')
}

/** Anonymous-path equivalent of getRateLimitStatus (lib/rateLimit.ts). */
export async function getAnonymousRateLimitStatus(opts: {
  identityHash: string
  action: string
}): Promise<RateLimitStatus> {
  const supabase = createServiceRoleClient()
  const today = windowStart()

  const { data, error } = await supabase
    .from('anonymous_rate_limits')
    .select('count, limit_override')
    .eq('identity_hash', opts.identityHash)
    .eq('action', opts.action)
    .eq('window_start', today)
    .maybeSingle()

  const limit = getAnonymousDefaultDailyLimit(opts.action)

  if (error) {
    console.error('anonymousRateLimit query error: action=' + opts.action, error?.message ?? '')
    // Fail closed on a DB error, same as the authenticated path: a limit we
    // cannot verify must not pass.
    return {
      allowed: false,
      current: Number.MAX_SAFE_INTEGER,
      limit,
      remaining: 0,
      resetsAt: resetAtIso(),
      message:
        'We could not verify usage limits right now. Please try again in a moment.',
    }
  }

  const row = data as { count: number | null; limit_override: number | null } | null
  const current = row?.count ?? 0
  const effectiveLimit = row?.limit_override != null && row.limit_override >= 0 ? row.limit_override : limit

  const remaining = Math.max(0, effectiveLimit - current)
  const allowed = current < effectiveLimit

  return {
    allowed,
    current,
    limit: effectiveLimit,
    remaining,
    resetsAt: resetAtIso(),
    message: allowed
      ? undefined
      : `You've reached the daily limit of ${effectiveLimit} for this action. It resets at ${resetAtIso()}.`,
  }
}

/** Anonymous-path equivalent of incrementRateLimit (lib/rateLimit.ts). */
export async function incrementAnonymousRateLimit(opts: {
  identityHash: string
  action: string
}): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.rpc('increment_anonymous_rate_limit', {
    p_identity_hash: opts.identityHash,
    p_action: opts.action,
    p_window_start: windowStart(),
  })

  if (error) {
    console.error('anonymousRateLimit increment error: action=' + opts.action, error?.message ?? '')
  }
}

function resetAtIso(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}
