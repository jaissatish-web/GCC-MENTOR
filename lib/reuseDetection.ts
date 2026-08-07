/**
 * Reuse detection — MVP-lite (TASK-036, docs/DASHBOARD_LIBRARY.md §6).
 *
 * Pure, rule-based title comparison ONLY. Purpose: before the user starts a new
 * optimization, warn if they already have a package with a similar target title,
 * so they can re-optimize (overwrite) it or start fresh.
 *
 * DELIBERATELY NOT fuzzy/automated %-matching: docs/RULES.md §4 and
 * DASHBOARD_LIBRARY.md §6 reserve automated %-match ranking against a job
 * description for Phase 2 (the ATS Score engine). This module does discrete,
 * explainable token-set comparison only — no similarity percentages.
 *
 * RULES (each exact, no tuning parameter):
 *   - Normalise: lowercase, strip punctuation to whitespace, collapse runs of
 *     whitespace to single spaces.
 *   - Tokenise to a SET of words, dropping common filler tokens ("the", "of",
 *     "and", ...) so filler can't cause false matches.
 *   - A package title is "similar" to the new title iff one normalized token set
 *     is a subset of the other (in either direction), AND the smaller set is
 *     non-empty. Equality is a trivial special case. This catches exact
 *     duplicates and the illustrated case — "Commissioning Engineer" vs
 *     "Commissioning Engineer (I&C)" — without any %-based scoring.
 */

export const FILLER_WORDS: ReadonlySet<string> = new Set([
  'the', 'of', 'and', 'for', 'in', 'at', 'on', 'to', 'a', 'an', 'or', 'as', 'by',
])

export interface SimilarPackage {
  id: string
  title: string
}

/** Split a title into normalized words (lowercase, punctuation stripped). */
export function normalizeTitleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // strip punctuation → whitespace
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

/** Normalized array of unique significant tokens (filler dropped). */
export function titleTokenSet(title: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of normalizeTitleTokens(title)) {
    if (FILLER_WORDS.has(w)) continue
    if (!seen.has(w)) {
      seen.add(w)
      out.push(w)
    }
  }
  return out
}

/**
 * Return the first package whose normalized token set is a subset of, or a
 * superset of, the given title's token set (either direction). Null when the
 * title is empty/too short or no package matches.
 */
export function findSimilarPackage(
  title: string,
  packages: Array<{ id: string; target_job_title?: string | null }>
): SimilarPackage | null {
  const tt = titleTokenSet(title)
  if (tt.length === 0) return null

  for (const pkg of packages) {
    const pt = titleTokenSet(pkg.target_job_title ?? '')
    if (pt.length === 0) continue
    const smallerSubset =
      pt.length <= tt.length ? pt.every((w) => tt.includes(w)) : tt.every((w) => pt.includes(w))
    if (smallerSubset) {
      return { id: pkg.id, title: pkg.target_job_title ?? '' }
    }
  }
  return null
}
