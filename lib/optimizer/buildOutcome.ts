import type { MatchReport } from './types'

/**
 * Did the writing service actually answer for this CV? (2026-09-23)
 *
 * Found on a real High build: the AI provider stalled, 8 of 10 blocks came back
 * with no output, and the pipeline — correctly refusing to invent anything —
 * kept the candidate's own words. The route then SAVED that as the "High"
 * optimized CV, and the screens explained the unchanged text as "only used when
 * every claim can be proven", which was not the reason.
 *
 * When more than half of the blocks the user asked for got no answer, the build
 * is a failure, not a result: nothing is saved, the daily allowance is not
 * spent (the reservation is released), and the same job can be built again.
 * A block rejected by the grounding or quality checks is NOT counted here —
 * that is the product working, not the service failing.
 */
export function mostlyUnanswered(
  report: Pick<MatchReport, 'kept_original'> | null | undefined,
  selected: { summary: boolean; experienceIds: readonly string[] },
): { failed: boolean; unanswered: number; asked: number } {
  const asked = (selected.summary ? 1 : 0) + selected.experienceIds.length
  const unanswered = new Set(
    (report?.kept_original ?? []).filter((k) => k.reason === 'no_output').map((k) => k.block),
  ).size
  return { failed: asked > 0 && unanswered / asked > 0.5, unanswered, asked }
}

export const UNANSWERED_MESSAGE =
  'The writing service was too slow to rewrite most of your CV this time, so nothing was saved and nothing was counted. Please try again — your target job is kept.'
