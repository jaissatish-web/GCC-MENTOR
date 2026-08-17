/**
 * What kind of resume a package holds — for honest labelling only.
 *
 * This module replaced `lib/packageAccess.ts` on 2026-08-17, when the founder
 * decided every service should be open while the AI pipeline is built. That file
 * answered "may this resume be served?" — a payment question — and nothing asks
 * it any more, so keeping a module named "access" that granted access to
 * everything would have been worse than deleting it.
 *
 * WHAT IS LEFT IS NOT A GATE. It answers "does this row hold model-written
 * text?", which decides the words on the screen: a resume built from the user's
 * own typing is described differently from one the optimizer rewrote. No caller
 * may use it to decide permission.
 *
 * WHEN THE PAID LOCK RETURNS, the rule it enforced is worth restoring exactly,
 * because it took a while to get right:
 *
 *   optimized_content IS NULL   -> nothing was generated. Free to view and
 *                                  download, whatever is_paid says.
 *   optimized_content present   -> the paid deliverable. is_paid required, read
 *                                  server-side from the row, no exceptions.
 *
 * That gates the AI-WRITTEN TEXT rather than the container, which is what the
 * user actually pays for. An earlier version refused any row that was not marked
 * paid — gating the container — which protected nothing, because a row that never
 * went through the optimizer contains only the user's own words. It was also the
 * single reason a free tier looked like it needed a second rendering path.
 *
 * The invariant that made it safe: content cannot exist without payment.
 * Generation refused unless the row was paid; nothing else wrote content except
 * a text edit, which only edits text that already exists; and no refund path
 * flipped is_paid back. **A refund flow would have to preserve that.** Note that
 * while the locks are off this invariant is being broken on purpose — rows will
 * exist with content and is_paid = false — so re-applying the lock has to deal
 * with those rows rather than assume they cannot exist.
 *
 * ONE HELPER, EVERY CALL SITE. Two copies of a rule like this eventually
 * disagree, and the copy that is wrong is always the permissive one.
 */

export interface PackageContentInput {
  is_paid?: boolean | null
  optimized_content?: unknown | null
}

/** True when the row holds model-written text. */
export function hasGeneratedContent(pkg: PackageContentInput): boolean {
  return pkg.optimized_content !== null && pkg.optimized_content !== undefined
}

/**
 * What kind of resume this is, for honest labelling.
 *
 * Read from content rather than from `tier`, so a row whose `tier` is missing or
 * wrong still describes itself correctly to the user.
 */
export function resumeKind(pkg: PackageContentInput): 'free' | 'optimized' {
  return hasGeneratedContent(pkg) ? 'optimized' : 'free'
}
