/**
 * Job analysis orchestration (2026-09-17). SERVER ONLY: makes model calls.
 *
 *   analyzeTarget()   advert or title -> JobTargetProfile
 *   bridgeEvidence()  target x profile -> verified same-meaning evidence
 *   buildAnalysisReport()  the "before" half of the match report
 *
 * Every model call is injected (`GenerateFn`) so the offline suite runs the
 * whole engine with fakes.
 */

import { createHash } from 'node:crypto'
import type { CareerProfileFull, FieldVisibility } from '@/types/careerProfile'
import type { OptimizedContent } from '@/types/package'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
import { computeDeterministicCategories } from '@/lib/jobMatch/requirementMapping'
import { buildJobMatchProfileInputFromFullProfile } from '@/lib/jobMatch/profileAdapters'
import { buildEvidenceMap, profileEvidenceKey, verifyBridges } from './evidence'
import {
  buildProfileEvidenceText,
  EVIDENCE_ADDENDUM,
  BRIDGE_SYSTEM_PROMPT,
  buildBridgeUserPrompt,
  buildJdAnalysisUserPrompt,
  buildTitleAnalysisUserPrompt,
  JD_ANALYSIS_SYSTEM_PROMPT,
  keywordsNeedingBridge,
  TITLE_ANALYSIS_SYSTEM_PROMPT,
  validateTargetProfile,
} from './jobAnalysis'
import { maxAchievableScore, scoreDocumentFromResume, scoreResume } from './score'
import type { JobTargetProfile, MatchReport, OptimizationMode, VerifiedBridge } from './types'

export interface GenerateCall {
  system: string
  user: string
  maxTokens: number
  temperature: number
  userId?: string
  route: string
  configKey?: string
  giveUpAt?: number
  stallTimeoutMs?: number
}

export type GenerateFn = (call: GenerateCall) => Promise<{ text: string; truncated: boolean }>

export function resolveMode(jobDescription: string | null | undefined): OptimizationMode {
  return jobDescription && jobDescription.trim() !== '' ? 'job_description' : 'target_title_only'
}

export function sha256(s: string): string {
  return createHash('sha256').update(s).digest('hex')
}

/** Cache key for one analysis: same mode, title, industry and advert = same requirements. */
export function analysisInputHash(targetJobTitle: string, targetIndustry: string | null, jobDescription: string | null): string {
  const mode = resolveMode(jobDescription)
  return sha256(
    [
      'analysis-v3',
      mode,
      targetJobTitle.trim().toLowerCase(),
      mode === 'target_title_only' ? (targetIndustry ?? '').trim().toLowerCase() : '',
      (jobDescription ?? '').trim(),
    ].join('\n'),
  )
}

export function profileFingerprint(profile: CareerProfileFull): string {
  return sha256(profileEvidenceKey(profile))
}

/**
 * Requirements AND evidence in ONE model call. Returns null when the answer
 * carries no usable requirements (the caller then builds without a plan).
 */
export async function analyzeTargetWithEvidence(opts: {
  generateFn: GenerateFn
  userId: string
  route: string
  targetJobTitle: string
  targetIndustry: string | null
  jobDescription: string | null
  profile: CareerProfileFull
  giveUpAt?: number
  /** Skip the combined call and ask for requirements only (a short time budget). */
  requirementsOnly?: boolean
}): Promise<{ target: JobTargetProfile; bridges: VerifiedBridge[] } | null> {
  let bridgesRaw: unknown = null
  const target = await analyzeTarget({
    ...opts,
    evidenceFor: opts.profile,
    onParsed: (parsed) => {
      bridgesRaw = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>).bridges : null
    },
  })
  if (!target) return null
  return { target, bridges: verifyBridges(opts.profile, target, bridgesRaw) }
}

export async function analyzeTarget(opts: {
  generateFn: GenerateFn
  userId: string
  route: string
  targetJobTitle: string
  targetIndustry: string | null
  jobDescription: string | null
  giveUpAt?: number
  /** When given, the same call also returns evidence bridges for this profile. */
  evidenceFor?: CareerProfileFull
  requirementsOnly?: boolean
  onParsed?: (parsed: unknown) => void
}): Promise<JobTargetProfile | null> {
  const mode = resolveMode(opts.jobDescription)
  const callFor = (withEvidence: boolean): GenerateCall => {
    const addendum = withEvidence ? EVIDENCE_ADDENDUM : ''
    const evidenceText = withEvidence && opts.evidenceFor ? buildProfileEvidenceText(opts.evidenceFor) : ''
    // Budgets sized for reasoning models (2026-09-17, live I&C profile): the
    // thinking counts against max_tokens, and 10k cut the combined answer off
    // after 125s. Stall limits sit inside the caller's give-up point.
    return mode === 'job_description'
      ? {
          system: JD_ANALYSIS_SYSTEM_PROMPT + addendum,
          user: buildJdAnalysisUserPrompt(opts.jobDescription ?? '', opts.targetJobTitle) + evidenceText,
          maxTokens: withEvidence ? 16_000 : 12_000,
          temperature: 0.1,
          configKey: 'job_description',
          route: opts.route,
          userId: opts.userId,
          giveUpAt: opts.giveUpAt,
          stallTimeoutMs: withEvidence ? 150_000 : 120_000,
        }
      : {
          system: TITLE_ANALYSIS_SYSTEM_PROMPT + addendum,
          user: buildTitleAnalysisUserPrompt(opts.targetJobTitle, opts.targetIndustry) + evidenceText,
          maxTokens: withEvidence ? 14_000 : 10_000,
          temperature: 0.1,
          configKey: 'optimization_analysis',
          route: opts.route,
          userId: opts.userId,
          giveUpAt: opts.giveUpAt,
          stallTimeoutMs: withEvidence ? 150_000 : 120_000,
        }
  }

  // Attempt 1: requirements + evidence together (when a profile is given).
  // Attempt 2: requirements only — a much smaller answer (about 50s instead of
  // 90–125s on a nine-role profile). Evidence then comes from code matching
  // alone, which is stricter, never looser. Before 2026-09-17 the second attempt
  // repeated the heavy call and a 90s budget meant neither could finish, so the
  // CV shipped with no requirements and no ATS score.
  const attempts = opts.evidenceFor && !opts.requirementsOnly ? [true, false] : [false, false]
  for (let attempt = 0; attempt < attempts.length; attempt++) {
    const withEvidence = attempts[attempt]
    if (opts.giveUpAt && Date.now() > opts.giveUpAt - (withEvidence ? 60_000 : 40_000)) {
      if (withEvidence) continue
      break
    }
    try {
      const res = await opts.generateFn(callFor(withEvidence))
      if (res.truncated) {
        console.error('optimizer: target analysis truncated attempt=' + attempt + ' evidence=' + withEvidence)
        continue
      }
      const raw = extractJsonObject(res.text)
      const parsed = validateTargetProfile(raw, mode, opts.targetJobTitle)
      if (parsed) {
        if (withEvidence) opts.onParsed?.(raw)
        return parsed
      }
      console.error('optimizer: target analysis unparseable attempt=' + attempt + ' evidence=' + withEvidence)
    } catch (e) {
      console.error('optimizer: target analysis failed attempt=' + attempt, e instanceof Error ? e.message : String(e))
    }
  }
  return null
}

export async function bridgeEvidence(opts: {
  generateFn: GenerateFn
  profile: CareerProfileFull
  target: JobTargetProfile
  userId: string
  route: string
  giveUpAt?: number
}): Promise<VerifiedBridge[]> {
  const needed = keywordsNeedingBridge(opts.profile, opts.target)
  if (needed.length === 0 || (opts.profile.work_experience ?? []).length + (opts.profile.skills ?? []).length === 0) return []
  try {
    const res = await opts.generateFn({
      system: BRIDGE_SYSTEM_PROMPT,
      user: buildBridgeUserPrompt(opts.profile, needed),
      maxTokens: 6144,
      temperature: 0,
      configKey: 'optimization_analysis',
      route: opts.route,
      userId: opts.userId,
      giveUpAt: opts.giveUpAt,
    })
    if (res.truncated) return []
    const parsed = extractJsonObject(res.text)
    const raw = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>).bridges : null
    return verifyBridges(opts.profile, opts.target, raw)
  } catch (e) {
    // Non-fatal: without bridges only literal evidence is used, which is
    // stricter, never looser.
    console.error('optimizer: evidence bridge failed (non-fatal)', e instanceof Error ? e.message : String(e))
    return []
  }
}

/**
 * Deterministic qualification fit — years, education, certifications, GCC
 * experience, driving licence — from the existing Job Match categories.
 * Skills are excluded: the keyword part of the match score owns them.
 * Title mode has no stated requirements to check, so it is not applicable.
 */
export function qualificationScore(profile: CareerProfileFull, target: JobTargetProfile): number | null {
  if (!target.structured) return null
  const cats = computeDeterministicCategories(buildJobMatchProfileInputFromFullProfile(profile), target.structured)
  const applicable = Object.entries(cats)
    .filter(([key, c]) => key !== 'required_skills' && c?.applicable)
    .map(([, c]) => c!.score)
  if (applicable.length === 0) return null
  return Math.round(applicable.reduce((a, b) => a + b, 0) / applicable.length)
}

const EMPTY_CONTENT: OptimizedContent = {
  summary: { generated: '', user_edited: null, source_profile_summary: '' },
  experience_blocks: [],
}

/** The resume as it stands today, before any optimization, for this target. */
export function baselineDocument(profile: CareerProfileFull, targetJobTitle: string, fieldVisibility?: Partial<FieldVisibility> | null): ResumeDocument {
  return buildResumeDocument({
    profile,
    optimizedContent: EMPTY_CONTENT,
    fieldVisibility: fieldVisibility ?? profile.field_visibility,
    targetJobTitle,
  })
}

export function buildAnalysisReport(opts: {
  profile: CareerProfileFull
  target: JobTargetProfile
  bridges: VerifiedBridge[]
  analysisId: string | null
  targetJobTitle: string
}): MatchReport {
  const { profile, target, bridges } = opts
  const doc = scoreDocumentFromResume(baselineDocument(profile, opts.targetJobTitle))
  const evidence = buildEvidenceMap(profile, target, bridges)
  const qualifications = qualificationScore(profile, target)
  const before = scoreResume(doc, target, qualifications)
  const max_total = maxAchievableScore(doc, target, evidence.keywords, qualifications, {
    summary: true,
    experienceIds: (profile.work_experience ?? []).map((e) => e.id),
  })
  return {
    report_version: 1,
    mode: target.mode,
    analysis_id: opts.analysisId,
    target,
    bridges,
    profile_fingerprint: profileFingerprint(profile),
    qualifications,
    before,
    max_total,
  }
}
