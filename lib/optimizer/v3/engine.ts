/**
 * Optimizer v3 engine — TEST LAB (2026-10-02). Not wired into /api/optimize.
 *
 *   analyzeV3()  one fast call: requirements, field match, groups A / B / C,
 *                then code re-checks every grouping against the profile text
 *   writeV3()    one fast call per level: summary + bullets (+ new points)
 *                then code checks every bullet; a failing job keeps its own
 *                bullets, a failing new point is dropped
 *
 * Same model as production, thinking off, fastest hosts first
 * (GenerateParams.openRouter). Never touches certificates, education,
 * companies, titles, dates or personal details — they are not in the output.
 */
import { generate } from '@/lib/ai/provider'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
import { validateGrounding } from '@/lib/ai/validateGrounding'
import { FAST_HOSTS } from '@/lib/resumeParse/pipeline'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizationLevel } from '@/types/package'
import { containsTermRaw, contentStems, sharesContentStem, stemsMatch } from '../text'
import { totalExperienceYears } from '@/lib/experienceYears'
import { entrySourceText } from '../evidence'
import type { JobTargetProfile, KeywordKind } from '../types'
import { ANALYSIS_SYSTEM, analysisUser, jobKeys, writerSystem, writerUser, type WriterLists } from './prompts'

export type Group = 'A' | 'B' | 'C'
export type FieldMatch = 'same' | 'related' | 'different'

export interface Requirement {
  term: string
  importance: 'must' | 'nice'
  kind: string
  group: Group
  /** Profile location: a work_experience id, 'summary', or null. */
  location: string | null
  quote: string | null
  /** Why code changed the model's group, if it did. */
  regrouped?: string
}

export interface AnalysisV3 {
  jobField: string
  candidateField: string
  fieldMatch: FieldMatch
  requirements: Requirement[]
  ms: number
  inputTokens: number
  outputTokens: number
}

const FAST = { reasoningOff: true, preferHosts: FAST_HOSTS }
const LANGUAGE = /\b(arabic|english|hindi|urdu|tagalog|french|malayalam|tamil|bengali|nepali|sinhala|mandarin|russian|german|spanish|language)\b/i
const FIXED_KINDS = new Set(['experience_years', 'education', 'certification', 'licence'])
const B_KINDS = new Set(['responsibility', 'skill', 'domain', 'soft_skill', 'equipment'])
const KINDS = new Set(['skill', 'tool', 'standard', 'equipment', 'responsibility', 'domain', 'certification', 'licence', 'education', 'experience_years', 'soft_skill'])

function profileWide(p: CareerProfileFull): string {
  return [
    p.professional_summary ?? '',
    ...(p.skills ?? []).map((s) => s.name),
    ...(p.certifications ?? []).map((c) => `${c.name} ${c.issuer ?? ''}`),
    ...(p.education ?? []).map((e) => `${e.degree} ${e.field_of_study ?? ''} ${e.institution}`),
  ].join('\n')
}

/** Quote check that ignores punctuation and spacing ("Bachelor of Technology, Mechanical"). */
function quoteIn(haystack: string, quote: string | null): boolean {
  if (!quote) return false
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim()
  const q = n(quote)
  return q.length >= 3 && n(haystack).includes(q)
}

function locationText(p: CareerProfileFull, loc: string | null): string {
  if (!loc) return ''
  if (loc === 'summary') return profileWide(p)
  const e = p.work_experience.find((x) => x.id === loc)
  return e ? entrySourceText(e) : ''
}

/** Where a term literally appears in the profile, if anywhere. */
function literalLocations(p: CareerProfileFull, term: string): string[] {
  const out: string[] = []
  if (containsTermRaw(profileWide(p), term)) out.push('summary')
  for (const e of p.work_experience ?? []) if (containsTermRaw(entrySourceText(e), term)) out.push(e.id)
  return out
}

export async function analyzeV3(profile: CareerProfileFull, targetTitle: string, jd: string | null, route = 'opt-lab/v3'): Promise<AnalysisV3> {
  const t0 = Date.now()
  const keys = jobKeys(profile)
  const res = await generate({
    system: ANALYSIS_SYSTEM,
    user: analysisUser(profile, targetTitle, jd),
    maxTokens: 6000,
    temperature: 0,
    route,
    configKey: 'job_description',
    stallTimeoutMs: 45_000,
    openRouter: FAST,
  })
  const raw = extractJsonObject(res.text) as Record<string, unknown> | null
  if (!raw || !Array.isArray(raw.requirements)) throw new Error('analysis unparseable')
  const fieldMatch: FieldMatch = raw.field_match === 'same' || raw.field_match === 'related' ? raw.field_match : 'different'
  const toId = (j: unknown) => (j === 'summary' ? 'summary' : keys.find((k) => k.key === j)?.id ?? null)

  const requirements: Requirement[] = []
  const seen = new Set<string>()
  for (const r of raw.requirements as Array<Record<string, unknown>>) {
    const term = String(r.term ?? '').trim()
    if (!term || seen.has(term.toLowerCase())) continue
    seen.add(term.toLowerCase())
    const kind = KINDS.has(String(r.kind)) ? String(r.kind) : 'skill'
    const importance = r.importance === 'nice' ? 'nice' : 'must'
    let group: Group = r.group === 'A' || r.group === 'B' ? r.group : 'C'
    let location = toId(r.job)
    const quote = typeof r.quote === 'string' && r.quote.trim() ? r.quote.trim() : null
    let regrouped: string | undefined

    // Code re-checks every grouping against the profile's own text.
    const literal = literalLocations(profile, term)
    if (kind === 'experience_years') {
      // Years are arithmetic on the job dates, never the model's reading.
      const need = Number(term.match(/\d+/)?.[0] ?? NaN)
      const have = totalExperienceYears(profile) ?? 0
      const ok = Number.isFinite(need) && have >= need
      if ((ok ? 'A' : 'C') !== group) regrouped = `${group}->${ok ? 'A' : 'C'} (${have} years in the profile)`
      group = ok ? 'A' : 'C'
      location = 'summary'
    } else if (literal.length) {
      if (group !== 'A') regrouped = `${group}->A (written in the profile)`
      group = 'A'
      location = literal[0]
    } else if (group === 'A') {
      // The quote must exist AND be about the requirement: "Seeking to leverage
      // my expertise" is in the CV but proves nothing about "English proficiency".
      if (!(location && quoteIn(locationText(profile, location), quote) && sharesContentStem(term, quote ?? ''))) {
        // The model saw it as shown but quoted loosely: same-field and an
        // addable kind -> a new point (judged by the new-point rules), else C.
        group = B_KINDS.has(kind) && fieldMatch !== 'different' && location && location !== 'summary' ? 'B' : 'C'
        regrouped = `A->${group} (quote not found in the profile)`
      }
    } else if (group === 'B') {
      const why =
        !B_KINDS.has(kind) ? `kind ${kind} is never added`
        : fieldMatch === 'different' ? 'different field'
        : !location || location === 'summary' ? 'no job given'
        : !quoteIn(locationText(profile, location), quote) ? 'related quote not found'
        : null
      if (why) { group = 'C'; regrouped = `B->C (${why})` }
    }
    // Soft skills the job asks for (communication, teamwork, problem-solving…)
    // are standard, low-risk claims for anyone already in the field: they go in
    // the summary. Spoken languages are facts, never assumed.
    if (LANGUAGE.test(term) && !literal.length) {
      if (group !== 'C') regrouped = `${group}->C (a language the profile does not name)`
      group = 'C'
    } else if (group === 'C' && kind === 'soft_skill' && fieldMatch !== 'different') {
      group = 'B'; location = 'summary'; regrouped = 'C->B (soft skill, same field)'
    }
    requirements.push({ term, importance, kind, group, location, quote, regrouped })
  }
  return {
    jobField: String(raw.job_field ?? ''),
    candidateField: String(raw.candidate_field ?? ''),
    fieldMatch,
    requirements,
    ms: Date.now() - t0,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
  }
}

/** Which B requirements a level may add. */
export function addableAt(a: AnalysisV3, level: OptimizationLevel): Requirement[] {
  if (level === 'easy') return []
  const b = a.requirements.filter((r) => r.group === 'B')
  return level === 'moderate' ? b.filter((r) => r.importance === 'must') : b
}

export function writerLists(profile: CareerProfileFull, a: AnalysisV3, level: OptimizationLevel): WriterLists {
  const keys = jobKeys(profile)
  const keyOf = (loc: string | null) => (loc === 'summary' ? 'summary' : keys.find((k) => k.id === loc)?.key ?? 'summary')
  const addable = addableAt(a, level)
  const addSet = new Set(addable)
  return {
    fieldLine: `${a.fieldMatch} field (${a.candidateField || 'candidate'} -> ${a.jobField || 'job'})`,
    // Years, education, certificates and licences are fixed facts shown elsewhere
    // on the CV — a "must appear exactly" keyword for them could only be met by
    // copying the advert's numbers. They stay off the writer's list.
    a: a.requirements.filter((r) => r.group === 'A' && !FIXED_KINDS.has(r.kind)).map((r) => ({ term: r.term, where: literalLocations(profile, r.term).map(keyOf).slice(0, 3).concat(literalLocations(profile, r.term).length ? [] : [keyOf(r.location)]) })),
    b: addable.map((r) => ({ term: r.term, job: keyOf(r.location), quote: r.quote ?? '' })),
    c: a.requirements.filter((r) => r.group === 'C' || (r.group === 'B' && !addSet.has(r))).map((r) => r.term),
  }
}

/** `added`: list-B terms an enhanced rewrite brings in (shown in yellow the first time). */
export interface WrittenBullet { text: string; isNew: boolean; added?: string[] }
export interface WrittenJob { id: string; bullets: WrittenBullet[]; keptOriginal: boolean; droppedNew: string[] }

const FILLER_TAIL = /(?:,\s*|\s+and\s+)(?:ensur\w*|facilitat\w*|contributing to)\b[^.;]*[.;]?\s*$/i
const FILLER_LEAD = /^(?:,\s*|\s+and\s+)(?:ensur\w*|facilitat\w*|contributing to)\b/i

/**
 * Cut an ", ensuring accuracy and completeness" tail the model adds to sound
 * busy. Only when the tail names no job keyword, holds no number, and is not
 * something the profile itself says — so it only ever removes fluff, never a
 * fact or an ATS keyword. The model ignores "no filler" in the prompt, so this
 * is enforced here.
 */
export function trimFiller(text: string, source: string, terms: readonly string[]): string {
  const m = text.match(FILLER_TAIL)
  if (!m || m.index === undefined) return text
  const head = text.slice(0, m.index).replace(/[,;:\s]+$/, '')
  const tail = m[0]
  if (head.split(/\s+/).length < 6 || /\d/.test(tail) || terms.some((t) => containsTermRaw(tail, t))) return text
  // "and ensured timely payments to vendors" is the profile's own fact: a tail
  // whose first clause mostly comes from the profile stays.
  const said = contentStems(tail.replace(FILLER_LEAD, '').split(',')[0])
  const src = contentStems(source)
  if (said.length && said.filter((s) => src.some((x) => stemsMatch(s, x))).length / said.length >= 0.6) return text
  return head + '.'
}

const STUFF_TAIL = /(?:,\s*|\s+and\s+)(?:ensur\w*|facilitat\w*|contributing to|demonstrat\w*|providing|supporting|applying|leveraging|utiliz\w*|showcasing|enabling)\b[^.;]*[.;]?\s*$/i
const STUFF_LEAD = /^(?:,\s*|\s+and\s+)(?:ensur\w*|facilitat\w*|contributing to|demonstrat\w*|providing|supporting|applying|leveraging|utiliz\w*|showcasing|enabling)\b/i

/** A ", facilitating stakeholder management" tail that carries job keywords — or null. */
export function stuffedTail(text: string, terms: readonly string[]): { head: string; inTail: string[] } | null {
  const m = text.match(STUFF_TAIL)
  if (!m || m.index === undefined) return null
  const head = text.slice(0, m.index).replace(/[,;:\s]+$/, '')
  if (head.split(/\s+/).length < 6 || /\d/.test(m[0])) return null
  const inTail = terms.filter((t) => containsTermRaw(m[0], t))
  return inTail.length ? { head, inTail } : null
}

/**
 * Keyword stuffing, cut where it costs the ATS nothing (founder, 2026-10-02:
 * lines like "…, facilitating stakeholder management" pass the software but
 * read as robotic to the recruiter who reads next). A tail of job keywords is
 * cut ONLY when every keyword in it already appears elsewhere in the CV —
 * summary, skills or another line — so the ATS still finds each one. A tail
 * the profile itself states is a fact and stays; numbers always stay; the
 * candidate's own unchanged lines and added points are never touched.
 */
export function trimStuffedTails(jobs: WrittenJob[], summary: string, skills: readonly string[], terms: readonly string[], sourceOf: (id: string) => string): { jobs: WrittenJob[]; cut: number } {
  const out = jobs.map((j) => ({ ...j, bullets: j.bullets.map((b) => ({ ...b })) }))
  let cut = 0
  for (const j of out) {
    if (j.keptOriginal) continue
    const src = contentStems(sourceOf(j.id))
    for (const b of j.bullets) {
      if (b.isNew) continue
      const s = stuffedTail(b.text, terms)
      if (!s) continue
      const said = contentStems(b.text.slice(s.head.length).replace(STUFF_LEAD, '').split(',')[0])
      if (said.length && said.filter((x) => src.some((y) => stemsMatch(x, y))).length / said.length >= 0.6) continue
      const rest = [summary, ...skills, ...out.flatMap((o) => o.bullets.filter((x) => x !== b).map((x) => x.text))].join('\n')
      if (!s.inTail.every((t) => containsTermRaw(rest, t))) continue
      b.text = s.head + '.'
      cut++
    }
  }
  return { jobs: out, cut }
}

export const numbersIn = (t: string) => t.match(/\d+(?:[.,]\d+)*/g) ?? []
/** The number as a whole number: "25" is not in "2025". */
export const hasNumber = (text: string, n: string) => new RegExp(`(?<![\\d.,])${n.replace(/[.,]/g, '[.,]')}(?![\\d])`).test(text)

/** Share of a bullet's own content words (the added terms left out) that the job's real text has. */
export function ownShare(text: string, source: string, added: readonly string[]): number {
  let rest = text
  for (const t of added) rest = rest.replace(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ')
  const mine = contentStems(rest)
  if (!mine.length) return 0
  const theirs = contentStems(source)
  return mine.filter((s) => theirs.some((x) => stemsMatch(s, x))).length / mine.length
}
export interface WriteV3Result {
  level: OptimizationLevel
  summary: string
  summaryKeptOriginal: boolean
  /** List-B terms the summary brings in that the profile does not state. */
  summaryAdded: string[]
  jobs: WrittenJob[]
  skillsOrder: string[]
  ms: number
  inputTokens: number
  outputTokens: number
  /** Problems the checks caught (and fixed by falling back or dropping). */
  caught: string[]
}

const CERTISH = /\b(certifi\w*|licen[cs]\w*|degree|diploma|bachelor|master'?s?|registered with|accredit\w*)\b/i

export async function writeV3(profile: CareerProfileFull, targetTitle: string, jd: string | null, a: AnalysisV3, level: OptimizationLevel, route = 'opt-lab/v3'): Promise<WriteV3Result> {
  const t0 = Date.now()
  const keys = jobKeys(profile)
  const lists = writerLists(profile, a, level)
  const res = await generate({
    system: writerSystem(targetTitle, level),
    user: writerUser(profile, targetTitle, jd, lists),
    maxTokens: 6000,
    temperature: 0.2,
    route,
    configKey: 'optimization',
    stallTimeoutMs: 60_000,
    openRouter: FAST,
  })
  const raw = extractJsonObject(res.text) as Record<string, unknown> | null
  if (!raw) throw new Error('writer unparseable' + (res.truncated ? ' (truncated)' : ''))
  const caught: string[] = []

  // ---- what the model wrote, mapped back to real job ids
  const byId = new Map<string, WrittenBullet[]>()
  for (const j of Array.isArray(raw.jobs) ? (raw.jobs as Array<Record<string, unknown>>) : []) {
    const id = keys.find((k) => k.key === j.id)?.id
    if (!id) continue
    const bullets = (Array.isArray(j.bullets) ? j.bullets : []).map((b: unknown) =>
      typeof b === 'string' ? { text: b, isNew: false } : { text: String((b as Record<string, unknown>)?.text ?? ''), isNew: (b as Record<string, unknown>)?.new === true },
    ).filter((b: { text: string }) => b.text.trim())
    byId.set(id, bullets)
  }
  const summary = typeof raw.summary === 'string' ? raw.summary.trim() : ''

  // A bullet that brings in a list-B requirement the job's own text does not have:
  //  - mostly the job's own facts ("Led testing and commissioning of AHUs,
  //    including troubleshooting") -> an ENHANCED rewrite: it stays in the CV
  //    (the real duty is never lost) and the added terms are recorded, so the
  //    first-time review shows them in yellow;
  //  - mostly new words -> a new point, judged by the new-point rules.
  const addable = addableAt(a, level)
  for (const [id, bullets] of byId) {
    const src = entrySourceText(profile.work_experience.find((e) => e.id === id)!)
    for (const b of bullets) {
      if (b.isNew) continue
      const added = addable.filter((r) => containsTermRaw(b.text, r.term) && !containsTermRaw(src, r.term)).map((r) => r.term)
      if (!added.length) continue
      if (ownShare(b.text, src, added) >= 0.5) b.added = added
      else b.isNew = true
    }
  }

  // ---- rewritten text (not new points): the production truth checker
  const approved = new Map<string, string[]>()
  // A keywords are approved where the profile shows them; soft skills and
  // general duties the profile shows may also be named in any job. Equipment,
  // tools and standards stay with the job that shows them.
  const PORTABLE = new Set(['soft_skill', 'responsibility', 'skill', 'domain'])
  for (const r of a.requirements.filter((x) => x.group === 'A')) {
    const where = PORTABLE.has(r.kind) ? keys.map((k) => k.id) : literalLocations(profile, r.term).concat(r.location ? [r.location] : [])
    for (const loc of where) approved.set(loc, [...(approved.get(loc) ?? []), r.term])
  }
  // The level's list-B terms may sit in any job of the same field (enhanced rewrites).
  for (const k of keys) approved.set(k.id, [...(approved.get(k.id) ?? []), ...addable.map((r) => r.term)])
  approved.set('summary', [...(approved.get('summary') ?? []), ...a.requirements.filter((x) => x.group === 'A').map((x) => x.term), ...addable.map((x) => x.term)])
  const importText = jd?.trim() ? jd : a.requirements.map((r) => r.term).join('\n')
  const asOutput = {
    summary: { generated: summary },
    experience_blocks: keys.filter((k) => byId.has(k.id)).map((k) => ({ profile_experience_id: k.id, was_optimized: true, generated_bullets: byId.get(k.id)!.filter((b) => !b.isNew).map((b) => b.text) })),
    skills_order: (profile.skills ?? []).map((s) => s.id),
  }
  const v = validateGrounding(profile, asOutput, asOutput.skills_order, { jobDescription: importText, approvedTerms: approved })
  const ownerId = (o: unknown) => (typeof o === 'object' && o && 'experienceId' in o ? String((o as { experienceId: string }).experienceId) : String(o))
  const failedOwners = new Set(v.failures.filter((f) => f.severity === 'hard' && f.owner !== 'skills_order').map((f) => {
    const id = ownerId(f.owner)
    // offendingValue is user content: the lab shows it; a production log must not.
    caught.push(`${f.code}@${id === 'summary' ? 'summary' : keys.find((k) => k.id === id)?.key ?? id}${f.offendingValue ? ` "${f.offendingValue}"` : ''}`)
    return id
  }))
  // A summary that fails on one sentence loses that sentence, not everything:
  // drop each sentence carrying an offending value, keep it if 2+ sentences remain
  // and they pass the same check.
  let finalSummary = summary
  if (summary && failedOwners.has('summary')) {
    const bad = v.failures.filter((f) => f.severity === 'hard' && f.owner === 'summary').map((f) => f.offendingValue ?? '')
    const kept = summary.split(/(?<=[.!?])\s+/).filter((s) => !bad.some((x) => x && s.toLowerCase().includes(x.toLowerCase())))
    const retry = kept.join(' ')
    const ok =
      kept.length >= 2 && bad.every(Boolean) &&
      !validateGrounding(profile, { summary: { generated: retry }, experience_blocks: [], skills_order: asOutput.skills_order }, asOutput.skills_order, { jobDescription: importText, approvedTerms: approved })
        .failures.some((f) => f.severity === 'hard' && f.owner === 'summary')
    if (ok) { finalSummary = retry; failedOwners.delete('summary'); caught.push('summary_sentence_removed') }
  }
  // ---- C terms must never appear where the profile did not already have them
  const cTerms = a.requirements.filter((r) => r.group === 'C' || (r.group === 'B' && !addable.includes(r))).map((r) => r.term)
  const leaks = (text: string, source: string) => cTerms.filter((t) => containsTermRaw(text, t) && !containsTermRaw(source, t))

  // The summary too: a sentence bringing in a C term loses that sentence
  // (2+ sentences must remain), else the original summary is kept.
  const wholeProfile = [profileWide(profile), ...profile.work_experience.map(entrySourceText)].join('\n')
  if (finalSummary && !failedOwners.has('summary')) {
    const sentences = finalSummary.split(/(?<=[.!?])\s+/)
    const clean = sentences.filter((s) => !leaks(s, wholeProfile).length)
    if (clean.length < sentences.length) {
      caught.push(`c_term_in_summary "${sentences.flatMap((s) => leaks(s, wholeProfile)).join(', ')}"`)
      if (clean.length >= 2) finalSummary = clean.join(' ')
      else failedOwners.add('summary')
    }
  }
  const summaryKeptOriginal = !finalSummary || failedOwners.has('summary')
  const allTerms = a.requirements.map((r) => r.term)

  const jobs: WrittenJob[] = keys.map(({ key, id }) => {
    const e = profile.work_experience.find((x) => x.id === id)!
    const original = (e.highlights ?? []).map((t) => ({ text: t, isNew: false }))
    const written = byId.get(id)
    if (!written || !written.length) { caught.push(`no_output@${key}`); return { id, bullets: original, keptOriginal: true, droppedNew: [] } }
    const source = entrySourceText(e)
    const rewritten = written.filter((b) => !b.isNew)
    let keptOriginal = failedOwners.has(id)
    if (!keptOriginal && rewritten.some((b) => leaks(b.text, source).length)) { caught.push(`c_term_in_rewrite@${key}`); keptOriginal = true }
    // New points: must carry an addable requirement for THIS job; no numbers, no C terms, no certificates.
    // A list-B requirement may sit in any job of the same field; the analysis'
    // job is a suggestion. Still at most 3 new points per job.
    const mine = addable
    const droppedNew: string[] = []
    // A point marked new but built only from this job's own facts is a rewrite:
    // if it passes the same truth check as every rewritten bullet, it is kept as one.
    for (const b of written.filter((x) => x.isNew)) {
      if (leaks(b.text, source).length || mine.some((r) => containsTermRaw(b.text, r.term))) continue
      const probe = validateGrounding(
        profile,
        { summary: { generated: '' }, experience_blocks: [{ profile_experience_id: id, was_optimized: true, generated_bullets: [b.text] }], skills_order: asOutput.skills_order },
        asOutput.skills_order,
        { jobDescription: importText, approvedTerms: approved },
      )
      if (!probe.failures.some((f) => f.severity === 'hard' && f.owner !== 'skills_order' && f.owner !== 'summary')) b.isNew = false
    }
    const newOk = written.filter((b) => b.isNew).filter((b, i) => {
      const why =
        i >= 3 ? 'over 3 per job'
        : /\d/.test(b.text) ? 'number'
        : CERTISH.test(b.text) && !CERTISH.test(source) ? 'certificate/degree wording'
        : leaks(b.text, source).length ? `C term: ${leaks(b.text, source)[0]}`
        : !mine.some((r) => containsTermRaw(b.text, r.term)) ? 'not one of this job\'s B requirements'
        : /\b(I|my|me)\b/.test(b.text) ? 'first person'
        : written.some((o) => !o.isNew && ownShare(b.text, o.text, []) >= 0.75) ? 'repeats a line already in this job'
        : null
      if (why) { droppedNew.push(`${why}: ${b.text}`); caught.push(`new_point_dropped@${key}`) }
      return !why
    })
    if (keptOriginal) return { id, bullets: [...original, ...newOk], keptOriginal, droppedNew }
    // Keep the model's order; drop rejected new points.
    const okSet = new Set(newOk)
    const final = written.filter((b) => !b.isNew || okSet.has(b)).map((b) => ({ ...b, text: trimFiller(b.text, source, allTerms) }))
    // A line with a number is the strongest evidence in a CV ("a team of 25
    // technicians"). One the rewrite lost comes back exactly as the profile has it.
    const out = final.filter((b) => !b.isNew).map((b) => b.text).join('\n')
    const lost = original.filter((o) => numbersIn(o.text).some((n) => !hasNumber(out, n)))
    if (lost.length) caught.push(`fact_restored@${key}`)
    return { id, bullets: [...final, ...lost], keptOriginal, droppedNew }
  })

  // ---- skills: reorder only
  const names = (profile.skills ?? []).map((s) => s.name)
  const order = Array.isArray(raw.skills_order) ? (raw.skills_order as unknown[]).map(String).filter((n) => names.includes(n)) : []
  const skillsOrder = order.length === names.length && new Set(order).size === names.length ? order : names

  const finalText = summaryKeptOriginal ? profile.professional_summary ?? "" : finalSummary
  const destuffed = trimStuffedTails(jobs, finalText, names, allTerms, (id) => entrySourceText(profile.work_experience.find((e) => e.id === id)!))
  if (destuffed.cut) caught.push(`stuffed_tail_cut x${destuffed.cut}`)

  return {
    level,
    summary: finalText,
    summaryKeptOriginal,
    summaryAdded: summaryKeptOriginal ? [] : addable.map((r) => r.term).filter((t) => containsTermRaw(finalSummary, t) && !containsTermRaw(wholeProfile, t)),
    jobs: destuffed.jobs,
    skillsOrder,
    ms: Date.now() - t0,
    inputTokens: res.inputTokens,
    outputTokens: res.outputTokens,
    caught,
  }
}

/** The analysis as a JobTargetProfile, so the production match score can read it. */
export function targetFromAnalysis(a: AnalysisV3, targetTitle: string, mode: 'job_description' | 'target_title_only'): JobTargetProfile {
  const kindMap: Record<string, KeywordKind> = { licence: 'certification', experience_years: 'domain', equipment: 'skill', standard: 'tool' }
  return {
    version: 1,
    mode,
    job_title: targetTitle,
    title_variants: [],
    seniority: null,
    keywords: a.requirements.filter((r) => r.kind !== 'experience_years').map((r) => ({ term: r.term, aliases: [], importance: r.importance, kind: (kindMap[r.kind] ?? r.kind) as KeywordKind })),
    structured: null,
  }
}
