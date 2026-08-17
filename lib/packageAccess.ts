/**
 * Who may see a resume, and why (TASK-162).
 *
 * THE OLD GATE WAS ON THE WRONG THING. Both the PDF route and the resume screen
 * refused any package with `is_paid = false`. That gated the CONTAINER. What the
 * user actually pays for is the AI rewrite — the generated summary and the
 * achievement bullets — and a package that has never been through the optimizer
 * contains none of it. Every word in such a resume is the user's own typing, taken
 * from their own profile. Refusing to show it to them protected nothing and was
 * the reason a free tier needed a whole second rendering path.
 *
 * SO THE GATE IS NOW: does this row hold AI-written text?
 *
 *   optimized_content IS NULL   -> nothing was generated. Free to view and
 *                                  download, whatever is_paid says.
 *   optimized_content present   -> the paid deliverable. is_paid required, no
 *                                  exceptions, read server-side from the row.
 *
 * This is strictly safer than a comment claiming it is safe, because the thing
 * being protected and the thing being checked are now the same thing. Under the
 * old rule the two were only correlated, and the correlation held by luck: it
 * happened to be true that unpaid rows had no content.
 *
 * CAN CONTENT EXIST WITHOUT PAYMENT? No, and it is worth being explicit since the
 * whole gate rests on it. `/api/optimize` Phase B refuses with 402 unless the row
 * it loads is genuinely paid (migration 033, TASK-131), so generation cannot run
 * first. Nothing else writes `optimized_content` except PATCH, which only edits
 * text that already exists. There is no refund path that flips `is_paid` back to
 * false, so a paid row cannot become unpaid while keeping its content. If a refund
 * flow is ever added, THIS is the invariant it has to preserve.
 *
 * ONE HELPER, EVERY CALL SITE. Two copies of a payment check will eventually
 * disagree, and the copy that is wrong will be the permissive one.
 */

export interface PackageAccessInput {
  is_paid?: boolean | null
  optimized_content?: unknown | null
}

/** True when the row holds model-written text, which is the paid deliverable. */
export function hasGeneratedContent(pkg: PackageAccessInput): boolean {
  return pkg.optimized_content !== null && pkg.optimized_content !== undefined
}

/**
 * May this resume be rendered and downloaded?
 *
 * Deliberately NOT "is the user entitled to the product" — it answers only
 * "does serving this row hand over something that was paid for". Auth and
 * ownership are separate and are still checked first at every call site; this
 * never sees a user id and cannot be mistaken for an ownership check.
 */
export function canServeDocument(pkg: PackageAccessInput): boolean {
  if (!hasGeneratedContent(pkg)) return true
  return pkg.is_paid === true
}

/**
 * What kind of resume this is, for honest labelling.
 *
 * Read from content rather than from `tier`, so a row whose `tier` is missing or
 * wrong still describes itself correctly to the user. `tier` drives the quota;
 * this drives the words on the screen.
 */
export function resumeKind(pkg: PackageAccessInput): 'free' | 'optimized' {
  return hasGeneratedContent(pkg) ? 'optimized' : 'free'
}
