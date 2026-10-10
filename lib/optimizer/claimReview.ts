import type { ResumeDocument } from '@/lib/resumeDocument'
import type { MatchReport } from './types'
import type { Suggestion } from './suggestions'

/** Older builds marked unverified claims as confirmed after a general consent. */
export function needsClaimReview(value: unknown): boolean {
  const report = value as MatchReport | null
  return report?.auto_applied === true && Array.isArray(report.suggestions) && report.suggestions.some((s) => s.status === 'confirmed')
}

export const CLAIM_REVIEW_MESSAGE = 'Review the suggested experience claims for this CV before downloading or generating more preparation. Confirm each true claim or remove it.'

export function reviewSuggestions(report: MatchReport | null): Suggestion[] {
  return (report?.suggestions ?? []).map((s) => needsClaimReview(report) && s.status === 'confirmed' ? { ...s, status: 'pending' as const } : s)
}

/** A review draft excludes old automatic additions; the stored CV is untouched. */
export function documentWithoutAutomaticClaims(doc: ResumeDocument, report: MatchReport | null): ResumeDocument {
  if (!needsClaimReview(report)) return doc
  const automatic = (report?.suggestions ?? []).filter((s) => s.status === 'confirmed')
  return {
    ...doc,
    experience: doc.experience.map((x) => ({
      ...x,
      bullets: x.bullets.filter((b) => !automatic.some((s) => s.block === x.entry.id && s.text.trim() === b.trim())),
    })),
  }
}
