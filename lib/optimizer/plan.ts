/**
 * Tailoring plan (2026-09-17). PURE — computed in code from the evidence map.
 *
 * The model used to receive the profile and the advert and decide for itself
 * what to emphasise. Results varied run to run and strong matches were missed.
 * Now code decides, per block, exactly which employer terms may be used, which
 * must be kept, what to lead with, and how much room a role gets; the model
 * only writes. The plan is rendered into the prompt as BLOCK 4 and the quality
 * gate checks the output against the same plan.
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizationLevel } from '@/types/package'
import { containsTermRaw, prepare, containsTerm } from './text'
import type { EvidenceMap } from './evidence'
import type { KeywordEvidence, OptimizationMode } from './types'

export type RoleTier = 'primary' | 'supporting' | 'condensed'

export interface PlannedTerm {
  term: string
  /** Verbatim profile text proving it, when the term was bridged rather than literal. */
  quote: string | null
}

export interface EntryPlan {
  entryId: string
  tier: RoleTier
  relevance: number
  /** Employer wording this entry may adopt: bridged, or present only under an alias. */
  useTerms: PlannedTerm[]
  /** Employer terms this entry already states literally — must survive the rewrite. */
  keepTerms: string[]
  /** Terms to lead with, heaviest first. */
  leadWith: string[]
  /** High level only, for roles with no relevance: keep this many strongest bullets. */
  maxBullets: number | null
  sourceBulletCount: number
}

export interface SummaryPlan {
  /** Supported, heaviest-first terms the summary should be built on. */
  anchors: PlannedTerm[]
  /** e.g. "15+ years" — only when the profile's own summary states it. */
  yearsPhrase: string | null
  /** Employer terms the original summary already states. */
  keep?: string[]
}

export interface TailoringPlan {
  mode: OptimizationMode
  level: OptimizationLevel
  /** Share of planned useTerms the output must place. */
  coverageTarget: number
  entries: Record<string, EntryPlan>
  summary: SummaryPlan
  /** Target terms the profile does not support. Never written. */
  gaps: string[]
}

export const LEVEL_COVERAGE: Record<OptimizationLevel, number> = { easy: 0.5, moderate: 0.8, high: 1 }

export function statedYearsPhrase(summary: string | null | undefined): string | null {
  const m = /(\d[\d,]*\s*\+?\s*(?:years?|yrs?))/i.exec(summary ?? '')
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

function byWeight(a: KeywordEvidence, b: KeywordEvidence) {
  return b.weight - a.weight
}

export function buildTailoringPlan(
  profile: CareerProfileFull,
  evidence: EvidenceMap,
  mode: OptimizationMode,
  level: OptimizationLevel,
): TailoringPlan {
  const ordered = (profile.work_experience ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
  const kws = evidence.keywords.slice().sort(byWeight)

  const drafts = ordered.map((e, index) => {
    // Only the bullets and the role title are rendered on the CV. A term the
    // bullets already state must survive; a term found only in the description,
    // or only under an alias, is one the bullets may now say in the employer's words.
    const bullets = prepare((e.highlights ?? []).join('\n'))
    const role = prepare(e.role)
    const keepTerms: string[] = []
    const useTerms: PlannedTerm[] = []
    let relevance = 0
    for (const k of kws) {
      const inBulletsExact = containsTerm(bullets, k.term)
      const literalAny = k.literalEntryIds.includes(e.id)
      const bridge = k.bridges.find((b) => b.location === e.id)
      if (inBulletsExact) keepTerms.push(k.term)
      else if (literalAny && !containsTerm(role, k.term, k.aliases)) useTerms.push({ term: k.term, quote: null })
      else if (bridge) useTerms.push({ term: k.term, quote: bridge.quote })
      if (literalAny || bridge) relevance += k.weight
    }
    return { e, index, keepTerms, useTerms, relevance }
  })

  const maxRelevance = Math.max(0, ...drafts.map((d) => d.relevance))
  const entries: Record<string, EntryPlan> = {}
  for (const d of drafts) {
    const count = (d.e.highlights ?? []).length
    const tier: RoleTier =
      d.relevance > 0 && (d.relevance >= maxRelevance * 0.5 || d.index === 0)
        ? 'primary'
        : d.relevance > 0 || d.index < 2
          ? 'supporting'
          : 'condensed'
    entries[d.e.id] = {
      entryId: d.e.id,
      tier,
      relevance: Math.round(d.relevance * 10) / 10,
      useTerms: d.useTerms,
      keepTerms: d.keepTerms,
      leadWith: [...d.keepTerms, ...d.useTerms.map((u) => u.term)].slice(0, 3),
      maxBullets: level === 'high' && tier === 'condensed' && count > 3 ? 3 : null,
      sourceBulletCount: count,
    }
  }

  const anchors: PlannedTerm[] = kws
    .filter((k) => k.kind !== 'soft_skill' && k.placeable.includes('summary'))
    .slice(0, 6)
    .map((k) => ({
      term: k.term,
      quote: k.status === 'supported' ? (k.bridges[0]?.quote ?? null) : null,
    }))

  return {
    mode,
    level,
    coverageTarget: LEVEL_COVERAGE[level],
    entries,
    summary: {
      anchors,
      yearsPhrase: statedYearsPhrase(profile.professional_summary),
      keep: kws.filter((k) => k.inSummary && k.kind !== 'soft_skill').map((k) => k.term),
    },
    gaps: kws.filter((k) => k.status === 'gap').map((k) => k.term),
  }
}

const LEVEL_CONTRACT: Record<OptimizationLevel, string> = {
  easy:
    'EASY: keep each bullet\'s sentence structure, its order and the same number of bullets. ' +
    'Polish wording and adopt a USE term only where it replaces the candidate\'s own phrase naturally ' +
    '(at least half of them).',
  moderate:
    'MODERATE: rewrite each bullet to lead with the outcome or responsibility. Use at least 80% of the ' +
    'USE terms, each in the bullet its evidence comes from. Order bullets: a quantified result relevant to the target ' +
    'first, then bullets that evidence LEAD WITH terms. Keep every fact and the same number of bullets unless two say the same thing.',
  high:
    'HIGH: restructure fully for the target. Use EVERY USE term, each in the bullet its evidence comes ' +
    'from. Lead each role with its strongest evidence for the target — a quantified result first. Never merge ' +
    'away a fact. Where a role says MAX BULLETS, keep only that many of its most relevant bullets.',
}

/**
 * BLOCK 4 of the optimization prompt, for the blocks this call rewrites.
 * `includeSummary` / `entryIds` scope it to one section call.
 */
export function renderPlanForPrompt(
  plan: TailoringPlan,
  includeSummary: boolean,
  entryIds: readonly string[],
  profile: CareerProfileFull,
): string {
  const lines: string[] = []
  lines.push(
    'Computed in code from verified evidence in CANDIDATE FACTS. Follow it. It never adds a fact: every term ' +
      'below is already supported by the candidate\'s own text (the quote shows where).',
  )
  lines.push('')
  lines.push('LEVEL CONTRACT — ' + LEVEL_CONTRACT[plan.level])
  lines.push('')
  lines.push('WRITING RULES (every level):')
  lines.push('- Start every bullet with a past-tense action verb, for every role including the current one ("Prepared", "Supervised").')
  lines.push('- No grading words the profile does not use: proven, extensive, strong, excellent, dynamic, consistently, successfully, competitive, results-driven, proficient, hands-on, expertise.')
  lines.push('- End the sentence at the fact. Never append a benefit clause the source does not state: no ", ensuring…", ", maintaining…", ", contributing to…", ", resulting in…", ", enhancing…".')
  lines.push('- Keep each bullet 8–30 words. Keep every number exactly as written.')
  lines.push('- Where a USE term applies, write the employer\'s exact term in place of the candidate\'s own phrase for the same thing.')

  if (includeSummary) {
    lines.push('')
    lines.push('PROFESSIONAL SUMMARY:')
    lines.push(
      '- 3 to 4 sentences, 45 to 90 words, third person without pronouns ("Mechanical engineer with…"). ' +
        'Open with the professional identity that the work history supports, aligned to the target role.',
    )
    const kept = (plan.summary.keep ?? []).filter(Boolean)
    if (kept.length > 0) lines.push(`- KEEP (the original summary states these; they must still appear): ${kept.join('; ')}`)
    lines.push(
      '- Describe what the candidate has done ("Experienced in preparing IFRS financial statements"). ' +
        'No objective statement ("Seeking…", "Looking for…"), and never present the target job title as a title the candidate holds unless a role in CANDIDATE FACTS has it.',
    )
    if (plan.summary.yearsPhrase) {
      lines.push(`- The profile states "${plan.summary.yearsPhrase}". Use exactly that duration or none.`)
    } else {
      lines.push('- The profile states no total years of experience. Do not state or calculate one.')
    }
    if (plan.summary.anchors.length > 0) {
      lines.push('- ANCHORS (build the summary on these, in the employer\'s exact words where natural):')
      for (const a of plan.summary.anchors) {
        lines.push(`    • ${a.term}${a.quote ? `  — evidence: "${a.quote}"` : ''}`)
      }
    }
    lines.push(
      '- A term that appears only in SKILLS or CERTIFICATIONS may be named as a skill or qualification the ' +
        'candidate holds — never as something done at a named employer.',
    )
  }

  const byId = new Map((profile.work_experience ?? []).map((e) => [e.id, e]))
  for (const id of entryIds) {
    const p = plan.entries[id]
    const e = byId.get(id)
    if (!p || !e) continue
    lines.push('')
    lines.push(`ROLE [id: ${id}] ${e.role} at ${e.company} — ${p.tier.toUpperCase()}`)
    if (p.keepTerms.length) lines.push(`- KEEP (already stated; must still appear): ${p.keepTerms.join('; ')}`)
    if (p.useTerms.length) {
      lines.push('- USE (employer wording this role\'s own text supports):')
      for (const u of p.useTerms) lines.push(`    • ${u.term}${u.quote ? `  — evidence in this role: "${u.quote}"` : ''}`)
    }
    if (p.leadWith.length) lines.push(`- LEAD WITH: ${p.leadWith.join('; ')}`)
    if (p.maxBullets !== null) lines.push(`- MAX BULLETS: ${p.maxBullets}`)
    if (!p.keepTerms.length && !p.useTerms.length) {
      lines.push('- No target terms are evidenced here. Improve clarity and outcome-first framing only; add no target vocabulary.')
    }
  }

  if (plan.gaps.length) {
    lines.push('')
    lines.push(
      (plan.mode === 'job_description'
        ? 'FORBIDDEN — the employer asks for these and the profile does not support them. '
        : 'FORBIDDEN — common for this role but absent from the profile. ') +
        'Never write, imply or hedge toward them: ' +
        plan.gaps.join('; '),
    )
  }
  return lines.join('\n')
}

/** Terms from the plan that a block's output actually contains. */
export function placedTerms(text: string, terms: readonly string[], aliasesOf: (t: string) => string[]): string[] {
  return terms.filter((t) => containsTermRaw(text, t, aliasesOf(t)))
}
