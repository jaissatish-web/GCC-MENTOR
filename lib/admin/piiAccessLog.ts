/**
 * PII access logging (TASK-041).
 *
 * docs/ADMIN.md §4, docs/RULES.md §1/§3: any admin read of Career Profile or
 * package data must be recorded — who viewed it, whose data, when — BEFORE
 * the data reaches the caller. A read that fails to log must fail closed.
 *
 * ORDERING NOTE: the doc says "write the log row before returning the data,
 * not after" — about the HTTP response, not necessarily about internal read
 * order. This implementation logs BEFORE reading at all (not just before
 * responding), which is a strict superset of the requirement: if the log
 * write fails, the read never happens, so there is no PII in memory that a
 * later bug could accidentally leak. Simpler to reason about and verify than
 * "read, then log, then decide whether to respond."
 *
 * Log WHAT was accessed only — resource type + resource id. Never field
 * values (docs/RULES.md §3).
 */

import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

export class PiiAccessLogError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message)
    this.name = 'PiiAccessLogError'
  }
}

/** The two PII-bearing resource types that exist in the schema today. */
export type PiiResource = 'career_profile' | 'package'

export interface PiiAccessParams {
  /** The admin viewing the data — auth.uid() of the caller, never taken from the request body. */
  adminUserId: string
  /** Whose data is being viewed. */
  targetUserId: string
  resource: PiiResource
  resourceId: string
}

function validateParams(p: PiiAccessParams): void {
  const missing = (['adminUserId', 'targetUserId', 'resource', 'resourceId'] as const).filter(
    (k) => !p[k] || String(p[k]).trim() === '',
  )
  if (missing.length > 0) {
    throw new PiiAccessLogError(`PII access log call missing required field(s): ${missing.join(', ')}`)
  }
}

/**
 * Writes the mandatory access-log row. Throws PiiAccessLogError on any
 * failure — including a missing/invalid param, a DB error, or the insert
 * returning without confirmation. Callers MUST NOT proceed to read or return
 * data if this throws.
 */
export async function logPiiAccess(params: PiiAccessParams): Promise<void> {
  validateParams(params)

  const supabase = createServiceRoleClient()
  const { error, data } = await supabase
    .from('pii_access_log')
    .insert({
      admin_user_id: params.adminUserId,
      target_user_id: params.targetUserId,
      resource: params.resource,
      resource_id: params.resourceId,
    })
    .select('id')
    .single()

  if (error || !data) {
    // Log record IDs/keys only — never any field value (docs/RULES.md §3).
    console.error(
      'pii_access_log write FAILED — read must not proceed (fail closed): ' +
        `admin=${params.adminUserId} target=${params.targetUserId} resource=${params.resource} resource_id=${params.resourceId}`,
      error?.message ?? 'insert returned no row',
    )
    throw new PiiAccessLogError(
      'Failed to write PII access log — access blocked (fail closed)',
      error,
    )
  }
}

/**
 * The safe pattern for any admin route reading profile or package data:
 *
 *   return NextResponse.json(
 *     await withPiiAccessLog(
 *       { adminUserId, targetUserId, resource: 'career_profile', resourceId },
 *       () => fetchTheProfile(resourceId),
 *     ),
 *   )
 *
 * If the log write fails, `read` is never called, PiiAccessLogError
 * propagates, and the caller must turn that into an error response — never
 * a partial or fallback response containing the data.
 */
export async function withPiiAccessLog<T>(
  params: PiiAccessParams,
  read: () => Promise<T>,
): Promise<T> {
  await logPiiAccess(params)
  return read()
}
