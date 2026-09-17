/**
 * Shapes the optimizer sends to screens (2026-09-17). Client-safe.
 */

import type { ScoreDocument } from './score'
import type { JobTargetProfile, KeywordEvidence, MatchScore, OptimizationMode } from './types'

/** POST /api/optimize/analyze response. */
export interface AnalysisView {
  analysisId: string | null
  mode: OptimizationMode
  target: JobTargetProfile
  before: MatchScore
  /** Honest maximum with every block selected. */
  maxTotal: number
  qualifications: number | null
  keywords: KeywordEvidence[]
  /** The resume as it stands today, so the screen can project per selection. */
  scoreDocument: ScoreDocument
}

/** Plain-language label for a score part. */
export const PART_LABELS: Record<keyof MatchScore['parts'], string> = {
  keywords: 'Keywords & skills',
  summary: 'Summary alignment',
  title: 'Job title match',
  format: 'ATS readability',
  qualifications: 'Qualifications',
}

export function scoreBand(total: number): { label: string; tone: 'low' | 'mid' | 'high' } {
  if (total >= 75) return { label: 'Strong match', tone: 'high' }
  if (total >= 55) return { label: 'Fair match', tone: 'mid' }
  return { label: 'Needs work', tone: 'low' }
}
