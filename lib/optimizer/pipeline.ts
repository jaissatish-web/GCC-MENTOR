/**
 * The optimization pipeline (2026-09-17). SERVER ONLY. docs/17_OPTIMIZER_ENGINE.md §3.
 *
 *   evidence map + tailoring plan          (code)
 *   -> section generation, in parallel     (model: summary call + roles in 3s)
 *   -> grounding validator + quality gate  (code)
 *   -> fact-check review                   (model, verified quotes only)
 *   -> ONE targeted repair of weak blocks  (model, only those blocks)
 *   -> best valid version per block, else the candidate's own text
 *   -> score guard: the match score never goes down
 *   -> optimized_content + skills_order + frozen document + match report
 *
 * WHY SECTIONS. One call for a whole resume was the slowest call in the product,
 * the one most often cut off at the token budget, and all-or-nothing: a single
 * bad bullet meant regenerating fourteen roles. Sections finish faster in
 * parallel, a failure is local, and a repair re-writes only what failed.
 *
 * NEVER UNVALIDATED. Every text that reaches `optimizedContent` passed the
 * grounding validator, the quality gate and (time permitting) the review. A
 * block that cannot be proven falls back to the candidate's own words.
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import type { ExperienceBlock, OptimizationLevel, OptimizedContent } from '@/types/package'
import { buildOptimizationPrompt, type OptimizationTarget, type SelectedBlocks } from '@/lib/ai/buildOptimizationPrompt'
import { validateGrounding, type ValidationFailure } from '@/lib/ai/validateGrounding'
import { normalizeSkillsOrder } from '@/lib/ai/skillsOrder'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { baselineDocument, qualificationScore, profileFingerprint, type GenerateFn } from './analyze'
import { buildEvidenceMap, type EvidenceMap } from './evidence'
import { buildTailoringPlan, renderPlanForPrompt, type TailoringPlan } from './plan'
import { checkQuality, type QualityIssue } from './qualityGate'
import { cutOutcomeTail, pruneSummary } from './autofix'
import { buildReviewUserPrompt, parseReview, REVIEW_SYSTEM_PROMPT, type ReviewBlock } from './review'
import { maxAchievableScore, scoreDocumentFromResume, scoreResume } from './score'
import { containsTermRaw } from './text'
import {
  applySuggestionsToDocument,
  LEVEL_TARGET_BAND,
  renderSuggestionRequest,
  suggestionRequirements,
  validateSuggestions,
  type Suggestion,
} from './suggestions'
import type { JobTargetProfile, KeptOriginalReason, MatchReport, VerifiedBridge } from './types'

const ROUTE = '/api/optimize'
/**
 * Roles per build call (2026-09-17, founder: "fewer API calls"). Most profiles
 * are written in ONE call — summary, every role, skill order and suggestions
 * together. Only longer histories are split.
 */
const SECTION_SIZE = 7
/** A repair round starts only with room for a whole section answer. */
const MIN_REPAIR_MS = 100_000
/** A review starts only with room to finish it. */
const MIN_REVIEW_MS = 45_000

export interface PipelineInput {
  profile: CareerProfileFull
  target: OptimizationTarget
  level: OptimizationLevel
  selectedBlocks: SelectedBlocks
  jobDescription: string | null
  targetProfile: JobTargetProfile | null
  bridges: VerifiedBridge[]
  analysisId: string | null
  userId: string
  giveUpAt: number
  generateFn: GenerateFn
  /** Development only (scripts/eval-optimizer-live.ts): every candidate and its issues. Never set in routes. */
  onTrace?: (event: { phase: 'first' | 'repair'; owner: string; text: string; hard: string[]; soft: string[] }) => void
}

export type PipelineResult =
  | {
      ok: true
      optimizedContent: OptimizedContent
      skillsOrder: string[]
      documentSnapshot: ResumeDocument
      report: MatchReport | null
      stats: PipelineStats
    }
  | { ok: false; status: number; error: string; stats: PipelineStats }

export interface PipelineStats {
  sections: number
  modelCalls: number
  repaired: number
  fellBack: number
  reviewRan: boolean
  codes: string[]
}

type Owner = string // 'summary' | profile_work_experience id

interface Candidate {
  owner: Owner
  summary?: string
  bullets?: string[]
  /** Blocking problems. Descriptions are safe to show the model, never logged. */
  hard: Array<{ code: string; detail: string; value?: string }>
  soft: Array<{ code: string; detail: string; value?: string }>
  reviewed: boolean
}

interface SectionSpec {
  summary: boolean
  ids: string[]
  /** This call also drafts suggestions (the first build call only). */
  suggest?: boolean
}

interface SectionOutcome {
  ok: boolean
  providerError: boolean
  skillsOrder: unknown
  candidates: Candidate[]
  suggestions?: unknown
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Accept the shapes models actually return for a section (measured 2026-09-17
 * on a live I&C build: every role came back under "bullets" with no
 * "was_optimized", and all nine roles were silently treated as empty).
 * Only KEY NAMES are normalised — no text is touched — and only for the roles
 * this section was asked to rewrite. Everything still passes the validator.
 */
export function normalizeSectionOutput(raw: unknown, sectionIds: readonly string[]): unknown {
  if (!isObject(raw)) return raw
  const out: Record<string, unknown> = { ...raw }
  const list = Array.isArray(raw.experience_blocks)
    ? raw.experience_blocks
    : Array.isArray(raw.experience)
      ? raw.experience
      : Array.isArray(raw.blocks)
        ? raw.blocks
        : null
  if (list) {
    // Resolve each block to one of THIS section's ids: exact, case/whitespace
    // variant, or an unambiguous 8+ character prefix. Blocks for any other
    // role were not asked for and are dropped rather than failing the section.
    const resolveId = (raw: unknown): string | null => {
      if (typeof raw !== 'string') return null
      const v = raw.trim().toLowerCase()
      if (!v) return null
      const exact = sectionIds.find((s) => s.toLowerCase() === v)
      if (exact) return exact
      if (v.length >= 8) {
        const hits = sectionIds.filter((s) => s.toLowerCase().startsWith(v) || v.startsWith(s.toLowerCase()))
        if (hits.length === 1) return hits[0]
      }
      return null
    }
    const seenIds = new Set<string>()
    const mapped = list.map((b) => {
      if (!isObject(b)) return null
      const id = resolveId(b.profile_experience_id ?? b.id ?? b.experience_id)
      if (!id || seenIds.has(id)) return null
      seenIds.add(id)
      return { ...b, profile_experience_id: id } as Record<string, unknown>
    })
    out.experience_blocks = mapped.filter((b): b is Record<string, unknown> => b !== null).map((b) => {
      if (!isObject(b)) return b
      const block: Record<string, unknown> = { ...b }
      const id = block.profile_experience_id ?? block.id ?? block.experience_id
      if (typeof id === 'string') block.profile_experience_id = id.trim()
      delete block.id
      delete block.experience_id
      if (!Array.isArray(block.generated_bullets)) {
        const alt = [block.bullets, block.rewritten_bullets, block.optimized_bullets, block.highlights].find(Array.isArray)
        if (alt) block.generated_bullets = alt
      }
      delete block.bullets
      delete block.rewritten_bullets
      delete block.optimized_bullets
      delete block.highlights
      if (typeof block.profile_experience_id === 'string' && sectionIds.includes(block.profile_experience_id) && block.was_optimized === undefined) {
        block.was_optimized = true
      }
      return block
    })
    delete out.experience
    delete out.blocks
  }
  if (typeof out.summary === 'string') out.summary = { generated: out.summary }
  return out
}

function ownerOf(f: ValidationFailure): Owner | null {
  if (f.owner === 'structural' || f.owner === 'skills_order') return null
  if (f.owner === 'summary') return 'summary'
  return f.owner.experienceId
}

function correctiveAddendum(cands: Candidate[]): string {
  const lines: string[] = []
  for (const c of cands) {
    for (const p of [...c.hard, ...c.soft]) {
      lines.push(`- ${c.owner === 'summary' ? 'summary' : `role ${c.owner}`}: ${p.detail}` + (p.value ? ` (found: "${p.value}")` : ''))
    }
    if (c.hard.length === 0 && c.soft.length === 0) {
      lines.push(`- ${c.owner === 'summary' ? 'summary' : `role ${c.owner}`}: missing from your previous answer.`)
    }
  }
  return (
    '\n\n## CORRECTION REQUIRED\n' +
    'Your previous answer for these blocks had problems:\n' +
    lines.join('\n') +
    '\n\nRewrite these blocks from scratch, fixing every problem above, still using only CANDIDATE FACTS and the ' +
    'TAILORING PLAN. Return ONLY the corrected JSON, matching the exact schema.'
  )
}

export async function runOptimizationPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { profile, target, level, selectedBlocks, jobDescription, targetProfile, bridges, userId, giveUpAt, generateFn } = input
  const stats: PipelineStats = { sections: 0, modelCalls: 0, repaired: 0, fellBack: 0, reviewRan: false, codes: [] }

  const entryById = new Map((profile.work_experience ?? []).map((e) => [e.id, e]))
  const selectedIds = (profile.work_experience ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((e) => e.id)
    .filter((id) => selectedBlocks.experienceIds.includes(id))

  const evidence: EvidenceMap = buildEvidenceMap(profile, targetProfile, bridges)
  const plan: TailoringPlan | null = targetProfile
    ? buildTailoringPlan(profile, evidence, targetProfile.mode, level)
    : null

  // In title mode there is no advert, but the estimated requirements ARE the
  // things most likely to be imported. Handing them to the validator's import
  // check makes an unsupported "typical" term a hard failure, not a flag.
  const importCheckText =
    jobDescription && jobDescription.trim()
      ? jobDescription
      : targetProfile
        ? targetProfile.keywords.map((k) => [k.term, ...k.aliases].join(' ')).join('\n')
        : null

  // ---- One section call ------------------------------------------------------
  const requirementsToDraft = suggestionRequirements(evidence.keywords, level)
  const runSection = async (spec: SectionSpec, addendum: string): Promise<SectionOutcome> => {
    const renderedPlan = plan ? renderPlanForPrompt(plan, spec.summary, spec.ids, profile) : null
    const suggestionRequest =
      spec.suggest && requirementsToDraft.length > 0 ? renderSuggestionRequest(requirementsToDraft, selectedIds, profile) : null
    const { system, user } = buildOptimizationPrompt(
      profile,
      target,
      level,
      { summary: spec.summary, experienceIds: spec.ids },
      jobDescription,
      null,
      renderedPlan,
      !spec.summary && spec.ids.length > 0,
      suggestionRequest,
    )
    const owners: Owner[] = [...(spec.summary ? ['summary'] : []), ...spec.ids]
    let parsed: unknown = null
    let structuralDetail: string | null = null

    let providerFailures = 0
    for (let attempt = 0; attempt < 3; attempt++) {
      if (Date.now() > giveUpAt - 15_000) break
      // At most two answers are judged; a third attempt exists only to recover
      // from a provider failure, never to re-roll a structurally bad answer.
      if (attempt === 2 && providerFailures === 0) break
      let text: string
      try {
        stats.modelCalls++
        const res = await generateFn({
          system,
          user: user + addendum + (structuralDetail ? `\n\n## CORRECTION REQUIRED\n${structuralDetail}\nReturn ONLY valid JSON matching the exact schema.` : ''),
          // A whole resume in one answer needs room; small calls fail fast on a stall.
          maxTokens: spec.ids.length > 3 || spec.suggest ? 12_000 : 8192,
          temperature: 0.2,
          userId,
          route: ROUTE,
          configKey: 'optimization',
          giveUpAt,
          stallTimeoutMs: spec.ids.length > 3 || spec.suggest ? 150_000 : 90_000,
        })
        if (res.truncated) {
          stats.codes.push('section_truncated')
          structuralDetail = 'Your previous answer was cut off before it finished. Be concise.'
          continue
        }
        text = res.text
      } catch (e) {
        console.error('optimizer: section call failed', e instanceof Error ? e.message : String(e))
        providerFailures++
        // One retry after a provider failure or stall, when a whole answer still fits.
        if (providerFailures === 1 && giveUpAt - Date.now() >= 60_000) continue
        return { ok: false, providerError: true, skillsOrder: undefined, candidates: [] }
      }
      let candidate: unknown
      try {
        candidate = normalizeSectionOutput(extractJsonObject(text), spec.ids)
      } catch {
        candidate = text
      }
      const probe = validateGrounding(profile, candidate, isObject(candidate) ? candidate.skills_order : undefined, {
        jobDescription: importCheckText,
        strictNumerics: process.env.GROUNDING_STRICT_NUMERICS !== 'false',
        approvedTerms: evidence.approvedTerms,
      })
      const structural = probe.failures.filter((f) => f.severity === 'hard' && f.owner === 'structural')
      if (structural.length === 0) {
        parsed = candidate
        break
      }
      stats.codes.push(...structural.map((f) => f.code))
      structuralDetail = 'Your previous answer was not usable: ' + structural.map((f) => `${f.path}: ${f.detail}`).join('; ')
    }

    if (!isObject(parsed)) {
      stats.codes.push('section_unusable')
      return { ok: false, providerError: false, skillsOrder: undefined, candidates: [] }
    }

    const validation = validateGrounding(profile, parsed, parsed.skills_order, {
      jobDescription: importCheckText,
      strictNumerics: process.env.GROUNDING_STRICT_NUMERICS !== 'false',
      approvedTerms: evidence.approvedTerms,
    })
    const hardByOwner = new Map<Owner, Candidate['hard']>()
    for (const f of validation.failures) {
      if (f.severity !== 'hard') continue
      const o = ownerOf(f)
      if (!o) continue
      const list = hardByOwner.get(o) ?? []
      list.push({ code: f.code, detail: f.detail, value: f.offendingValue })
      hardByOwner.set(o, list)
      stats.codes.push(f.code)
    }

    const blocks = new Map<string, string[]>()
    if (Array.isArray(parsed.experience_blocks)) {
      for (const b of parsed.experience_blocks) {
        if (isObject(b) && typeof b.profile_experience_id === 'string' && Array.isArray(b.generated_bullets)) {
          const bullets = b.generated_bullets.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
          blocks.set(b.profile_experience_id, bullets)
        }
      }
    }

    const candidates: Candidate[] = []
    for (const owner of owners) {
      if (owner === 'summary') {
        const s = isObject(parsed.summary) && typeof parsed.summary.generated === 'string' ? parsed.summary.generated.trim() : ''
        if (!s) continue
        candidates.push({ owner, summary: s, hard: hardByOwner.get('summary') ?? [], soft: [], reviewed: false })
      } else {
        const bullets = blocks.get(owner)
        if (!bullets || bullets.length === 0) continue
        candidates.push({ owner, bullets, hard: hardByOwner.get(owner) ?? [], soft: [], reviewed: false })
      }
    }
    return { ok: true, providerError: false, skillsOrder: parsed.skills_order, candidates, suggestions: parsed.suggestions }
  }

  /** The summary rides with the first roles, so a typical resume is ONE call. */
  const sectionsFor = (owners: Owner[]): SectionSpec[] => {
    const specs: SectionSpec[] = []
    const ids = owners.filter((o) => o !== 'summary')
    const withSummary = owners.includes('summary')
    if (ids.length === 0) return withSummary ? [{ summary: true, ids: [] }] : []
    for (let i = 0; i < ids.length; i += SECTION_SIZE) {
      specs.push({ summary: i === 0 && withSummary, ids: ids.slice(i, i + SECTION_SIZE) })
    }
    return specs
  }

  // ---- Round 1 ---------------------------------------------------------------
  const wantedOwners: Owner[] = [...(selectedBlocks.summary ? ['summary'] : []), ...selectedIds]
  const firstSpecs = sectionsFor(wantedOwners)
  // Every call returns a skill ordering; the first one also drafts suggestions.
  if (firstSpecs.length > 0) firstSpecs[0].suggest = true
  stats.sections = firstSpecs.length

  const firstOutcomes = await Promise.all(firstSpecs.map((s) => runSection(s, '')))
  if (firstOutcomes.length > 0 && firstOutcomes.every((o) => !o.ok)) {
    const provider = firstOutcomes.some((o) => o.providerError)
    return {
      ok: false,
      status: 502,
      error: provider
        ? "The AI service didn't answer in time. Your job is saved — please try again."
        : 'Could not produce a grounded result. Please try again or contact support.',
      stats,
    }
  }

  let skillsOrderRaw: unknown = firstOutcomes.find((o) => o.ok && o.skillsOrder !== undefined)?.skillsOrder
  const rawSuggestions = firstOutcomes[0]?.suggestions
  const current = new Map<Owner, Candidate>()
  for (const o of firstOutcomes) for (const c of o.candidates) current.set(c.owner, c)

  // ---- Gate + review ----------------------------------------------------------
  const applyGate = (cands: Candidate[]) => {
    const all = [...current.values()]
    const summaryCand = all.find((c) => c.owner === 'summary')
    const issues: QualityIssue[] = checkQuality({
      profile,
      plan,
      evidence,
      level,
      summary: summaryCand?.summary ?? null,
      blocks: all.filter((c) => c.bullets).map((c) => ({ entryId: c.owner, bullets: c.bullets! })),
    })
    const wanted = new Set(cands.map((c) => c.owner))
    for (const c of cands) c.soft = c.soft.filter((s) => s.code === 'review_note')
    for (const i of issues) {
      if (!wanted.has(i.owner)) continue
      const c = current.get(i.owner)
      if (!c) continue
      stats.codes.push(i.code)
      const item = { code: i.code, detail: i.detail, value: i.offendingValue }
      if (i.severity === 'hard') {
        if (!c.hard.some((h) => h.code === i.code && h.value === i.offendingValue)) c.hard.push(item)
      } else c.soft.push(item)
    }
  }

  const reviewFlagged = new Set<Owner>()
  const review = async (cands: Candidate[]) => {
    // A separate fact-check call is OFF by default (founder: fewer API calls).
    // The validator, quality gate and autofix run on every block regardless.
    // Set OPTIMIZER_REVIEW=on to add the independent review call back.
    if (process.env.OPTIMIZER_REVIEW !== 'on') return
    const targets = cands.filter((c) => c.hard.length === 0)
    if (targets.length === 0) return
    if (giveUpAt - Date.now() < MIN_REVIEW_MS) return
    const blocks: ReviewBlock[] = targets.map((c) => ({
      block: c.owner,
      rewrite: c.summary ? [c.summary] : (c.bullets ?? []),
      approvedTerms: evidence.approvedTerms.get(c.owner) ?? [],
    }))
    try {
      stats.modelCalls++
      const res = await generateFn({
        system: REVIEW_SYSTEM_PROMPT,
        user: buildReviewUserPrompt(profile, blocks),
        maxTokens: 6144,
        temperature: 0,
        userId,
        route: ROUTE,
        configKey: 'optimization_review',
        giveUpAt,
      })
      if (res.truncated) return
      const issues = parseReview(extractJsonObject(res.text), blocks)
      stats.reviewRan = true
      for (const c of targets) c.reviewed = true
      for (const i of issues) {
        const c = current.get(i.block)
        if (!c) continue
        stats.codes.push('review_unsupported')
        reviewFlagged.add(c.owner)
        c.hard.push({ code: 'review_unsupported', detail: `Unsupported claim: ${i.reason}`, value: i.quote })
      }
    } catch (e) {
      console.error('optimizer: review failed (non-fatal)', e instanceof Error ? e.message : String(e))
    }
  }

  const trace = (phase: 'first' | 'repair', cands: Candidate[]) => {
    if (!input.onTrace) return
    for (const c of cands) {
      input.onTrace({
        phase,
        owner: c.owner,
        text: c.summary ?? (c.bullets ?? []).join('\n'),
        hard: c.hard.map((h) => `${h.code}: ${h.detail}${h.value ? ` [${h.value}]` : ''}`),
        soft: c.soft.map((h) => `${h.code}: ${h.detail}${h.value ? ` [${h.value}]` : ''}`),
      })
    }
  }

  // ---- Deterministic repair by removal (lib/optimizer/autofix.ts) --------------
  // Re-validated from scratch; replaces the candidate only when the shorter text
  // is clean. Review findings are located by their verbatim quotes, so a pruned
  // text that no longer contains them keeps its reviewed status.
  const REMOVABLE = new Set(['objective_statement', 'unsupported_intensifier', 'unstated_outcome', 'jd_only_entity', 'review_unsupported', 'banned_word', 'forbidden_gap_term', 'unknown_entity', 'promoted_involvement'])
  const autofix = (cands: Candidate[]): Candidate[] => {
    const changed: Candidate[] = []
    for (const c of cands) {
      if (c.hard.length === 0 || !c.hard.every((h) => REMOVABLE.has(h.code) && h.value)) continue
      // promoted_involvement lists words ("led, managed"); each is its own phrase to locate.
      const phrases = c.hard.flatMap((h) => (h.code === 'promoted_involvement' ? h.value!.split(/,\s*/) : [h.value!]))
      let fixed: Candidate | null = null
      if (c.summary) {
        const pruned = pruneSummary(c.summary, phrases)
        if (pruned) fixed = { owner: c.owner, summary: pruned, hard: [], soft: [], reviewed: c.reviewed }
      } else if (c.bullets && c.hard.every((h) => h.code === 'unstated_outcome')) {
        let bullets = c.bullets.slice()
        for (const h of c.hard) {
          bullets = bullets.map((b) => (b.toLowerCase().includes(h.value!.toLowerCase()) ? (cutOutcomeTail(b, h.value!) ?? b) : b))
        }
        fixed = { owner: c.owner, bullets, hard: [], soft: [], reviewed: c.reviewed }
      }
      if (!fixed) continue
      const output = {
        summary: { generated: fixed.summary ?? '' },
        experience_blocks: fixed.bullets ? [{ profile_experience_id: c.owner, was_optimized: true, generated_bullets: fixed.bullets }] : [],
      }
      const v = validateGrounding(profile, output, undefined, {
        jobDescription: importCheckText,
        strictNumerics: process.env.GROUNDING_STRICT_NUMERICS !== 'false',
        approvedTerms: evidence.approvedTerms,
      })
      if (v.failures.some((f) => f.severity === 'hard' && ownerOf(f) === c.owner)) continue
      current.set(c.owner, fixed)
      applyGate([fixed])
      if (fixed.hard.length > 0) {
        current.set(c.owner, c)
        continue
      }
      stats.codes.push('autofix')
      if (fixed.reviewed) reviewFlagged.delete(c.owner)
      changed.push(fixed)
    }
    return changed
  }

  /** Autofix, then make sure anything it produced that was never reviewed is reviewed. */
  const settle = async (cands: Candidate[]) => {
    const fixed = autofix(cands)
    const unreviewed = fixed.filter((f) => !f.reviewed)
    if (unreviewed.length > 0) {
      await review(unreviewed)
      autofix(unreviewed.map((u) => current.get(u.owner) ?? u))
    }
  }

  applyGate([...current.values()])
  await review([...current.values()])
  await settle([...current.values()])
  trace('first', [...current.values()])
  for (const o of wantedOwners) {
    if (!current.has(o)) input.onTrace?.({ phase: 'first', owner: o, text: '', hard: ['no_output'], soft: [] })
  }

  // ---- Repair round -------------------------------------------------------------
  // ONE repair call, only for blocks that cannot ship (missing or a hard
  // problem). Soft issues ship as they are rather than spend another call.
  const needsRepair = wantedOwners.filter((o) => {
    const c = current.get(o)
    return !c || c.hard.length > 0
  })
  const firstVersion = new Map(current)

  if (needsRepair.length > 0 && giveUpAt - Date.now() >= MIN_REPAIR_MS) {
    const specs = sectionsFor(needsRepair)
    const outcomes = await Promise.all(
      specs.map((spec) => {
        const owners = [...(spec.summary ? ['summary'] : []), ...spec.ids]
        const cands = owners.map((o) => current.get(o) ?? { owner: o, hard: [], soft: [], reviewed: false })
        return runSection(spec, correctiveAddendum(cands))
      }),
    )
    const repaired: Candidate[] = []
    for (const o of outcomes) {
      if (!o.ok) continue
      if (skillsOrderRaw === undefined && o.skillsOrder !== undefined) skillsOrderRaw = o.skillsOrder
      for (const c of o.candidates) {
        if (!needsRepair.includes(c.owner)) continue
        repaired.push(c)
      }
    }
    stats.repaired = repaired.length
    // Gate the repaired versions in the context of everything else, then review.
    for (const c of repaired) current.set(c.owner, c)
    applyGate(repaired)
    await review(repaired)
    await settle(repaired.map((c) => current.get(c.owner) ?? c))
    trace('repair', repaired.map((c) => current.get(c.owner) ?? c))

    // Keep whichever version is better, per block.
    for (const r of repaired) {
      const c = current.get(r.owner) ?? r
      const prev = firstVersion.get(r.owner)
      const score = (x: Candidate | undefined) =>
        !x ? -1e9 : x.hard.length > 0 ? -1e6 : (x.reviewed ? 1000 : 0) - x.soft.length * 10
      current.set(r.owner, score(prev) > score(c) ? prev! : c)
    }
  }


  // ---- Choose ------------------------------------------------------------------
  const kept: MatchReport['kept_original'] = []
  const reasonOf = (c: Candidate | undefined): KeptOriginalReason => {
    if (!c) return 'no_output'
    if (reviewFlagged.has(c.owner)) return 'review'
    if (c.hard.some((h) => h.code === 'review_unsupported')) return 'review'
    if (c.hard.some((h) => ['banned_word', 'promoted_involvement', 'forbidden_gap_term'].includes(h.code))) return 'quality'
    return 'grounding'
  }
  const final = new Map<Owner, Candidate>()
  for (const owner of wantedOwners) {
    const c = current.get(owner)
    // A block the review once flagged ships only after a clean re-review; a
    // repair that ran out of time to be re-reviewed keeps the original text.
    const unverifiedRepair = c !== undefined && reviewFlagged.has(owner) && !c.reviewed
    if (c && c.hard.length === 0 && !unverifiedRepair) final.set(owner, c)
    else {
      kept.push({ block: owner, reason: reasonOf(c) })
      stats.fellBack++
    }
  }

  const skills = normalizeSkillsOrder(profile.skills ?? [], skillsOrderRaw)

  const buildContent = (reverted: Set<Owner>): OptimizedContent => {
    const summaryC = reverted.has('summary') ? undefined : final.get('summary')
    const experience_blocks: ExperienceBlock[] = selectedIds.map((id) => {
      const src = entryById.get(id)?.highlights ?? []
      const c = reverted.has(id) ? undefined : final.get(id)
      return {
        profile_experience_id: id,
        was_optimized: Boolean(c),
        generated_bullets: c?.bullets ?? src,
        user_edited_bullets: null,
        source_bullets: src,
        claims: [],
      }
    })
    const fbExperience = selectedIds.filter((id) => !experience_blocks.find((b) => b.profile_experience_id === id)?.was_optimized)
    const fbSummary = selectedBlocks.summary && !summaryC
    return {
      summary: {
        generated: summaryC?.summary ?? '',
        user_edited: null,
        source_profile_summary: profile.professional_summary ?? '',
      },
      experience_blocks,
      ...(fbSummary || fbExperience.length > 0 ? { fallback_used: { summary: fbSummary, experience_ids: fbExperience } } : {}),
    }
  }

  const docFor = (content: OptimizedContent) =>
    buildResumeDocument({
      profile,
      optimizedContent: content,
      skillsOrder: skills.order,
      fieldVisibility: profile.field_visibility,
      targetJobTitle: target.target_job_title,
    })

  const reverted = new Set<Owner>()
  let content = buildContent(reverted)
  let document = docFor(content)

  let report: MatchReport | null = null
  if (targetProfile) {
    const qualifications = qualificationScore(profile, targetProfile)
    const baseDoc = scoreDocumentFromResume(baselineDocument(profile, target.target_job_title))
    const before = scoreResume(baseDoc, targetProfile, qualifications)
    let after = scoreResume(scoreDocumentFromResume(document), targetProfile, qualifications)

    // SCORE GUARD. A build must never make the resume a worse match. If it did,
    // revert the block whose reversal helps most, until it no longer does.
    while (after.total < before.total) {
      let best: { owner: Owner; total: number } | null = null
      for (const owner of final.keys()) {
        if (reverted.has(owner)) continue
        const trial = new Set(reverted).add(owner)
        const total = scoreResume(scoreDocumentFromResume(docFor(buildContent(trial))), targetProfile, qualifications).total
        if (!best || total > best.total) best = { owner, total }
      }
      if (!best) break
      reverted.add(best.owner)
      kept.push({ block: best.owner, reason: 'score_guard' })
      stats.fellBack++
      content = buildContent(reverted)
      document = docFor(content)
      after = scoreResume(scoreDocumentFromResume(document), targetProfile, qualifications)
    }

    const where = (term: string) => {
      const hit = after.keywords.find((k) => k.term === term)
      return (hit?.where ?? []).filter((w) => w !== 'skills')
    }
    // Drafts for the candidate to confirm (never merged here).
    const suggestions: Suggestion[] = validateSuggestions(rawSuggestions, {
      profile,
      requirements: requirementsToDraft,
      roleIds: selectedIds,
    })
    const projected = suggestions.length
      ? scoreResume(scoreDocumentFromResume(applySuggestionsToDocument(document, suggestions)), targetProfile, qualifications).total
      : after.total
    if (suggestions.length) stats.codes.push('suggestions_' + suggestions.length)

    report = {
      suggestions,
      projected_with_suggestions: Math.max(projected, after.total),
      target_band: LEVEL_TARGET_BAND[level],
      report_version: 1,
      mode: targetProfile.mode,
      analysis_id: input.analysisId,
      target: targetProfile,
      bridges,
      profile_fingerprint: profileFingerprint(profile),
      qualifications,
      before,
      max_total: maxAchievableScore(baseDoc, targetProfile, evidence.keywords, qualifications, {
        summary: true,
        experienceIds: (profile.work_experience ?? []).map((e) => e.id),
      }),
      level,
      after,
      why_fits: after.keywords
        .filter((k) => k.credit === 1 && k.kind !== 'soft_skill')
        .sort((a, b) => (a.importance === b.importance ? 0 : a.importance === 'must' ? -1 : 1))
        .slice(0, 6)
        .map((k) => ({ term: k.term, where: where(k.term) })),
      gaps: evidence.keywords
        .filter((k) => k.status === 'gap' && k.kind !== 'soft_skill' && !containsTermRaw(JSON.stringify(document), k.term, k.aliases))
        .map((k) => ({ term: k.term, importance: k.importance, kind: k.kind })),
      kept_original: kept,
      generated_at: new Date().toISOString(),
    }
  }

  return { ok: true, optimizedContent: content, skillsOrder: skills.order, documentSnapshot: document, report, stats }
}
