import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * Rate limiting (TASK-038).
 *
 * Enforced SERVER-SIDE in the API route, BEFORE the model call — never from
 * the client (docs/ADMIN.md §5). This module is server-only by construction:
 * it uses the service-role client, which bypasses RLS.
 *
 * WHY service-role: the `rate_limits` table (migration 013) has owner-only
 * RLS (`user_id = auth.uid()`), so a normal session client cannot read OTHER
 * users' rows. But the requirement is SECONDARY KEYING on phone/email — a
 * second account created with the same phone/email must still be limited. To
 * count attempts across all accounts sharing an identifier, the lookup must
 * see rows that are not the caller's own, which only the service-role client
 * can do. rate_limits holds no PII (counts and a nullable override), and this
 * module never ships to the client — consistent with docs/RULES.md §6.
 *
 * Default: RATE_LIMIT_EXTRACTIONS_PER_DAY env var, 5/day (see .env.example).
 */

export const LIMIT_ACTION_EXTRACTION = 'profile_extraction'

/**
 * TASK-021 addition. docs/ADMIN.md §5 says only free actions need a limit —
 * "profile extraction attempts... Paid actions are self-limiting." That
 * reasoning assumes payment gates the expensive call. It does not:
 * docs/USER_FLOW.md's screen order is Optimizing (07) -> Before/after
 * preview (08, real generated content, user-editable) -> Payment (09).
 * generate() fires and a packages row is created BEFORE any money changes
 * hands, so "self-limiting" does not hold for this action. Added the same
 * way extraction already works — no changes needed to the functions below,
 * they were already action-generic.
 */
export const LIMIT_ACTION_OPTIMIZATION = 'optimization'

/**
 * TASK-051 addition. A promo code is a guessable string — without a limit on
 * redemption ATTEMPTS (not just successes), someone could brute-force a
 * short/simple code by trying strings against the (unauthenticated-feeling
 * but actually login-required) redeem endpoint. Deliberately generous
 * (attempts, not successes) so a beta tester fat-fingering their own code
 * twice never gets blocked.
 */
export const LIMIT_ACTION_PROMO_REDEMPTION = 'promo_redemption'

/**
 * The service journey's quota actions (audit H03, 2026-09-15). Before this, the
 * cover letter, interview Q&A and every mock-interview call had NO limit at all:
 * a signed-in user could spend model calls without end. Each is now reserved
 * before its model call through lib/ai/serviceGuard.ts.
 *
 * THE DEFAULTS BELOW ARE ABUSE CEILINGS, NOT COMMERCIAL ALLOWANCES. They are
 * set generously above what one person preparing for real jobs uses in a day,
 * so a genuine user never meets them, while a script cannot spend without end.
 * The free-plan allowance is a founder decision (docs/SAAS_RELEASE_CHECKLIST.md);
 * /admin/services overrides any of them without a deploy, and env vars override
 * the code default.
 */
export const LIMIT_ACTION_JOB_DESCRIPTION = 'job_description'
export const LIMIT_ACTION_COVER_LETTER = 'cover_letter'
export const LIMIT_ACTION_INTERVIEW_QA = 'interview_qa'
export const LIMIT_ACTION_MOCK_START = 'mock_interview_start'
export const LIMIT_ACTION_MOCK_ANSWER = 'mock_interview_answer'
export const LIMIT_ACTION_MOCK_REPORT = 'mock_interview_report'

const DEFAULT_EXTRACTIONS_PER_DAY = 5
const DEFAULT_OPTIMIZATIONS_PER_DAY = 20
const DEFAULT_PROMO_REDEMPTIONS_PER_DAY = 10

/** action -> [env var, code default]. Actions not listed use the extraction default. */
const DAILY_DEFAULTS: Record<string, [string, number]> = {
  [LIMIT_ACTION_JOB_DESCRIPTION]: ['RATE_LIMIT_JOB_DESCRIPTIONS_PER_DAY', 30],
  [LIMIT_ACTION_COVER_LETTER]: ['RATE_LIMIT_COVER_LETTERS_PER_DAY', 20],
  [LIMIT_ACTION_INTERVIEW_QA]: ['RATE_LIMIT_INTERVIEW_QA_PER_DAY', 10],
  [LIMIT_ACTION_MOCK_START]: ['RATE_LIMIT_MOCK_INTERVIEWS_PER_DAY', 10],
  // 10 interviews x up to 15 questions.
  [LIMIT_ACTION_MOCK_ANSWER]: ['RATE_LIMIT_MOCK_ANSWERS_PER_DAY', 150],
  [LIMIT_ACTION_MOCK_REPORT]: ['RATE_LIMIT_MOCK_REPORTS_PER_DAY', 10],
}

/**
 * Keys are local-calendar dates; the window resets at the next midnight.
 * Exported for TASK-040 (admin rate-limit override), which must target the
 * exact same window row this module reads/increments — a locally
 * reimplemented copy could drift (e.g. across a DST boundary) and silently
 * write an override to a row nothing ever reads.
 */
export function windowStart(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Next local midnight, as an ISO string — what the reset message shows. */
/**
 * When today's limit resets, in words that are right in every timezone
 * (2026-09-18). The message used to print the raw ISO instant —
 * "It resets at 2026-09-18T18:29:59.999Z" — to users in Riyadh and Kochi.
 */
export function resetsInText(now: Date = new Date()): string {
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)
  const hours = Math.round((end.getTime() - now.getTime()) / 3_600_000)
  if (hours <= 0) return 'in under an hour'
  return hours === 1 ? 'in about an hour' : `in about ${hours} hours`
}

export function resetAtIso(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

function parsePositiveEnvInt(v: string | undefined): number | null {
  if (!v) return null
  const n = Number.parseInt(v, 10)
  return Number.isFinite(n) && n >= 0 ? n : null
}

/** The daily cap for an action. Env-driven. */
export function getDefaultDailyLimit(action: string): number {
  if (action === LIMIT_ACTION_EXTRACTION) {
    return parsePositiveEnvInt(process.env.RATE_LIMIT_EXTRACTIONS_PER_DAY) ?? DEFAULT_EXTRACTIONS_PER_DAY
  }
  if (action === LIMIT_ACTION_OPTIMIZATION) {
    return parsePositiveEnvInt(process.env.RATE_LIMIT_OPTIMIZATIONS_PER_DAY) ?? DEFAULT_OPTIMIZATIONS_PER_DAY
  }
  if (action === LIMIT_ACTION_PROMO_REDEMPTION) {
    return parsePositiveEnvInt(process.env.RATE_LIMIT_PROMO_REDEMPTIONS_PER_DAY) ?? DEFAULT_PROMO_REDEMPTIONS_PER_DAY
  }
  const configured = DAILY_DEFAULTS[action]
  if (configured) return parsePositiveEnvInt(process.env[configured[0]]) ?? configured[1]
  return DEFAULT_EXTRACTIONS_PER_DAY
}

export interface RateLimitStatus {
  allowed: boolean
  current: number
  limit: number
  remaining: number
  resetsAt: string
  message?: string
}

/**
 * Resolve the set of user_ids that share the caller's phone/email identity
 * (secondary keying — survives account cycling). The caller's own id is always
 * included even if no profile row exists yet.
 */
export async function identityUserIds(userId: string, phone?: string | null, email?: string | null): Promise<string[]> {
  const supabase = createServiceRoleClient()
  const ids = new Set<string>([userId])

  const phoneQuery = phone && phone.trim()
    ? `phone.eq.${phone.trim()}`
    : null
  const emailQuery = email && email.trim()
    ? `email.eq.${email.trim()}`
    : null

  const clauses: string[] = []
  if (phoneQuery) clauses.push(phoneQuery)
  if (emailQuery) clauses.push(emailQuery)
  if (clauses.length === 0) return Array.from(ids)

  // All siblings share phone OR email. PostgREST treats a comma list as AND;
  // OR is expressed via the `or` parameter.
  const { data, error } = await supabase
    .from('career_profiles')
    .select('user_id')
    .or(clauses.join(','))
  if (error) {
    // Fail open for the identity lookup only: never let a lookup error block a
    // legitimate caller. The base per-user limit still applies (caller's id).
    console.error('rateLimit identity lookup error', error?.message ?? '')
    return Array.from(ids)
  }
  for (const row of data ?? []) {
    if (row && typeof row.user_id === 'string') ids.add(row.user_id)
  }
  return Array.from(ids)
}

/**
 * Return the rate-limit status for an action, counting attempts across all
 * accounts that share the caller's phone/email identity.
 */
export async function getRateLimitStatus(opts: {
  userId: string
  action: string
  phone?: string | null
  email?: string | null
}): Promise<RateLimitStatus> {
  const supabase = createServiceRoleClient()
  const today = windowStart()

  const ids = await identityUserIds(opts.userId, opts.phone, opts.email)

  const { data, error } = await supabase
    .from('rate_limits')
    .select('count, limit_override')
    .eq('action', opts.action)
    .eq('window_start', today)
    .in('user_id', ids)

  if (error) {
    console.error('rateLimit query error: user=' + opts.userId + ' action=' + opts.action, error?.message ?? '')
    // Fail closed on a DB error: a limit we cannot verify must not pass.
    return {
      allowed: false,
      current: Number.MAX_SAFE_INTEGER,
      limit: getDefaultDailyLimit(opts.action),
      remaining: 0,
      resetsAt: resetAtIso(),
      message:
        'We could not verify your usage limit right now. Please try again in a moment. ' +
        'If this persists, email the founder.',
    }
  }

  const rows = (data ?? []) as Array<{ count: number | null; limit_override: number | null }>
  const current = rows.reduce((sum, r) => sum + (r.count ?? 0), 0)
  const override = rows.find((r) => r.limit_override != null)?.limit_override ?? null
  const limit = override != null && override >= 0 ? override : getDefaultDailyLimit(opts.action)

  const remaining = Math.max(0, limit - current)
  const allowed = current < limit

  return {
    allowed,
    current,
    limit,
    remaining,
    resetsAt: resetAtIso(),
    message: allowed
      ? undefined
      : `You've reached your daily limit of ${limit} attempts for this action. ` +
        `It resets ${resetsInText()}. Need more? Email the founder — replies within a day.`,
  }
}

/**
 * Record one attempt against the caller's own rate_limits row for today.
 * Call AFTER the action consumes a slot (e.g. after a paid/consumed attempt).
 *
 * ATOMIC: the increment is a single Postgres statement inside the
 * `increment_rate_limit` RPC (migration 016):
 *   INSERT ... ON CONFLICT (user_id, action, window_start)
 *   DO UPDATE SET count = rate_limits.count + 1
 * so it is a single round trip and safe under concurrency. It is never a
 * read-then-write, which would drop increments under rapid concurrent calls.
 */
export async function incrementRateLimit(opts: {
  userId: string
  action: string
}): Promise<void> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase.rpc('increment_rate_limit', {
    p_user_id: opts.userId,
    p_action: opts.action,
    p_window_start: windowStart(),
  })

  if (error) {
    // A failed increment must not crash the caller; log it. The count simply
    // won't advance this attempt.
    console.error('rateLimit increment error: user=' + opts.userId + ' action=' + opts.action, error?.message ?? '')
  }
}