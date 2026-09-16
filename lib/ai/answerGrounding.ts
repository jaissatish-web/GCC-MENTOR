import type { CareerProfileFull } from '@/types/careerProfile'
import type { ResumeDocument } from '@/lib/resumeDocument'

/**
 * Numeric grounding for free-text answers the user will SAY in an interview.
 *
 * WHY (review finding X01, 2026-09-15). Interview Q&A and the mock interview
 * declared `grounding: 'enforced'`, but the check they passed only validated the
 * JSON shape. Twenty-five first-person answers — "I reduced rework by 30%",
 * "I led 12 engineers" — went to the user unchecked, to be memorised and repeated
 * to an employer. An invented number there is worse than on a CV: it is spoken,
 * and it is the first thing an interviewer probes.
 *
 * WHAT IT CHECKS, and what it deliberately does not. Same trust boundary as the
 * cover-letter validator (lib/ai/validateCoverLetterGrounding.ts): every NUMBER
 * in an answer must appear somewhere in the sources the model was given — the
 * Career Profile, the saved CV, the job advert, the target — or be a duration
 * derivable from the user's own job dates ("10 years"). Invented employers or
 * certifications in prose are left to the injected grounding instruction; string
 * matching entities in free prose is too fragile to enforce.
 *
 * Pure — no I/O — so scripts/verify-answer-grounding.ts can assert it directly.
 */

/** Numbers as written in prose: 1,200 -> "1200"; 3.0 -> "3"; B31.3 -> "31.3". */
export function extractNumbers(text: string): string[] {
  const matches = text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []
  return matches.map((m) => m.replace(/,/g, '').replace(/\.0+$/, ''))
}

export function collectNumbers(texts: Array<string | null | undefined>): Set<string> {
  const out = new Set<string>()
  for (const t of texts) {
    if (!t) continue
    for (const n of extractNumbers(t)) out.add(n)
  }
  return out
}

function yearsBetween(start: string | null | undefined, end: string | null | undefined, now: Date): number | null {
  if (!start) return null
  const s = new Date(start)
  const e = end ? new Date(end) : now
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e < s) return null
  return (e.getTime() - s.getTime()) / (365.25 * 24 * 3600 * 1000)
}

/**
 * Durations a candidate may truthfully state from their own dates: each job's
 * length and the whole career span, rounded down and to nearest.
 */
export function derivedExperienceYears(profile: CareerProfileFull, now: Date = new Date()): string[] {
  const out = new Set<string>()
  const add = (y: number | null) => {
    if (y === null) return
    out.add(String(Math.floor(y)))
    out.add(String(Math.round(y)))
  }
  const jobs = profile.work_experience ?? []
  for (const j of jobs) add(yearsBetween(j.start_date, j.end_date, now))
  const starts = jobs.map((j) => j.start_date).filter(Boolean).sort()
  if (starts.length > 0) add(yearsBetween(starts[0], null, now))
  return Array.from(out)
}

/** Every text field in the profile a number could legitimately come from. */
export function profileNumberSources(profile: CareerProfileFull): string[] {
  const t: Array<string | null | undefined> = [
    profile.professional_summary,
    profile.current_employer,
    profile.current_project,
    profile.current_location,
    profile.visa_status,
    profile.notice_period,
    profile.target_job_title,
    profile.target_industry,
    profile.target_company,
  ]
  for (const e of profile.work_experience ?? []) {
    t.push(e.company, e.role, e.location, e.description, e.start_date, e.end_date, ...(e.highlights ?? []))
  }
  for (const s of profile.skills ?? []) t.push(s.name)
  for (const c of profile.certifications ?? []) t.push(c.name, c.issuer, c.issue_date, c.expiry_date)
  for (const ed of profile.education ?? []) {
    t.push(ed.degree, ed.institution, ed.field_of_study)
    t.push(ed.start_year != null ? String(ed.start_year) : null, ed.end_year != null ? String(ed.end_year) : null)
  }
  for (const a of profile.additional_information ?? []) t.push(a.label, a.value)
  return t.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

/** Every text on a saved CV — the document the answers are meant to match. */
export function resumeDocumentTexts(doc: ResumeDocument): string[] {
  const t: Array<string | null | undefined> = [
    doc.header?.displayName,
    doc.header?.targetJobTitle,
    doc.header?.identityPrimary,
    doc.header?.identityContact,
    doc.header?.identityGulf,
    doc.summary,
  ]
  for (const e of doc.experience ?? []) t.push(e.entry?.role, e.companyLine, e.range, ...(e.bullets ?? []))
  for (const s of doc.skills ?? []) t.push(s.name)
  for (const c of doc.certifications ?? []) t.push(c.display)
  for (const ed of doc.education ?? []) t.push(ed.line, ed.years)
  for (const a of doc.additional ?? []) t.push(a.display)
  return t.filter((x): x is string => typeof x === 'string' && x.length > 0)
}

/** The allowed-number set for one package: profile + extra source texts + derived durations. */
export function allowedNumbersFor(
  profile: CareerProfileFull,
  extraSources: Array<string | null | undefined>,
  now: Date = new Date(),
): Set<string> {
  const allowed = collectNumbers([...profileNumberSources(profile), ...extraSources])
  for (const y of derivedExperienceYears(profile, now)) allowed.add(y)
  return allowed
}

/** Numbers in `text` that appear in none of the sources. Empty = grounded. */
export function unsourcedNumbers(text: string, allowed: Set<string>): string[] {
  return Array.from(new Set(extractNumbers(text).filter((n) => !allowed.has(n))))
}
