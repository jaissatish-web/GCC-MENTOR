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
import { buildResumeDocument, drivingLicenceLine, type ResumeDocument } from '@/lib/resumeDocument'
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
import { experienceRequirementMet } from '../experienceMet'

const FIXED = new Set(['education', 'experience_years', 'certification', 'licence'])
const ASKABLE = new Set(['certification', 'licence'])
/** Kinds High's tick-list asks about: things a candidate holds but often never wrote (2026-10-02). */
const ASK_SKILL = new Set(['tool', 'standard', 'skill', 'equipment'])

// job_analyses.input_hash must be exactly 64 characters, so the v3 key is hashed again.
export const v3Hash = (title: string, industry: string | null, jd: string | null) => sha256('v3:' + analysisInputHash(title, industry, jd))
const modeOf = (jd: string | null) => (jd && jd.trim() ? 'job_description' : 'target_title_only') as 'job_description' | 'target_title_only'

/** The profile's version without its certificates: a certificate added on the level screen keeps the analysis. */
// Certificates AND skills are left out: both can be confirmed on the level
// screen ("Yes, I have it" / High's tick-list), and both are applied in code.
const workKey = (p: CareerProfileFull) => profileFingerprint({ ...p, certifications: [], skills: [] })

const CERT_WORDS = /\b(certifications?|certificates?|certified|credentials?|licen[cs]es?|card)\b/gi

/** True when a certificate line on the profile names this requirement ("PMP certification" ← "PMP — PMI"). */
export function profileHolds(profile: CareerProfileFull, term: string): boolean {
  const lines = (profile.certifications ?? []).map((c) => [c.name, c.issuer ?? ''].join(' '))
  const licence = drivingLicenceLine(profile)
  if (licence) lines.push(licence)
  const bare = term.replace(CERT_WORDS, ' ').replace(/\s+/g, ' ').trim()
  return lines.some((l) => containsTermRaw(l, term) || (bare.length >= 2 && containsTermRaw(l, bare)))
}

/**
 * Certificates changed, nothing else: no model call. A certificate or licence
 * the job asks for that the profile now holds moves from "not shown" (C) to
 * "shown" (A) — the same literal check the analysis itself applies.
 */
export function regroupCertifications(a: AnalysisV3, profile: CareerProfileFull): AnalysisV3 {
  const base = withoutCertificateStep(a)
  return {
    ...base,
    requirements: base.requirements.map((r) => {
      // Experience is re-judged on every read from the profile's own roles, so
      // analyses stored before 2026-10-03 ("ICU experience" missing for an ICU
      // nurse) are corrected too (lib/optimizer/experienceMet.ts).
      if (r.kind === 'experience_years') {
        const group = experienceRequirementMet(profile, r.term).ok ? ('A' as const) : ('C' as const)
        return group === r.group ? r : { ...r, group, location: 'summary' }
      }
      return r.group === 'C' && ((ASKABLE.has(r.kind) && profileHolds(profile, r.term)) || (ASK_SKILL.has(r.kind) && profileListsSkill(profile, r.term)))
        ? { ...r, group: 'A' as const, location: null, regrouped: HELD }
        : r
    }),
  }
}

/** True when the profile's Skills list names this requirement (a tool, standard or skill the user confirmed). */
export function profileListsSkill(profile: CareerProfileFull, term: string): boolean {
  return (profile.skills ?? []).some((s) => containsTermRaw(s.name, term))
}

const HELD = 'certificate on the profile'
/** The analysis as the model and its checks left it — what is stored, so a certificate the user later removes stops counting. */
function withoutCertificateStep(a: AnalysisV3): AnalysisV3 {
  return {
    ...a,
    requirements: a.requirements.map((r) => (r.regrouped === HELD || r.regrouped === 'certificate added by the user' ? { ...r, group: 'C' as const, regrouped: undefined } : r)),
  }
}

async function readCached(userId: string, profile: CareerProfileFull, hash: string): Promise<{ analysis: AnalysisV3; id: string; exact: boolean } | null> {
  const stored = await getAnalysisByHash(userId, hash)
  const tp = stored?.targetProfile as unknown as { v3?: AnalysisV3; v3WorkKey?: string } | undefined
  if (!stored || !tp?.v3) return null
  if (stored.profileFingerprint === profileFingerprint(profile)) return { analysis: tp.v3, id: stored.id, exact: true }
  if (tp.v3WorkKey && tp.v3WorkKey === workKey(profile)) return { analysis: tp.v3, id: stored.id, exact: false }
  return null
}

async function storeAnalysis(opts: { userId: string; profile: CareerProfileFull; hash: string; title: string; jd: string | null; analysis: AnalysisV3 }): Promise<string | null> {
  const target = targetFromAnalysis(opts.analysis, opts.title, modeOf(opts.jd))
  return saveAnalysis({
    userId: opts.userId,
    profileId: opts.profile.id,
    inputHash: opts.hash,
    targetJobTitle: opts.title,
    targetProfile: { ...target, v3: withoutCertificateStep(opts.analysis), v3WorkKey: workKey(opts.profile) } as unknown as typeof target,
    bridges: [],
    profileFingerprint: profileFingerprint(opts.profile),
  })
}

export async function getAnalysisV3(opts: {
  userId: string
  profile: CareerProfileFull
  targetJobTitle: string
  targetIndustry: string | null
  jobDescription: string | null
  route: string
}): Promise<{ analysis: AnalysisV3; analysisId: string | null; cached: boolean }> {
  const hash = v3Hash(opts.targetJobTitle, opts.targetIndustry, opts.jobDescription)
  const hit = await readCached(opts.userId, opts.profile, hash)
  // The certificate step is code only, so it runs on every answer: a licence
  // from the paperwork questions, or a certificate in other words, counts too.
  if (hit?.exact) return { analysis: regroupCertifications(hit.analysis, opts.profile), analysisId: hit.id, cached: true }
  if (hit) {
    const analysisId = await storeAnalysis({ userId: opts.userId, profile: opts.profile, hash, title: opts.targetJobTitle, jd: opts.jobDescription, analysis: hit.analysis })
    return { analysis: regroupCertifications(hit.analysis, opts.profile), analysisId: analysisId ?? hit.id, cached: true }
  }
  const raw = await analyzeV3(opts.profile, opts.targetJobTitle, opts.jobDescription, opts.route)
  const analysisId = await storeAnalysis({ userId: opts.userId, profile: opts.profile, hash, title: opts.targetJobTitle, jd: opts.jobDescription, analysis: raw })
  return { analysis: regroupCertifications(raw, opts.profile), analysisId, cached: false }
}

/** True when getAnalysisV3 would answer without a model call — no rate-limit slot needed. */
export async function isAnalysisCachedV3(userId: string, profile: CareerProfileFull, title: string, industry: string | null, jd: string | null): Promise<boolean> {
  return !!(await readCached(userId, profile, v3Hash(title, industry, jd)))
}

/** The share of the job's fixed requirements (degree, years, certificates, licences) the profile meets. */
export function qualificationsOf(a: AnalysisV3): number | null {
  const fixed = a.requirements.filter((q) => FIXED.has(q.kind))
  if (!fixed.length) return null
  const w = (q: { importance: string }) => (q.importance === 'must' ? 3 : 1)
  return Math.round((100 * fixed.filter((q) => q.group === 'A').reduce((n, q) => n + w(q), 0)) / fixed.reduce((n, q) => n + w(q), 0))
}

/** The best score a level can honestly reach: every allowed keyword placed. */
function ceilingAt(base: ScoreDocument, a: AnalysisV3, level: OptimizationLevel, target: ReturnType<typeof targetFromAnalysis>, quals: number | null, extraCerts: string[] = [], extraSkills: string[] = []) {
  const allowed = [...a.requirements.filter((q) => q.group === 'A' && !FIXED.has(q.kind)), ...addableAt(a, level)].map((q) => q.term)
  const doc: ScoreDocument = {
    ...base,
    experience: [...base.experience, { entryId: 'ceiling', role: '', bullets: allowed }],
    certifications: [...base.certifications, ...extraCerts],
    skills: [...base.skills, ...extraSkills],
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
  /** High's tick-list: tools, standards, skills, equipment the job lists that the profile does not show. */
  askSkills: Array<{ term: string; importance: 'must' | 'nice'; gain: number }>
  /** High's best score if the user really has every skill and certificate the job asks for. */
  highIfConfirmed: number
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
  // High's tick-list (founder, 2026-10-02): what each one would add at High
  // if the user really has it, and the best High can reach with all of them.
  const promote = (qs: typeof a.requirements) => ({ ...a, requirements: a.requirements.map((r) => (qs.includes(r) ? { ...r, group: 'A' as const } : r)) })
  const skillQs = a.requirements.filter((q) => q.group === 'C' && ASK_SKILL.has(q.kind))
  const askSkills = skillQs
    .map((q) => {
      const withIt = promote([q])
      return { term: q.term, importance: q.importance, gain: Math.max(0, ceilingAt(base, withIt, 'high', target, qualificationsOf(withIt), [], [q.term]) - expected.high) }
    })
    .sort((x, y) => (x.importance === y.importance ? y.gain - x.gain : x.importance === 'must' ? -1 : 1))
    .slice(0, 15)
  const certQs = a.requirements.filter((q) => q.group === 'C' && ASKABLE.has(q.kind))
  const all = promote([...skillQs, ...certQs])
  const highIfConfirmed = Math.max(expected.high, ceilingAt(base, all, 'high', target, qualificationsOf(all), certQs.map((q) => q.term), skillQs.map((q) => q.term)))
  return { mode: modeOf(jd), fieldMatch: a.fieldMatch, jobField: a.jobField, candidateField: a.candidateField, before, expected, askCertifications, askSkills, highIfConfirmed }
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
  /** No advert was pasted: jobDescription is the typical Gulf advert for the title. */
  typicalAdvert?: boolean
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
    ...(opts.autoApply && suggestions.length ? { auto_applied: true } : {}),
    ...(opts.typicalAdvert && jd ? { advert_source: 'typical' as const, typical_advert: jd } : {}),
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
