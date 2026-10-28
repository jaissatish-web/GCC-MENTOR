/** Job-specific application score. Pure, client/server identical; historical targets retain match-v1. */
import type { ScoreDocument } from './score'
import type { JobTargetProfile, KeywordCredit, MatchScore, QualityCheck, ScoreV2Bucket, ScoreV2Part, ScreeningRequirement, TargetKeyword } from './types'
import { containsTerm, containsTermInSentence, prepare, wordCount } from './text'
import { positiveStatements } from './v3/claimChecks'

export const SCORE_V2_VERSION = 'match-v2'
export const SCORE_V2_WEIGHTS = { quality: 25, presentation: 10, screening: 10, skills: 30, responsibilities: 20, supporting: 5 } as const

/** Bound checks invalidate on any text, section, ordering or contact change. Not an authentication token. */
export function scoreDocumentSignature(doc: ScoreDocument): string {
  const raw = JSON.stringify([doc.headline, doc.summary, doc.experience, doc.skills, doc.certifications, doc.education, doc.additional, doc.hasEmail, doc.hasPhone])
  let a = 2166136261, b = 2246822507
  for (let i = 0; i < raw.length; i++) {
    a = Math.imul(a ^ raw.charCodeAt(i), 16777619)
    b = Math.imul(b ^ raw.charCodeAt(i), 3266489909)
  }
  return `v2:${raw.length}:${(a >>> 0).toString(16)}${(b >>> 0).toString(16)}`
}

const weight = (k: { importance: string }) => k.importance === 'must' ? 3 : 1
const fixed = (k: TargetKeyword) => k.kind === 'education' || k.kind === 'certification'
const bucket = (k: TargetKeyword): 'skills' | 'responsibilities' | 'supporting' => k.kind === 'skill' || k.kind === 'tool' ? 'skills' : k.kind === 'responsibility' ? 'responsibilities' : 'supporting'
const identity = (s: string) => prepare(s).joined.trim()
const precedence = (k: TargetKeyword) => fixed(k) ? 4 : bucket(k) === 'skills' ? 3 : bucket(k) === 'responsibilities' ? 2 : 1

/** Equivalent terms belong to one primary bucket, even if analysis duplicated them across kinds. */
export function uniqueScoredRequirements(keywords: readonly TargetKeyword[]): TargetKeyword[] {
  const rows: TargetKeyword[] = []
  for (const k of keywords) {
    if (!k.term?.trim()) continue
    const aliases = Array.isArray(k.aliases) ? k.aliases : []
    const names = new Set([k.term, ...aliases].map(identity).filter(Boolean))
    const hits = rows.filter(r => [r.term, ...r.aliases].some(n => names.has(identity(n))))
    if (!hits.length) { rows.push({ ...k, aliases: [...aliases] }); continue }
    const all = [...hits, k]
    const primary = [...all].sort((a, b) => precedence(b) - precedence(a))[0]
    const merged: TargetKeyword = { ...primary, importance: all.some(r => r.importance === 'must') ? 'must' : 'nice', aliases: [...new Set(all.flatMap(r => [r.term, ...(r.aliases ?? [])]))].filter(n => identity(n) !== identity(primary.term)) }
    for (const hit of hits) rows.splice(rows.indexOf(hit), 1)
    rows.push(merged)
  }
  return rows
}

function creditFor(doc: ScoreDocument, k: TargetKeyword): KeywordCredit {
  const where: string[] = []
  const exact = (text: string) => containsTerm(prepare(positiveStatements(text)), k.term, k.aliases)
  const loose = (text: string) => containsTermInSentence(positiveStatements(text), k.term, k.aliases)
  let roleCredit = 0
  for (const role of doc.experience) {
    const credit = role.bullets.some(exact) ? 1 : role.bullets.some(loose) ? 0.8 : 0
    if (credit) where.push(role.entryId)
    roleCredit = Math.max(roleCredit, credit)
  }
  const summaryCredit = exact(doc.summary) ? 1 : loose(doc.summary) ? 0.8 : 0
  if (summaryCredit) where.push('summary')
  const listed = [...doc.skills, ...doc.additional].some(t => exact(t) || loose(t))
  if (listed) where.push('skills')
  // Responsibilities earn full credit only from described work, not a list or summary claim.
  const credit = k.kind === 'responsibility'
    ? Math.max(roleCredit, summaryCredit ? 0.5 : 0, listed ? 0.25 : 0)
    : Math.max(roleCredit, summaryCredit, listed ? 1 : 0)
  return { term: k.term, importance: k.importance, kind: k.kind, credit, where }
}

function part(max: number, score: number, applicable = true): ScoreV2Part {
  const bounded = Math.max(0, Math.min(100, score))
  return { max, weight: applicable ? max : 0, score: rounded(bounded), points: applicable ? rounded(max * bounded / 100) : 0, applicable }
}
const rounded = (n: number) => Math.round(n * 100) / 100
function coveragePart(max: number, credits: KeywordCredit[]): ScoreV2Part {
  const den = credits.reduce((n, c) => n + weight(c), 0)
  const p = part(max, den ? 100 * credits.reduce((n, c) => n + weight(c) * c.credit, 0) / den : 0, den > 0)
  return { ...p, matched: credits.filter(c => c.credit >= 0.8).length, total: credits.length, requiredMatched: credits.filter(c => c.importance === 'must' && c.credit >= 0.8).length, requiredTotal: credits.filter(c => c.importance === 'must').length }
}

function quality(doc: ScoreDocument, target: JobTargetProfile): { points: number; checks: QualityCheck[] } {
  const review = target.quality_reviews?.[scoreDocumentSignature(doc)]
  const bullets = doc.experience.flatMap(e => e.bullets).filter(b => b.trim())
  const content = [doc.summary, ...bullets, ...doc.skills].join(' ')
  const readable = !!content.trim() && !/[\uFFFD\u0000]/.test(content)
  const sections = [doc.hasEmail && doc.hasPhone, wordCount(doc.summary) >= 15, doc.skills.length > 0, doc.experience.some(e => e.bullets.some(b => b.trim())), doc.education.length > 0]
  const goodLength = bullets.filter(b => wordCount(b) >= 6 && wordCount(b) <= 40).length
  const unique = new Set(bullets.map(b => identity(b))).size
  const noFirstPerson = bullets.filter(b => !/\b(I|my|me|mine|myself)\b/.test(b)).length
  const consistency = bullets.length ? 5 * ((goodLength / bullets.length) + (unique / bullets.length) + (noFirstPerson / bullets.length)) / 3 : 0
  const checks: QualityCheck[] = [
    { id: 'readable_text', label: 'Structured text readability', status: readable ? 'passed' : 'issues', points: readable ? 4 : 0, max: 4 },
    { id: 'export_readability', label: 'Word export readability (PDF not checked)', status: review?.exportReadability === 'passed' ? 'passed' : review?.exportReadability === 'failed' ? 'issues' : 'pending', points: review?.exportReadability === 'passed' ? 4 : 0, max: 4 },
    { id: 'grammar', label: 'Grammar and spelling review', details: (review?.grammarIssues ?? []).map(issue => `${issue.excerpt} — ${issue.reason}`), status: review?.grammar === 'passed' ? 'passed' : review?.grammar === 'issues' ? 'issues' : 'pending', points: review?.grammar === 'passed' ? 7 : 0, max: 7 },
    { id: 'structure', label: 'Resume structure and contact details', status: sections.every(Boolean) ? 'passed' : 'issues', points: sections.filter(Boolean).length, max: 5 },
    { id: 'consistency', label: 'Bullet readability and consistency', status: consistency >= 4.99 ? 'passed' : 'issues', points: rounded(consistency), max: 5 },
  ]
  return { points: checks.reduce((n, c) => n + c.points, 0), checks }
}

/** Presentation rewards actual role evidence and organisation; a copied target headline earns nothing. */
function presentation(doc: ScoreDocument, target: JobTargetProfile): number {
  const titleWords = new Set(prepare(target.job_title).stems.filter(s => s.length > 2))
  let roleFit = 0
  for (const r of doc.experience) {
    const words = new Set(prepare(positiveStatements(r.role)).stems)
    roleFit = Math.max(roleFit, titleWords.size ? [...titleWords].filter(w => words.has(w)).length / titleWords.size : 0)
  }
  const summaryText = positiveStatements(doc.summary)
  const summaryLength = wordCount(summaryText)
  const summaryReadable = summaryLength >= 25 && summaryLength <= 120
  const summaryHasRealRole = doc.experience.some(r => prepare(positiveStatements(r.role)).stems.filter(w => w.length > 2).some(w => prepare(summaryText).stems.includes(w)))
  // Arrangement is a clear action-led opening, not another award for a JD keyword.
  const action = /^(?:led|lead|managed?|supervised?|performed?|conducted?|supported?|prepared?|coordinated?|maintained?|developed?|implemented?|designed?|delivered?|commissioned?|tested?|reviewed?|operated?|built|created?|handled?|monitored?|assisted?|installed?|inspected?|resolved?|improved?|achieved?)\b/i
  const ordered = doc.experience.some(r => r.bullets.length > 0 && action.test(positiveStatements(r.bullets[0]).trim()) && wordCount(positiveStatements(r.bullets[0])) >= 6)
  return 4 * roleFit + (summaryReadable ? 2 : 0) + (summaryHasRealRole ? 2 : 0) + (ordered ? 2 : 0)
}

function screening(doc: ScoreDocument, target: JobTargetProfile, keywords: TargetKeyword[]): ScreeningRequirement[] {
  const input = target.screening_requirements ?? keywords.filter(fixed).map(k => ({ term: k.term, importance: k.importance, kind: k.kind, status: 'unknown' as const }))
  const rows = new Map<string, ScreeningRequirement>()
  for (const r of input) {
    if (!r.term?.trim()) continue
    const key = identity(r.term)
    const prior = rows.get(key)
    if (prior) {
      rows.set(key, { ...prior, importance: prior.importance === 'must' || r.importance === 'must' ? 'must' : 'nice', status: prior.status === r.status ? r.status : 'unknown' })
      continue
    }
    let status = r.status
    if (r.kind === 'education' || r.kind === 'certification' || r.kind === 'licence') {
      const lines = r.kind === 'education' ? doc.education : doc.certifications
      const k = keywords.find(k => identity(k.term) === key)
      const bare = r.kind === 'education' ? r.term : r.term.replace(/\b(certifications?|certificates?|certified|credentials?|licen[cs]es?)\b/gi, ' ').replace(/\s+/g, ' ').trim()
      const shown = lines.some(line => containsTermInSentence(positiveStatements(line), r.term, k?.aliases ?? []) || (bare.length >= 2 && containsTermInSentence(positiveStatements(line), bare, k?.aliases ?? [])))
      if (status === 'met' && !shown) status = 'unknown'
      else if (status === 'unknown' && shown) status = 'met'
    }
    rows.set(key, { ...r, status })
  }
  return [...rows.values()]
}

export function scoreResumeV2(doc: ScoreDocument, target: JobTargetProfile): MatchScore {
  const unique = uniqueScoredRequirements(target.keywords)
  const requirements = unique.filter(k => !fixed(k))
  const credits = requirements.map(k => creditFor(doc, k))
  const q = quality(doc, target)
  const screen = screening(doc, target, unique)
  const screenDen = screen.reduce((n, r) => n + weight(r), 0)
  const breakdown: Record<ScoreV2Bucket, ScoreV2Part> = {
    quality: part(25, q.points / 25 * 100),
    presentation: part(10, presentation(doc, target) * 10),
    screening: part(10, screenDen ? 100 * screen.filter(r => r.status === 'met').reduce((n, r) => n + weight(r), 0) / screenDen : 0, screenDen > 0),
    skills: coveragePart(30, credits.filter(c => c.kind === 'skill' || c.kind === 'tool')),
    responsibilities: coveragePart(20, credits.filter(c => c.kind === 'responsibility')),
    supporting: coveragePart(5, credits.filter(c => c.kind === 'domain' || c.kind === 'soft_skill')),
  }
  const applicableMaximum = Object.values(breakdown).reduce((n, p) => n + p.weight, 0)
  const rawPoints = Object.values(breakdown).reduce((n, p) => n + p.points, 0)
  const total = Math.round(applicableMaximum ? 100 * rawPoints / applicableMaximum : 0)
  const keywordPoints = breakdown.skills.points + breakdown.responsibilities.points + breakdown.supporting.points
  const keywordMax = breakdown.skills.weight + breakdown.responsibilities.weight + breakdown.supporting.weight
  return {
    scoring_version: SCORE_V2_VERSION, total,
    // Compatibility shape: v2-aware consumers render the detailed breakdown instead.
    parts: { keywords: { score: keywordMax ? keywordPoints / keywordMax * 100 : 0, weight: keywordMax }, summary: breakdown.presentation, title: { score: 0, weight: 0 }, format: breakdown.quality, qualifications: breakdown.screening.applicable ? breakdown.screening : null },
    keywords: credits,
    v2: { breakdown, screening: screen, quality_checks: q.checks, quality_signature: scoreDocumentSignature(doc), applicableMaximum, rawPoints: rounded(rawPoints), mandatoryGaps: screen.filter(r => r.importance === 'must' && r.status === 'unmet').length, mandatoryUnknown: screen.filter(r => r.importance === 'must' && r.status === 'unknown').length },
  }
}
