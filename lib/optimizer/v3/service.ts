/**
 * Optimizer v3 — the bridge between the engine (./engine.ts) and the product
 * (2026-10-02, founder-approved, tested in scripts/opt-lab — docs/18).
 *
 *   getAnalysisV3()  the analysis, cached per user + job + profile version in
 *                    job_analyses (input_hash 'v3:…'), so the setup screen's
 *                    check and the build share ONE analysis call
 *   checkReport()    what the setup screen shows before optimizing: field match,
 *                    expected score per level, certificates to ask about
 *   buildV3()        the CV, in the exact shapes the existing screens read
 *                    (OptimizedContent, skills_order, ResumeDocument, MatchReport)
 *
 * Added points: with the one-time agreement and a previous optimization
 * (`autoApply`) they go straight into the CV; otherwise they are pending
 * suggestions the review page shows in yellow. Certificates and licences are
 * never written — `ask_certifications` offers them to the user instead.
 */
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import type { CareerProfileFull, FieldVisibility } from '@/types/careerProfile'
import type { ExperienceBlock, OptimizationLevel, OptimizedContent } from '@/types/package'
import type { OptimizationTarget, SelectedBlocks } from '@/lib/ai/buildOptimizationPrompt'
import { analysisInputHash, baselineDocument, profileFingerprint, sha256 } from '../analyze'
import { getAnalysisByHash, saveAnalysis } from '../analysisStore'
import { scoreDocumentFromResume, scoreResume, type ScoreDocument } from '../score'
import { applySuggestionsToDocument, reachableTargetBand, type Suggestion } from '../suggestions'
import { containsTermRaw } from '../text'
import type { KeywordKind, MatchReport, MatchScore } from '../types'
import { addableAt, analyzeV3, targetFromAnalysis, writeV3, type AnalysisV3 } from './engine'

const FIXED = new Set(['education', 'experience_years', 'certification', 'licence'])
const ASKABLE = new Set(['certification', 'licence'])

// job_analyses.input_hash must be exactly 64 characters, so the v3 key is hashed again.
export const v3Hash = (title: string, industry: string | null, jd: string | null) => sha256('v3:' + analysisInputHash(title, industry, jd))
const modeOf = (jd: string | null) => (jd && jd.trim() ? 'job_description' : 'target_title_only') as 'job_description' | 'target_title_only'

export async function getAnalysisV3(opts: {
  userId: string
  profile: CareerProfileFull
  targetJobTitle: string
  targetIndustry: string | null
  jobDescription: string | null
  route: string
}): Promise<{ analysis: AnalysisV3; analysisId: string | null; cached: boolean }> {
  const hash = v3Hash(opts.targetJobTitle, opts.targetIndustry, opts.jobDescription)
  const fp = profileFingerprint(opts.profile)
  const stored = await getAnalysisByHash(opts.userId, hash)
  const cached = (stored?.targetProfile as unknown as { v3?: AnalysisV3 } | undefined)?.v3
  if (stored && cached && stored.profileFingerprint === fp) return { analysis: cached, analysisId: stored.id, cached: true }
  const analysis = await analyzeV3(opts.profile, opts.targetJobTitle, opts.jobDescription, opts.route)
  const target = targetFromAnalysis(analysis, opts.targetJobTitle, modeOf(opts.jobDescription))
  const analysisId = await saveAnalysis({
    userId: opts.userId,
    profileId: opts.profile.id,
    inputHash: hash,
    targetJobTitle: opts.targetJobTitle,
    targetProfile: { ...target, v3: analysis } as unknown as typeof target,
    bridges: [],
    profileFingerprint: fp,
  })
  return { analysis, analysisId, cached: false }
}

/** True when getAnalysisV3 would answer from the cache — no model call, no rate-limit slot. */
export async function isAnalysisCachedV3(userId: string, profile: CareerProfileFull, title: string, industry: string | null, jd: string | null): Promise<boolean> {
  const stored = await getAnalysisByHash(userId, v3Hash(title, industry, jd))
  return !!stored && stored.profileFingerprint === profileFingerprint(profile) && !!(stored.targetProfile as unknown as { v3?: unknown }).v3
}

/** The share of the job's fixed requirements (degree, years, certificates, licences) the profile meets. */
export function qualificationsOf(a: AnalysisV3): number | null {
  const fixed = a.requirements.filter((q) => FIXED.has(q.kind))
  if (!fixed.length) return null
  const w = (q: { importance: string }) => (q.importance === 'must' ? 3 : 1)
  return Math.round((100 * fixed.filter((q) => q.group === 'A').reduce((n, q) => n + w(q), 0)) / fixed.reduce((n, q) => n + w(q), 0))
}

/** The best score a level can honestly reach: every allowed keyword placed. */
function ceilingAt(base: ScoreDocument, a: AnalysisV3, level: OptimizationLevel, target: ReturnType<typeof targetFromAnalysis>, quals: number | null, extraCerts: string[] = []) {
  const allowed = [...a.requirements.filter((q) => q.group === 'A' && !FIXED.has(q.kind)), ...addableAt(a, level)].map((q) => q.term)
  const doc: ScoreDocument = {
    ...base,
    experience: [...base.experience, { entryId: 'ceiling', role: '', bullets: allowed }],
    certifications: [...base.certifications, ...extraCerts],
  }
  return scoreResume(doc, target, quals).total
}

export interface CheckReport {
  mode: 'job_description' | 'target_title_only'
  fieldMatch: AnalysisV3['fieldMatch']
  jobField: string
  candidateField: string
  before: number
  /** "Up to" per level — the honest ceiling. */
  expected: Record<OptimizationLevel, number>
  askCertifications: Array<{ term: string; importance: 'must' | 'nice'; gain: number }>
}

export function checkReport(profile: CareerProfileFull, a: AnalysisV3, title: string, jd: string | null, fv?: Partial<FieldVisibility> | null): CheckReport {
  const target = targetFromAnalysis(a, title, modeOf(jd))
  const quals = qualificationsOf(a)
  const base = scoreDocumentFromResume(baselineDocument(profile, title, fv))
  const before = scoreResume(base, target, quals).total
  const expected = {
    easy: Math.max(before, ceilingAt(base, a, 'easy', target, quals)),
    moderate: Math.max(before, ceilingAt(base, a, 'moderate', target, quals)),
    high: Math.max(before, ceilingAt(base, a, 'high', target, quals)),
  }
  // What a certificate the user really holds would add, at the default level.
  const askCertifications = a.requirements
    .filter((q) => q.group === 'C' && ASKABLE.has(q.kind))
    .map((q) => {
      const withCert = { ...a, requirements: a.requirements.map((r) => (r === q ? { ...r, group: 'A' as const } : r)) }
      const gain = ceilingAt(base, withCert, 'moderate', target, qualificationsOf(withCert), [q.term]) - expected.moderate
      return { term: q.term, importance: q.importance, gain: Math.max(0, gain) }
    })
    .sort((x, y) => y.gain - x.gain)
    .slice(0, 6)
  return { mode: modeOf(jd), fieldMatch: a.fieldMatch, jobField: a.jobField, candidateField: a.candidateField, before, expected, askCertifications }
}

export type BuildV3Result =
  | {
      ok: true
      optimizedContent: OptimizedContent
      skillsOrder: string[]
      documentSnapshot: ResumeDocument
      report: MatchReport
      stats: { ms: number; caught: number; keptOriginal: number; newPoints: number; autoApplied: boolean }
    }
  | { ok: false; status: number; error: string }

export async function buildV3(opts: {
  profile: CareerProfileFull
  target: OptimizationTarget
  level: OptimizationLevel
  selectedBlocks: SelectedBlocks
  jobDescription: string | null
  analysis: AnalysisV3
  analysisId: string | null
  autoApply: boolean
  route: string
}): Promise<BuildV3Result> {
  const { profile, target: tf, level, selectedBlocks, jobDescription: jd, analysis: a } = opts
  const title = tf.target_job_title
  let w
  try {
    w = await writeV3(profile, title, jd, a, level, opts.route)
  } catch (e) {
    console.error('optimizer v3: write failed', e instanceof Error ? e.message : String(e))
    return { ok: false, status: 503, error: 'Writing your CV did not finish this time. Your job is saved — please try again.' }
  }

  const addable = addableAt(a, level)
  const suggestions: Suggestion[] = []
  const blocks: ExperienceBlock[] = []
  const kept: NonNullable<MatchReport['kept_original']> = []
  const sorted = [...profile.work_experience].sort((x, y) => x.sort_order - y.sort_order)
  for (const e of sorted) {
    const job = w.jobs.find((j) => j.id === e.id)
    const selected = selectedBlocks.experienceIds.includes(e.id)
    const source = e.highlights ?? []
    if (!job || !selected) {
      blocks.push({ profile_experience_id: e.id, was_optimized: false, generated_bullets: null, source_bullets: source, claims: [] })
      continue
    }
    const newPts = job.bullets.filter((b) => b.isNew)
    newPts.forEach((b, i) => {
      suggestions.push({
        id: `${e.id}:v3:${i}`,
        block: e.id,
        requirement: addable.find((r) => containsTermRaw(b.text, r.term))?.term ?? '',
        text: b.text,
        status: opts.autoApply ? 'confirmed' : 'pending',
      })
    })
    if (job.keptOriginal) kept.push({ block: e.id, reason: 'grounding' })
    const rewritten = job.keptOriginal ? source : job.bullets.filter((b) => !b.isNew).map((b) => b.text)
    const generated = opts.autoApply ? (job.keptOriginal ? [...source, ...newPts.map((b) => b.text)] : job.bullets.map((b) => b.text)) : rewritten
    blocks.push({
      profile_experience_id: e.id,
      was_optimized: !job.keptOriginal || (opts.autoApply && newPts.length > 0),
      generated_bullets: job.keptOriginal && !(opts.autoApply && newPts.length) ? null : generated,
      source_bullets: source,
      claims: [],
    })
  }
  const summaryOn = selectedBlocks.summary && !w.summaryKeptOriginal
  if (selectedBlocks.summary && w.summaryKeptOriginal) kept.push({ block: 'summary', reason: 'grounding' })

  // Skills: reorder only, by id.
  const idsByName = new Map(profile.skills.map((s) => [s.name, s.id]))
  const skillsOrder = w.skillsOrder.map((n) => idsByName.get(n)).filter((x): x is string => !!x)
  const original = [...profile.skills].sort((x, y) => x.sort_order - y.sort_order).map((s) => s.id)

  const optimizedContent: OptimizedContent = {
    summary: { generated: summaryOn ? w.summary : '', source_profile_summary: profile.professional_summary ?? '' },
    experience_blocks: blocks,
    ...(kept.length ? { fallback_used: { summary: kept.some((k) => k.block === 'summary'), experience_ids: kept.filter((k) => k.block !== 'summary').map((k) => k.block) } } : {}),
    skills_reordered: skillsOrder.length === original.length && skillsOrder.some((id, i) => id !== original[i]),
  }
  const finalOrder = skillsOrder.length === original.length ? skillsOrder : original
  const documentSnapshot = buildResumeDocument({ profile, optimizedContent, skillsOrder: finalOrder, fieldVisibility: profile.field_visibility, targetJobTitle: title })

  // ---- the report the result screens read
  const target = targetFromAnalysis(a, title, modeOf(jd))
  const quals = qualificationsOf(a)
  const check = checkReport(profile, a, title, jd, profile.field_visibility)
  const score = (d: ResumeDocument): MatchScore => scoreResume(scoreDocumentFromResume(d), target, quals)
  const before = score(baselineDocument(profile, title, profile.field_visibility))
  const after = score(documentSnapshot)
  const pending = suggestions.filter((s) => s.status === 'pending')
  const kindOf = (k: string): KeywordKind => (({ licence: 'certification', equipment: 'skill', standard: 'tool', experience_years: 'domain' }) as Record<string, KeywordKind>)[k] ?? (k as KeywordKind)
  const report: MatchReport = {
    report_version: 1,
    engine: 'v3',
    mode: modeOf(jd),
    analysis_id: opts.analysisId,
    target,
    bridges: [],
    profile_fingerprint: profileFingerprint(profile),
    qualifications: quals,
    before,
    max_total: check.expected.high,
    level,
    after,
    why_fits: a.requirements.filter((q) => q.group === 'A').map((q) => ({ term: q.term, where: q.location ? [q.location] : [] })),
    gaps: a.requirements.filter((q) => q.group === 'C').map((q) => ({ term: q.term, importance: q.importance, kind: kindOf(q.kind) })),
    kept_original: kept,
    generated_at: new Date().toISOString(),
    suggestions,
    projected_with_suggestions: pending.length ? score(applySuggestionsToDocument(documentSnapshot, pending)).total : after.total,
    // The level's band only when this profile can reach it — never "target 75–85" beside a best of 57.
    target_band: reachableTargetBand(level, check.expected[level]),
    field_match: { match: a.fieldMatch, job_field: a.jobField, candidate_field: a.candidateField },
    ask_certifications: check.askCertifications,
    added_terms: [
      ...new Set([
        ...(summaryOn ? w.summaryAdded : []),
        ...w.jobs.filter((j) => !j.keptOriginal && selectedBlocks.experienceIds.includes(j.id)).flatMap((j) => j.bullets.flatMap((b) => (b.isNew ? [] : b.added ?? []))),
      ]),
    ],
  }
  return {
    ok: true,
    optimizedContent,
    skillsOrder: finalOrder,
    documentSnapshot,
    report,
    stats: { ms: w.ms, caught: w.caught.length, keptOriginal: kept.length, newPoints: suggestions.length, autoApplied: opts.autoApply },
  }
}
