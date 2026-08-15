import { randomBytes, createHash } from 'crypto'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import type { CareerProfileDraft } from '@/types/careerProfile'
import type { AtsScoreResult } from '@/lib/ai/atsScorePrompt'
import type { JobMatchResult } from '@/types/jobMatch'

/**
 * Anonymous analysis session storage (TASK-069, migration 028).
 *
 * Lets a visitor scan a resume with no account, then claim that exact
 * result on signup instead of re-uploading (docs/GCC_READINESS_JOB_MATCH.md
 * §15-17). See the migration's own header for the PII-retention reasoning —
 * this is server-only by construction (the service-role client + Node's
 * `crypto`), same as lib/anonymousRateLimit.ts.
 *
 * SECURITY MODEL: the table's uuid `id` is never treated as a capability.
 * Callers must present the RAW token (held in an HttpOnly cookie); only its
 * SHA-256 hash is ever stored, so a database compromise alone does not hand
 * out usable tokens — same principle as password storage, not reversible
 * encryption. Generating a fresh token is cheap enough that there is no
 * reason to ever accept a client-supplied one.
 */

export const SESSION_COOKIE_NAME = 'gcc_anon_session'

const DEFAULT_TTL_DAYS = 7

function ttlDays(): number {
  const raw = process.env.ANONYMOUS_SESSION_TTL_DAYS
  const n = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_DAYS
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * `extracted_profile` is `jsonb NOT NULL` (migration 028, written when a draft
 * was always produced). Rather than change a live column's constraint for this,
 * "no draft" is stored as an empty object and mapped back to null on the way
 * out — in these two functions only, so no caller ever has to know. A future
 * migration could drop the NOT NULL and delete both helpers; nothing else
 * depends on the representation.
 */
function draftForStorage(draft: CareerProfileDraft | null): CareerProfileDraft | Record<string, never> {
  return draft ?? {}
}

function draftFromStorage(raw: unknown): CareerProfileDraft | null {
  if (!raw || typeof raw !== 'object') return null
  if (Object.keys(raw as Record<string, unknown>).length === 0) return null
  return raw as CareerProfileDraft
}

export interface AnonymousSessionData {
  resumeText: string
  /**
   * NULL whenever extraction did not run.
   *
   * Since TASK-109 the free scan only extracts when a job description was
   * supplied (the Job Match engine needs the candidate side; the readiness
   * score no longer does). The session must still be written in that case —
   * the scan result and the raw resume text are exactly what "your scan is
   * kept for 7 days" promises, and what a /gulf-readiness refresh reads back.
   */
  extractedProfile: CareerProfileDraft | null
  jobDescription: string | null
  atsScoreResult: AtsScoreResult | null
  /** TASK-071. Null whenever no job description was given, or the Job Match engine's AI calls failed — the rest of the session is still valid either way. */
  jobMatchResult: JobMatchResult | null
}

/**
 * Create a new session or refresh an existing one (matched by the presented
 * token, if any). One evolving session per anonymous visitor rather than a
 * new row per scan — repeat scans before signup overwrite the prior draft,
 * they don't pile up. Returns the token to set as the response cookie: the
 * SAME token if one was validly presented and refreshed, a freshly
 * generated one otherwise.
 */
export async function upsertAnonymousSession(opts: {
  existingToken: string | null
  identityHash: string
  data: AnonymousSessionData
}): Promise<string> {
  const supabase = createServiceRoleClient()
  const expiresAt = new Date(Date.now() + ttlDays() * 24 * 60 * 60 * 1000).toISOString()

  if (opts.existingToken) {
    const existingHash = hashToken(opts.existingToken)
    const { data: updated, error } = await supabase
      .from('anonymous_analysis_sessions')
      .update({
        resume_text: opts.data.resumeText,
        extracted_profile: draftForStorage(opts.data.extractedProfile),
        job_description: opts.data.jobDescription,
        ats_score_result: opts.data.atsScoreResult,
        job_match_result: opts.data.jobMatchResult,
        expires_at: expiresAt,
      })
      .eq('token_hash', existingHash)
      .gt('expires_at', new Date().toISOString())
      .select('id')
      .maybeSingle()

    if (!error && updated) {
      return opts.existingToken // same token still valid — cookie unchanged
    }
    // Presented token didn't match a live row (expired, claimed, or never
    // existed) — fall through and mint a fresh session rather than erroring;
    // this is a best-effort continuity feature, not a hard requirement.
  }

  const token = generateSessionToken()
  const { error: insertError } = await supabase.from('anonymous_analysis_sessions').insert({
    token_hash: hashToken(token),
    identity_hash: opts.identityHash,
    resume_text: opts.data.resumeText,
    extracted_profile: draftForStorage(opts.data.extractedProfile),
    job_description: opts.data.jobDescription,
    ats_score_result: opts.data.atsScoreResult,
    job_match_result: opts.data.jobMatchResult,
    expires_at: expiresAt,
  })
  if (insertError) {
    console.error('anonymousSession insert error', insertError.message)
  }
  return token
}

/**
 * Look up and immediately delete a session by its presented token —
 * single-use by design (docs/GCC_READINESS_JOB_MATCH.md §17: the data
 * becomes a permanent user record, so the temporary anonymous copy has no
 * further reason to exist; keeping it around after a successful claim would
 * be pure PII liability with no product benefit). Returns null for any
 * invalid, expired, or already-claimed token — the caller cannot distinguish
 * these cases, which is correct: none of them should behave differently
 * from "no anonymous session exists."
 */
/**
 * Read-only session lookup — used by the Gulf Readiness results page
 * (/gulf-readiness) to display scan results without consuming the
 * session. The session row is NOT deleted by this function (unlike
 * claimAnonymousSession, which is single-use for signup handoff).
 */
export async function getAnonymousSession(token: string): Promise<AnonymousSessionData | null> {
  const supabase = createServiceRoleClient()
  const tokenHash = hashToken(token)

  const { data: row, error } = await supabase
    .from('anonymous_analysis_sessions')
    .select('resume_text, extracted_profile, job_description, ats_score_result, job_match_result')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !row) return null
  return {
    resumeText: row.resume_text as string,
    extractedProfile: draftFromStorage(row.extracted_profile),
    jobDescription: (row.job_description as string | null) ?? null,
    atsScoreResult: (row.ats_score_result as AtsScoreResult | null) ?? null,
    jobMatchResult: (row.job_match_result as JobMatchResult | null) ?? null,
  }
}

export async function claimAnonymousSession(token: string): Promise<AnonymousSessionData | null> {
  const supabase = createServiceRoleClient()
  const tokenHash = hashToken(token)

  const { data: row, error } = await supabase
    .from('anonymous_analysis_sessions')
    .select('resume_text, extracted_profile, job_description, ats_score_result, job_match_result')
    .eq('token_hash', tokenHash)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error || !row) return null

  // Delete immediately — single-use. Best-effort: if the delete fails, the
  // row will still expire on its own via expires_at, so this is not a
  // correctness dependency, only a "don't linger longer than necessary" one.
  const { error: deleteError } = await supabase
    .from('anonymous_analysis_sessions')
    .delete()
    .eq('token_hash', tokenHash)
  if (deleteError) {
    console.error('anonymousSession claim: delete-after-read failed', deleteError.message)
  }

  return {
    resumeText: row.resume_text as string,
    extractedProfile: draftFromStorage(row.extracted_profile),
    jobDescription: (row.job_description as string | null) ?? null,
    atsScoreResult: (row.ats_score_result as AtsScoreResult | null) ?? null,
    jobMatchResult: (row.job_match_result as JobMatchResult | null) ?? null,
  }
}
