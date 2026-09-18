/**
 * Claim checks for generated PROSE — cover letters, interview answers, mock
 * interview model answers (2026-09-18).
 *
 * WHY THIS EXISTS. The resume optimizer has a strict gate (lib/optimizer/
 * qualityGate.ts). The prose services had none: the cover-letter validator
 * checked JSON shape and flagged numbers, and left claims to the prompt. The
 * audit that day found a letter claiming "technical specification packages",
 * "system specification" and "design" experience — three things the SAME
 * package's job analysis listed as gaps, and words the CV never used — plus
 * "nearly 13 years" for a 15-year career.
 *
 * WHAT IT CHECKS, all deterministic and cheap:
 *   gap_claim         — a job requirement the analysis marked MISSING is named
 *                       in the prose, and the profile never states it.
 *   gap_word          — a distinctive word of a missing requirement ("design",
 *                       "specification", "sizing") appears, and no word of that
 *                       family appears anywhere in the profile. Catches the
 *                       paraphrase the exact-term check misses.
 *   wrong_years       — "N years of experience" that the dated roles do not
 *                       support (over- AND under-statement: both are false).
 *   unsupported_grade — a banned hype word or a grading word ("expert",
 *                       "proven", "extensive") the profile never uses.
 *
 * Entity matching on free prose is fragile in general, which is why the old
 * validator avoided it. These checks are not general entity matching: gap
 * terms are KNOWN strings from the job analysis, and a word that is part of a
 * missing requirement AND absent from the whole profile cannot be a supported
 * claim, whatever sentence carries it.
 */

import type { CareerProfileFull } from '@/types/careerProfile'
import { BANNED_WORDS, INTENSIFIERS } from '@/lib/optimizer/qualityGate'
import { containsTermRaw, stem, tokenize } from '@/lib/optimizer/text'

export type ProseClaimCode = 'gap_claim' | 'gap_word' | 'wrong_years' | 'unsupported_grade'

export interface ProseClaimIssue {
  code: ProseClaimCode
  /** hard = the sentence must not ship; soft = ask for a rewrite, ship if it persists. */
  severity: 'hard' | 'soft'
  detail: string
  /** The matched words. Retry prompts and sentence removal only; never logged. */
  offendingValue: string
}

export interface GapTerm {
  term: string
  aliases?: string[]
  kind?: string
}

/** Every word the candidate's own profile contains — the evidence a claim must rest on. */
export function profileEvidenceText(profile: CareerProfileFull): string {
  const parts: Array<string | null | undefined> = [
    profile.professional_summary,
    profile.target_job_title,
    profile.current_employer,
    profile.current_project,
  ]
  for (const e of profile.work_experience ?? []) parts.push(e.role, e.company, e.location, e.description, ...(e.highlights ?? []))
  for (const s of profile.skills ?? []) parts.push(s.name)
  for (const c of profile.certifications ?? []) parts.push(c.name, c.issuer)
  for (const ed of profile.education ?? []) parts.push(ed.degree, ed.field_of_study, ed.institution)
  for (const a of profile.additional_information ?? []) parts.push(a.label, a.value)
  return parts.filter(Boolean).join('\n')
}

function monthIndex(d: string | null | undefined, fallbackNow: boolean): number | null {
  if (!d || /present|current|now/i.test(d)) return fallbackNow ? new Date().getFullYear() * 12 + new Date().getMonth() : null
  const m = /^(\d{4})(?:-(\d{1,2}))?/.exec(d.trim())
  if (!m) return null
  return Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0)
}

/**
 * Whole years of experience across the dated roles, overlaps counted once.
 * Computed here so no model ever does date arithmetic (it said "nearly 13"
 * for a career that runs Aug 2011 – present).
 */
export function totalExperienceYears(profile: CareerProfileFull): number | null {
  const spans: Array<[number, number]> = []
  for (const e of profile.work_experience ?? []) {
    const s = monthIndex(e.start_date, false)
    const end = monthIndex(e.end_date, true)
    if (s === null || end === null || end < s) continue
    spans.push([s, end])
  }
  if (spans.length === 0) return null
  spans.sort((a, b) => a[0] - b[0])
  let months = 0
  let [cs, ce] = spans[0]
  for (const [s, e] of spans.slice(1)) {
    if (s <= ce + 1) ce = Math.max(ce, e)
    else {
      months += ce - cs + 1
      ;[cs, ce] = [s, e]
    }
  }
  months += ce - cs + 1
  return Math.floor(months / 12)
}

/** Words too broad to be a claim on their own, even inside a missing requirement. */
const GENERIC = new Set(
  [
    'instrumentation', 'control', 'controls', 'system', 'systems', 'engineering', 'engineer', 'management', 'process',
    'processes', 'data', 'sheet', 'sheets', 'work', 'team', 'industry', 'standard', 'standards', 'knowledge',
    'experience', 'project', 'projects', 'various', 'international', 'deep', 'strong', 'technical', 'ability',
    'skills', 'skill', 'support', 'review', 'develop', 'development', 'quality', 'safety', 'service', 'services',
    'document', 'documents', 'selection', 'phase', 'phases', 'scope', 'design team', 'related', 'relevant', 'field',
  ].map((w) => stem(w)),
)

function familyIn(stemSet: Set<string>, s: string): boolean {
  if (stemSet.has(s)) return true
  // "specification"/"specify"/"specified": a shared 6-letter root is one family.
  if (s.length >= 6) for (const x of stemSet) if (x.length >= 6 && x.slice(0, 6) === s.slice(0, 6)) return true
  return false
}

const HONEST_GAP =
  /\b(not|never|no direct|no hands-on|haven['’]t|hasn['’]t|didn['’]t|without|limited|keen to|eager to|looking to|want to|would welcome|would like to|to grow into|to develop|to learn|to build (my|on)|next step)\b/i

const YEARS_CLAIM = /\b(?:(nearly|almost|close to|over|more than|around|about|approximately)\s+)?(\d{1,2})\s*(\+)?\s*(?:years|yrs)\b/gi

export function checkProseClaims(input: {
  text: string
  evidence: string
  gaps?: GapTerm[]
  totalYears?: number | null
}): ProseClaimIssue[] {
  const { text, evidence } = input
  const issues: ProseClaimIssue[] = []
  if (!text.trim()) return issues

  const evidenceStems = new Set(tokenize(evidence).map(stem))
  // A sentence that DENIES a gap ("I have not performed sizing from scratch")
  // or looks forward to it ("keen to grow into I&C design") is the honest
  // answer, not a claim. Only the remaining sentences are checked for gaps.
  // Deliberately narrow: "although" and "however" do not exempt, because a
  // false claim sits beside them as easily as a true one.
  const claimText = splitSentences(text)
    .filter((s) => !HONEST_GAP.test(s))
    .join(' ')
  const textStems = new Set(tokenize(claimText).map(stem))

  for (const g of input.gaps ?? []) {
    if (g.kind === 'soft_skill') continue
    const aliases = g.aliases ?? []
    if (containsTermRaw(claimText, g.term, aliases) && !containsTermRaw(evidence, g.term, aliases)) {
      issues.push({ code: 'gap_claim', severity: 'hard', detail: 'Claims a job requirement the profile does not support.', offendingValue: g.term })
      continue
    }
    for (const token of tokenize(g.term)) {
      if (token.length < 4 || !/^[a-z]+$/.test(token)) continue
      const s = stem(token)
      if (GENERIC.has(s)) continue
      if (familyIn(textStems, s) && !familyIn(evidenceStems, s)) {
        const word = tokenize(claimText).find((t) => {
          const ts = stem(t)
          return ts === s || (ts.length >= 6 && s.length >= 6 && ts.slice(0, 6) === s.slice(0, 6))
        })
        issues.push({
          code: 'gap_word',
          severity: 'hard',
          detail: `Uses "${word ?? token}", part of a requirement the profile does not show.`,
          offendingValue: word ?? token,
        })
      }
    }
  }

  if (input.totalYears != null) {
    for (const sentence of splitSentences(text)) {
      if (!/\b(experience|career|years of|in the field|in the industry)\b/i.test(sentence)) continue
      for (const m of sentence.matchAll(YEARS_CLAIM)) {
        const qualifier = (m[1] ?? '').toLowerCase()
        const n = Number(m[2])
        const statedInProfile = new RegExp(`\\b${n}\\s*\\+?\\s*(years|yrs)\\b`, 'i').test(evidence)
        if (statedInProfile) continue
        const total = input.totalYears
        // The qualifier decides what is true: "over 10" and "10+" are true of
        // 14 years, "nearly 13" is not (it means just under 13), a bare "13" is not.
        const ok =
          /^(over|more than)$/.test(qualifier) || m[3]
            ? n <= total
            : /^(nearly|almost|close to)$/.test(qualifier)
              ? n === total + 1
              : /^(around|about|approximately)$/.test(qualifier)
                ? Math.abs(n - total) <= 1
                : n === total
        if (!ok) {
          issues.push({
            code: 'wrong_years',
            severity: 'hard',
            detail: `States ${n} years; the dated roles add up to ${input.totalYears}.`,
            offendingValue: m[0].trim(),
          })
        }
      }
    }
  }

  for (const w of [...BANNED_WORDS, ...INTENSIFIERS]) {
    const re = new RegExp(`\\b${w.replace(/[- ]/g, '[- ]')}\\b`, 'i')
    if (re.test(text) && !re.test(evidence)) {
      issues.push({ code: 'unsupported_grade', severity: 'soft', detail: 'Grades the candidate with a word the profile never uses.', offendingValue: w })
    }
  }

  // One issue per offending value.
  const seen = new Set<string>()
  return issues.filter((i) => {
    const k = `${i.code}:${i.offendingValue.toLowerCase()}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? []
}

/**
 * Drop every sentence that carries a hard issue, judged by re-running the same
 * checks on that sentence alone. The last resort after a corrective retry: a
 * shorter true paragraph beats a failed request the user waited ninety seconds
 * for, and beats a false sentence.
 */
export function removeClaimSentences(
  text: string,
  ctx: { evidence: string; gaps?: GapTerm[]; totalYears?: number | null },
): string {
  return splitSentences(text)
    .filter((sentence) => !checkProseClaims({ ...ctx, text: sentence }).some((i) => i.severity === 'hard'))
    .join(' ')
}

/** Missing requirements from a package's stored job analysis (match_report), with aliases. */
export function gapTermsFromMatchReport(matchReport: unknown): GapTerm[] {
  const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
  if (!isObj(matchReport) || !Array.isArray(matchReport.gaps)) return []
  const target = isObj(matchReport.target) ? matchReport.target : null
  const keywords = target && Array.isArray(target.keywords) ? (target.keywords as Array<Record<string, unknown>>) : []
  return (matchReport.gaps as Array<Record<string, unknown>>)
    .filter((g) => typeof g.term === 'string')
    .map((g) => {
      const kw = keywords.find((k) => k.term === g.term)
      return {
        term: g.term as string,
        kind: typeof g.kind === 'string' ? g.kind : undefined,
        aliases: kw && Array.isArray(kw.aliases) ? (kw.aliases as unknown[]).filter((a): a is string => typeof a === 'string') : [],
      }
    })
}

/**
 * The facts block for prompts that write answers the candidate will SAY
 * (interview Q&A, mock interview model answers). Same numbers the checks use.
 */
export function renderAnswerFacts(totalYears: number | null, gaps: GapTerm[]): string {
  const lines: string[] = [
    '## FACTS YOU MUST KEEP TO',
    'Every answer is spoken by the candidate to an interviewer who is holding their CV. Only facts in the profile or CV may appear.',
    'When a point needs a specific story the profile does not contain, write a placeholder the candidate fills in, e.g. "[your example: a time you ...]". Never invent an event, a place, a project detail or a method.',
  ]
  if (totalYears !== null) lines.push(`Total professional experience: ${totalYears} years (computed from the dated roles). Use exactly this figure, never your own.`)
  const hardGaps = gaps.filter((g) => g.kind !== 'soft_skill').map((g) => g.term)
  if (hardGaps.length > 0) {
    lines.push(
      'REQUIREMENTS THE CANDIDATE DOES NOT MEET (the job asks for them; the profile shows none):',
      ...hardGaps.map((g) => `- ${g}`),
      'For these, the model answer says so plainly, gives the closest real experience from the profile, and says how the candidate would get up to speed. Never claim them.',
    )
  }
  return lines.join('\n')
}

/** Shown in place of an answer whose every sentence claimed a missing requirement. */
export const HONEST_GAP_ANSWER =
  'Your CV does not show direct experience of this. Say so plainly, then give the closest thing you have done ([your example from your own roles]), and finish with how you would get up to speed quickly.'

/** Clean an answer; if too little true text survives, coach honesty instead. */
export function groundAnswer(answer: string, ctx: { evidence: string; gaps?: GapTerm[]; totalYears?: number | null }): { text: string; changed: boolean } {
  const hardBefore = checkProseClaims({ ...ctx, text: answer }).some((i) => i.severity === 'hard')
  if (!hardBefore) return { text: answer, changed: false }
  const cleaned = removeClaimSentences(answer, ctx).trim()
  const words = (cleaned.match(/[A-Za-z]+/g) ?? []).length
  return { text: words >= 12 ? cleaned : HONEST_GAP_ANSWER, changed: true }
}

/**
 * Mock interview: the CANDIDATE'S typed answer claims something their CV does
 * not show. That is the single most useful thing interview practice can catch
 * — an interviewer holding the CV will probe it (2026-09-18 audit: an answer
 * claiming HAZOP chairing, SIS design and valve sizing scored 3 for being
 * "off-topic" and was never called out). The flag rides at the start of the
 * feedback text under this fixed prefix, so the final report can collect it
 * without a schema change.
 */
export const NOT_IN_CV_PREFIX = 'Not in your CV:'

export function unsupportedAnswerClaims(answer: string, ctx: { evidence: string; gaps?: GapTerm[]; totalYears?: number | null }): string[] {
  return [...new Set(checkProseClaims({ ...ctx, text: answer }).filter((i) => i.severity === 'hard').map((i) => i.offendingValue))]
}

export function notInCvFeedback(claims: string[], feedback: string): string {
  if (claims.length === 0) return feedback
  const list = claims.slice(0, 4).map((c) => `"${c}"`).join(', ')
  return `${NOT_IN_CV_PREFIX} you claimed ${list}, which your CV does not show. An interviewer holding your CV will ask you to prove it — only claim what you can back up with a real example. ${feedback}`
}
