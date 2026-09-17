/**
 * GCC Mentor Match Score (2026-09-17). PURE and deterministic — see
 * docs/17_OPTIMIZER_ENGINE.md §4 and docs/09_SCORING.md.
 *
 * WHY A NEW SCORE. lib/jobMatch/requirementMapping.ts scores the PROFILE:
 * the skills list, certifications, education and years. Optimization changes
 * none of those, so the same function run after a build returns the same
 * number. This score reads the RESUME DOCUMENT the employer will actually see —
 * which words appear, where, and in whose terms — so a real improvement shows
 * as a real change, and nothing else can move it.
 *
 * NO MODEL PRODUCES ANY NUMBER HERE. Same document + same target = same score,
 * in the browser (projections on the setup screen) and on the server.
 *
 * Weights (sum 100; qualifications' share is redistributed when not applicable):
 *   keywords 45 · summary 10 · job title 10 · searchability 10 · qualifications 25
 */

import type { ResumeDocument } from '@/lib/resumeDocument'
import type { OptimizationLevel } from '@/types/package'
import { containsTerm, containsTermInSentence, prepare, stems, wordCount, type PreparedText } from './text'
import type { EvidenceLocation, JobTargetProfile, KeywordCredit, KeywordEvidence, MatchScore, ScorePart } from './types'
import { keywordWeight } from './evidence'

export const SCORING_VERSION = 'match-v1'

const WEIGHTS = { keywords: 45, summary: 10, title: 10, format: 10, qualifications: 25 }

const FIRST_PERSON = /\b(I|my|me|mine|myself)\b/

export interface ScoreDocument {
  headline: string
  summary: string
  experience: Array<{ entryId: string; role: string; bullets: string[] }>
  skills: string[]
  certifications: string[]
  education: string[]
  additional: string[]
  hasEmail: boolean
  hasPhone: boolean
}

export function scoreDocumentFromResume(doc: ResumeDocument): ScoreDocument {
  const contact = doc.header.contactItems
  const contactText = contact ? contact.map((c) => `${c.kind}:${c.text}`).join(' ') : doc.header.identityContact ?? ''
  return {
    headline: doc.header.targetJobTitle ?? '',
    summary: doc.summary ?? '',
    experience: (doc.experience ?? []).map((x) => ({ entryId: x.entry.id, role: x.entry.role ?? '', bullets: x.bullets ?? [] })),
    skills: (doc.skills ?? []).map((s) => s.name),
    certifications: (doc.certifications ?? []).map((c) => c.display),
    education: (doc.education ?? []).map((e) => e.line),
    additional: (doc.additional ?? []).map((a) => a.display),
    hasEmail: contact ? contact.some((c) => c.kind === 'email') : /@/.test(contactText),
    hasPhone: contact ? contact.some((c) => c.kind === 'phone' || c.kind === 'whatsapp') : /\d{6,}/.test(contactText.replace(/\D/g, '')),
  }
}

interface Prepared {
  raw: ScoreDocument
  summary: PreparedText
  entries: Array<{ entryId: string; text: PreparedText }>
  skills: PreparedText
  certifications: PreparedText
  education: PreparedText
  additional: PreparedText
}

function prepareDoc(doc: ScoreDocument): Prepared {
  return {
    raw: doc,
    summary: prepare(doc.summary),
    entries: doc.experience.map((e) => ({ entryId: e.entryId, text: prepare([e.role, ...e.bullets].join('\n')) })),
    skills: prepare(doc.skills.join('\n')),
    certifications: prepare(doc.certifications.join('\n')),
    education: prepare(doc.education.join('\n')),
    additional: prepare(doc.additional.join('\n')),
  }
}

function keywordCredits(p: Prepared, target: JobTargetProfile): KeywordCredit[] {
  return target.keywords.map((k) => {
    const where: string[] = []
    // Exact phrase = full credit. Every word of it in one sentence, in any
    // order and word form = 0.8: semantic ATS and recruiters find it, literal
    // ATS may not, so saying it in the employer's words is still worth doing.
    let loose = false
    if (containsTerm(p.summary, k.term, k.aliases)) where.push('summary')
    else if (containsTermInSentence(p.raw.summary, k.term, k.aliases)) {
      where.push('summary')
      loose = true
    }
    let exactInRole = false
    for (const e of p.entries) {
      const rawEntry = p.raw.experience.find((x) => x.entryId === e.entryId)
      if (containsTerm(e.text, k.term, k.aliases)) {
        where.push(e.entryId)
        exactInRole = true
      } else if (rawEntry && containsTermInSentence([rawEntry.role, ...rawEntry.bullets].join('\n'), k.term, k.aliases)) {
        where.push(e.entryId)
        loose = true
      }
    }
    const exactInContext = exactInRole || containsTerm(p.summary, k.term, k.aliases)
    const inContext = where.length > 0
    const anyLine = (lines: string[]) => lines.some((l) => containsTermInSentence(l, k.term, k.aliases))
    const inCerts = containsTerm(p.certifications, k.term, k.aliases) || anyLine(p.raw.certifications)
    const inEducation = containsTerm(p.education, k.term, k.aliases) || anyLine(p.raw.education)
    const inList =
      containsTerm(p.skills, k.term, k.aliases) ||
      containsTerm(p.additional, k.term, k.aliases) ||
      anyLine(p.raw.skills) ||
      anyLine(p.raw.additional)
    if (inList || inCerts || inEducation) where.push('skills')
    // A certification belongs in the certifications section and a degree in
    // education — being there IS full credit for those kinds.
    const sectionIsHome = (k.kind === 'certification' && inCerts) || (k.kind === 'education' && inEducation)
    const credit =
      (inContext && exactInContext) || sectionIsHome
        ? 1
        : inContext && loose
          ? 0.8
          : inList || inCerts || inEducation
            ? 0.6
            : 0
    return { term: k.term, importance: k.importance, kind: k.kind, credit, where }
  })
}

function weightedPct(credits: KeywordCredit[]): number {
  let num = 0
  let den = 0
  for (const c of credits) {
    const w = keywordWeight(c)
    num += w * c.credit
    den += w
  }
  return den === 0 ? 0 : (num / den) * 100
}

/** The keywords a summary is judged on: the heaviest few, in the target's own order. */
export function summaryAnchorTerms(target: JobTargetProfile, limit = 6): string[] {
  const musts = target.keywords.filter((k) => k.importance === 'must' && k.kind !== 'soft_skill')
  const pool = musts.length > 0 ? musts : target.keywords.filter((k) => k.kind !== 'soft_skill')
  return pool.slice(0, limit).map((k) => k.term)
}

function summaryScore(p: Prepared, doc: ScoreDocument, target: JobTargetProfile, extraFound?: Set<string>): number {
  const anchors = summaryAnchorTerms(target)
  const byTerm = new Map(target.keywords.map((k) => [k.term, k]))
  const words = wordCount(doc.summary)
  if (words === 0 && !extraFound) return 0
  const found = anchors.filter((t) => extraFound?.has(t) || containsTerm(p.summary, t, byTerm.get(t)?.aliases ?? [])).length
  const coverage = anchors.length === 0 ? 1 : found / anchors.length
  const lengthOk = extraFound ? true : words >= 25 && words <= 120
  return coverage * 100 * (lengthOk ? 1 : 0.8)
}

function titleScore(doc: ScoreDocument, target: JobTargetProfile): number {
  const titles = [target.job_title, ...target.title_variants].filter(Boolean)
  const headline = prepare(doc.headline)
  const headlineHit = titles.some((t) => containsTerm(headline, t))
  const content = (s: string) => new Set(stems(s).filter((x) => x.length > 2))
  let best = 0
  for (const t of titles) {
    const want = content(t)
    if (want.size === 0) continue
    for (const e of doc.experience) {
      const have = content(e.role)
      let hit = 0
      for (const w of want) if (have.has(w)) hit++
      best = Math.max(best, hit / want.size)
    }
  }
  return (headlineHit ? 50 : 0) + best * 50
}

/**
 * Searchability: what a parser and a recruiter's first scan need. `fixable`
 * marks blocks an optimization may rewrite, for the honest-maximum calculation.
 */
function formatScore(doc: ScoreDocument, fixable?: { summary: boolean; entryIds: Set<string> }): number {
  let score = 0
  if (doc.hasEmail) score += 10
  if (doc.hasPhone) score += 10
  if (wordCount(doc.summary) >= 15 || fixable?.summary) score += 15
  if (doc.skills.length > 0) score += 10
  if (doc.experience.length > 0) score += 10

  const roles = doc.experience
  if (roles.length > 0) {
    score += 15 * (roles.filter((r) => r.bullets.length >= 2).length / roles.length)
    const bullets = roles.flatMap((r) => r.bullets.map((b) => ({ b, fix: fixable?.entryIds.has(r.entryId) ?? false })))
    if (bullets.length > 0) {
      const okLen = bullets.filter(({ b, fix }) => fix || (wordCount(b) >= 6 && wordCount(b) <= 40)).length
      score += 20 * (okLen / bullets.length)
      const okVoice = bullets.filter(({ b, fix }) => fix || !FIRST_PERSON.test(b)).length
      score += 10 * (okVoice / bullets.length)
    }
  }
  return Math.min(100, score)
}

function combine(parts: MatchScore['parts']): number {
  const list: ScorePart[] = [parts.keywords, parts.summary, parts.title, parts.format]
  if (parts.qualifications) list.push(parts.qualifications)
  const den = list.reduce((s, p) => s + p.weight, 0)
  if (den === 0) return 0
  return Math.round(list.reduce((s, p) => s + p.score * p.weight, 0) / den)
}

export function scoreResume(doc: ScoreDocument, target: JobTargetProfile, qualifications: number | null): MatchScore {
  const p = prepareDoc(doc)
  const credits = keywordCredits(p, target)
  const parts: MatchScore['parts'] = {
    keywords: { score: Math.round(weightedPct(credits)), weight: credits.length > 0 ? WEIGHTS.keywords : 0 },
    summary: { score: Math.round(summaryScore(p, doc, target)), weight: WEIGHTS.summary },
    title: { score: Math.round(titleScore(doc, target)), weight: WEIGHTS.title },
    format: { score: Math.round(formatScore(doc)), weight: WEIGHTS.format },
    qualifications: qualifications === null ? null : { score: Math.round(qualifications), weight: WEIGHTS.qualifications },
  }
  return { scoring_version: SCORING_VERSION, total: combine(parts), parts, keywords: credits }
}

export interface Selection {
  summary: boolean
  experienceIds: readonly string[]
}

/**
 * The best score this profile can HONESTLY reach for this target, given which
 * blocks are selected. A keyword counts as placed only where the evidence map
 * says it may be written. Gaps never count, whatever the level.
 */
export function maxAchievableScore(
  doc: ScoreDocument,
  target: JobTargetProfile,
  evidence: readonly KeywordEvidence[],
  qualifications: number | null,
  selection: Selection,
): number {
  return maxAchievableBreakdown(doc, target, evidence, qualifications, selection).total
}

export function maxAchievableBreakdown(
  doc: ScoreDocument,
  target: JobTargetProfile,
  evidence: readonly KeywordEvidence[],
  qualifications: number | null,
  selection: Selection,
): MatchScore {
  const before = scoreResume(doc, target, qualifications)
  const selected = new Set<EvidenceLocation>([...(selection.summary ? ['summary'] : []), ...selection.experienceIds])
  const byTerm = new Map(evidence.map((e) => [e.term, e]))

  const credits = before.keywords.map((c) => {
    const ev = byTerm.get(c.term)
    const canPlace = ev?.placeable.some((loc) => selected.has(loc)) ?? false
    return canPlace ? { ...c, credit: 1 } : c
  })

  const p = prepareDoc(doc)
  const summaryPlaceable = new Set(
    evidence.filter((e) => selection.summary && e.placeable.includes('summary')).map((e) => e.term),
  )
  const summaryHasContent = selection.summary && (wordCount(doc.summary) > 0 || summaryPlaceable.size > 0 || doc.experience.length > 0)

  const parts: MatchScore['parts'] = {
    keywords: { score: weightedPct(credits), weight: credits.length > 0 ? WEIGHTS.keywords : 0 },
    summary: {
      score: summaryHasContent ? summaryScore(p, doc, target, summaryPlaceable) : before.parts.summary.score,
      weight: WEIGHTS.summary,
    },
    title: before.parts.title,
    format: {
      score: formatScore(doc, { summary: summaryHasContent, entryIds: new Set(selection.experienceIds) }),
      weight: WEIGHTS.format,
    },
    qualifications: before.parts.qualifications,
  }
  const total = Math.max(before.total, combine(parts))
  return { scoring_version: SCORING_VERSION, total, parts, keywords: credits }
}

/** How much of the honest gap each level is built to close. Enforced by the quality gate's coverage targets. */
export const LEVEL_GAP_FACTOR: Record<OptimizationLevel, number> = { easy: 0.5, moderate: 0.85, high: 1 }

export function projectedScore(before: number, max: number, level: OptimizationLevel): number {
  return Math.round(before + Math.max(0, max - before) * LEVEL_GAP_FACTOR[level])
}
