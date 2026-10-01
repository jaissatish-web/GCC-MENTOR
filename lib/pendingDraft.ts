import type { createClient } from '@/lib/supabase/server'
import type { CareerProfileDraft } from '@/types/careerProfile'
import type { ParseReport } from '@/lib/resumeParse/pipeline'

/**
 * A CV reading waiting for the user's decision (founder request 2026-09-11,
 * migration 047).
 *
 * Reading a CV is a paid model call. Its result is saved here BEFORE the parse
 * route answers, so a refresh, a closed browser or a dropped connection can no
 * longer throw it away. The Career Profile page looks for it on every load and
 * reopens the decision; it is deleted only once the user has resolved it.
 *
 * Uses the caller's own session client, so owner-only RLS applies — a user can
 * only ever write, read or delete their own reading.
 */

type SessionClient = Awaited<ReturnType<typeof createClient>>

export type PendingDraftSource = 'upload' | 'paste'

export interface PendingDraft {
  draft: CareerProfileDraft
  source: PendingDraftSource
  created_at: string
  /**
   * How the reading went (migration 059, 2026-10-01): timings, layout notes and
   * the "please check" field list the editor shows. Field paths only — never a
   * value. Null for readings kept before the column existed.
   */
  report?: ParseReport | null
}

/**
 * Keep the latest reading. One row per user, so a newer reading replaces an
 * older unresolved one — the newer CV is the one they meant.
 *
 * Never throws and never fails the request: the user still has the draft in
 * hand from the response. A failure is logged, because it means that one
 * reading would not survive a closed browser.
 */
export async function savePendingDraft(
  supabase: SessionClient,
  userId: string,
  draft: CareerProfileDraft,
  source: PendingDraftSource,
  report?: ParseReport,
): Promise<void> {
  const row = { user_id: userId, draft, source, created_at: new Date().toISOString(), report: report ?? null }
  let { error } = await supabase.from('pending_profile_drafts').upsert(row, { onConflict: 'user_id' })
  // Before migration 059 is applied the column does not exist: keep the
  // reading without its report rather than lose it.
  if (error && /report/.test(error.message)) {
    const { report: _omit, ...withoutReport } = row
    ;({ error } = await supabase.from('pending_profile_drafts').upsert(withoutReport, { onConflict: 'user_id' }))
  }
  if (error) console.error('pending draft save failed: user=' + userId, error.message)
}
