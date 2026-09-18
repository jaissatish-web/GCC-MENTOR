/**
 * The ATS score for a CV that is ALREADY SAVED (2026-09-17). SERVER-SAFE, no model.
 *
 * A package built while its job analysis failed has a CV but no score, so the
 * result page showed none (founder report). Given the analysis, this scores the
 * saved document exactly as the build would: before = the profile laid out as a
 * CV, after = the saved document, plus the honest maximum, why it fits and the
 * gaps. No suggestions: those are drafted only by a build.
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizationLevel } from '@/types/package'
import type { ResumeDocument } from '@/lib/resumeDocument'
import { baselineDocument, profileFingerprint, qualificationScore } from './analyze'
import { buildEvidenceMap } from './evidence'
import { maxAchievableScore, scoreDocumentFromResume, scoreResume } from './score'
import { reachableTargetBand } from './suggestions'
import { containsTermRaw } from './text'
import type { JobTargetProfile, MatchReport, VerifiedBridge } from './types'

export function reportForSavedDocument(opts: {
  profile: CareerProfileFull
  target: JobTargetProfile
  bridges: VerifiedBridge[]
  analysisId: string | null
  targetJobTitle: string
  level: OptimizationLevel
  document: ResumeDocument
}): MatchReport {
  const { profile, target, bridges, document } = opts
  const qualifications = qualificationScore(profile, target)
  const baseDoc = scoreDocumentFromResume(baselineDocument(profile, opts.targetJobTitle))
  const before = scoreResume(baseDoc, target, qualifications)
  const after = scoreResume(scoreDocumentFromResume(document), target, qualifications)
  const evidence = buildEvidenceMap(profile, target, bridges)
  const text = JSON.stringify(document)
  return {
    report_version: 1,
    mode: target.mode,
    analysis_id: opts.analysisId,
    target,
    bridges,
    profile_fingerprint: profileFingerprint(profile),
    qualifications,
    before,
    max_total: maxAchievableScore(baseDoc, target, evidence.keywords, qualifications, {
      summary: true,
      experienceIds: (profile.work_experience ?? []).map((e) => e.id),
    }),
    level: opts.level,
    after,
    why_fits: after.keywords
      .filter((k) => k.credit === 1 && k.kind !== 'soft_skill')
      .sort((a, b) => (a.importance === b.importance ? 0 : a.importance === 'must' ? -1 : 1))
      .slice(0, 6)
      .map((k) => ({ term: k.term, where: (k.where ?? []).filter((w) => w !== 'skills') })),
    gaps: evidence.keywords
      .filter((k) => k.status === 'gap' && k.kind !== 'soft_skill' && !containsTermRaw(text, k.term, k.aliases))
      .map((k) => ({ term: k.term, importance: k.importance, kind: k.kind })),
    kept_original: [],
    suggestions: [],
    projected_with_suggestions: after.total,
    target_band: reachableTargetBand(opts.level, after.total),
    generated_at: new Date().toISOString(),
  }
}
