import type { SelectedBlocks } from '@/lib/ai/buildOptimizationPrompt'
import type { OptimizationLevel } from '@/types/package'
import type { AnalysisV3, Requirement } from './engine'

export interface DutySuggestion {
  id: string
  term: string
  block: string
  quote: string
  importance: 'must' | 'nice'
  levels: OptimizationLevel[]
}

/** Identity includes the source evidence: changed facts require fresh confirmation. */
export function requirementId(r: Requirement): string {
  return JSON.stringify([r.location, r.term, r.quote])
}

export function dutySuggestions(a: AnalysisV3, roleIds: readonly string[]): DutySuggestion[] {
  if (a.fieldMatch === 'different') return []
  const permitted = new Set(['responsibility', 'skill', 'domain', 'soft_skill', 'equipment'])
  return a.requirements.filter(r => permitted.has(r.kind) && r.group === 'B' && !!r.location && roleIds.includes(r.location) && !!r.quote)
    .map(r => ({ id: requirementId(r), term: r.term, block: r.location!, quote: r.quote!, importance: r.importance,
      levels: r.importance === 'must' ? ['moderate', 'high'] : ['high'] }))
}

/** Goals guide a recommendation; they never alter the measured score. */
export function recommendedLevel(before: number, expected: Record<OptimizationLevel, number>): OptimizationLevel {
  if (before >= 75 || expected.easy >= Math.min(100, before + 10)) return 'easy'
  if (expected.moderate >= Math.min(100, before + 25)) return 'moderate'
  if (expected.high >= 75 && expected.high > expected.moderate) return 'high'
  return expected.moderate > expected.easy ? 'moderate' : 'easy'
}

/** Absent choices retain legacy pending-suggestion behavior. An empty list adds nothing. */
export function selectedAnalysis(a: AnalysisV3, blocks: SelectedBlocks, level: OptimizationLevel): AnalysisV3 {
  if (!Array.isArray(blocks.confirmedRequirements)) return a
  const selected = new Set(blocks.confirmedRequirements)
  const allowed = new Set(dutySuggestions(a, blocks.experienceIds).filter(s => s.levels.includes(level) && selected.has(s.id)).map(s => s.id))
  return { ...a, requirements: a.requirements.map(r => r.group === 'B' && !allowed.has(requirementId(r)) ? { ...r, group: 'C' as const } : r) }
}


export interface ResumeSkillSuggestion {
  id: string
  term: string
  importance: 'must' | 'nice'
  kind: string
}

/** A missing skill is a question, never evidence of work at any employer. */
export function resumeSkillSuggestions(a: AnalysisV3): ResumeSkillSuggestion[] {
  const kinds = new Set(['skill', 'tool', 'standard', 'equipment'])
  return a.requirements.filter(r => r.group !== 'A' && kinds.has(r.kind))
    .map(r => ({id: JSON.stringify(['resume-skill', r.kind, r.term, r.location, r.quote]), term:r.term, importance:r.importance, kind:r.kind}))
}

export function confirmedResumeSkills(a: AnalysisV3, blocks: SelectedBlocks, level: OptimizationLevel): ResumeSkillSuggestion[] {
  if (level === 'easy' || !Array.isArray(blocks.confirmedSkills)) return []
  const ids = new Set(blocks.confirmedSkills)
  return resumeSkillSuggestions(a).filter(s => ids.has(s.id))
}
