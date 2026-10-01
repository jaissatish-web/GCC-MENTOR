import type { CareerProfileDraft, DraftWorkExperience } from '@/types/careerProfile'
import { parseCvDate, splitRange, yearOf } from './dates'
import type { Prepass } from './prepass'

/**
 * After the model: convert, verify against the CV text, and find what is
 * missing (2026-10-01).
 *
 * The model's answer is treated as a proposal. Every fact that can be checked
 * against the CV text is checked:
 *   - dates are converted here, from the text the model copied;
 *   - email / phone / LinkedIn / date of birth must be in the CV, and the
 *     pattern pre-pass fills them when the model missed them;
 *   - a skill that does not appear in the CV at all is dropped (invented);
 *   - a company, role or school that cannot be found in the CV is kept but
 *     flagged for the user to check;
 *   - a date range in the CV that no job or qualification accounts for is a
 *     MISSING job — a "critical" problem that earns one re-read.
 *
 * Warnings carry the field path the profile editor highlights
 * ("work_experience.2.start_date"), and are safe to store: they name fields,
 * never their values.
 */

export interface ParseWarning {
  /** Field path, e.g. "email" or "work_experience.1.start_date". */
  field: string
  message: string
}

export interface CheckResult {
  draft: CareerProfileDraft
  warnings: ParseWarning[]
  /** Problems worth one more read; phrased for the model's repair note. */
  critical: string[]
}

// ------------------------------------------------------------- evidence

const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
const tokens = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1)

/** Is this value written in the CV (ignoring case, spacing and punctuation)? */
export function inText(value: unknown, normText: string, tokenSet: Set<string>, minOverlap = 0.67): boolean {
  if (typeof value !== 'string' || !value.trim()) return false
  const n = norm(value)
  if (n && normText.includes(n)) return true
  const t = tokens(value)
  if (!t.length) return false
  return t.filter((x) => tokenSet.has(x)).length / t.length >= minOverlap
}

// ------------------------------------------------------------- date ranges in the text

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const DATE_TOKEN = `(?:${MONTH}\\.?[\\s,'’\\-./]*\\d{2,4}|\\d{1,2}[/.]\\d{4}|\\d{4}[-/.]\\d{1,2}|(?:19|20)\\d{2})`
const PRESENT_TOKEN = '(?:present|current(?:ly)?|till\\s*date|till\\s*now|to\\s*date|now|ongoing|date)'
const RANGE = new RegExp(`(${DATE_TOKEN})\\s*(?:–|—|-|to|till|until|~)\\s*(${DATE_TOKEN}|${PRESENT_TOKEN})`, 'gi')

interface TextRange { line: string; section: string; start: string | null; end: string | null }

/** A section heading: short, no digits, in capitals or ending with a colon. */
const isHeading = (l: string) => l.length <= 40 && !/\d/.test(l) && (l === l.toUpperCase() && /[A-Z]/.test(l) || /:$/.test(l))

function rangesIn(text: string): TextRange[] {
  const out: TextRange[] = []
  let section = ''
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (isHeading(line)) { section = line; continue }
    for (const m of line.matchAll(RANGE)) {
      const a = parseCvDate(m[1].trim())
      const b = parseCvDate(m[2].trim())
      if (a.kind !== 'date') continue
      out.push({ line, section, start: a.value, end: b.kind === 'date' ? b.value : null })
    }
  }
  return out
}

/** Sections whose date ranges are not jobs. */
const NOT_JOBS = /project|certif|licen[cs]e|course|training|education|academic|qualification|reference|volunteer|award/i

const EDU_WORDS = /\b(b\.?\s?e|b\.?\s?tech|b\.?\s?sc|b\.?\s?com|bba|mba|mca|bca|m\.?\s?com|m\.?\s?sc|diploma|degree|bachelor|master|university|college|school|institute|board|cbse|hsc|ssc|secondary|intermediate|education|academic|qualification|gnm|bsn|bhm)\b/i

// ------------------------------------------------------------- main

export function checkDraft(input: CareerProfileDraft, text: string, pre: Prepass): CheckResult {
  const draft: CareerProfileDraft = JSON.parse(JSON.stringify(input))
  const warnings: ParseWarning[] = []
  const critical: string[] = []
  const normText = norm(text)
  const tokenSet = new Set(tokens(text))
  const textDigits = text.replace(/\D/g, '')
  const d = draft as unknown as Record<string, unknown>

  // ---- contact: the CV's own text decides
  const email = typeof draft.email === 'string' ? draft.email.trim() : ''
  if (!email || !text.toLowerCase().includes(email.toLowerCase())) {
    if (pre.emails[0]) draft.email = pre.emails[0]
    else delete d.email
  }
  const phoneDigits = typeof draft.phone === 'string' ? draft.phone.replace(/\D/g, '') : ''
  if (phoneDigits.length < 8 || !textDigits.includes(phoneDigits.slice(-8))) {
    if (pre.phones[0]) draft.phone = pre.phones[0]
    else delete d.phone
  }
  if (typeof draft.whatsapp === 'string' && !textDigits.includes(draft.whatsapp.replace(/\D/g, '').slice(-8))) delete d.whatsapp
  if (!draft.linkedin_url && pre.linkedin) draft.linkedin_url = pre.linkedin
  if (draft.linkedin_url && !normText.includes(norm(String(draft.linkedin_url).split('/in/').pop() ?? ''))) delete d.linkedin_url
  if (!draft.full_name) critical.push('full_name is missing — copy the person\'s name exactly as written at the top of the resume.')
  if (!draft.email) warnings.push({ field: 'email', message: 'No email address found in the CV.' })
  if (!draft.phone) warnings.push({ field: 'phone', message: 'No phone number found in the CV.' })

  // ---- personal details
  const dob = parseCvDate(draft.date_of_birth)
  if (dob.kind === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(dob.value)) draft.date_of_birth = dob.value
  else if (pre.dateOfBirth) draft.date_of_birth = pre.dateOfBirth
  else if (draft.date_of_birth !== undefined) {
    delete d.date_of_birth
    warnings.push({ field: 'date_of_birth', message: 'Date of birth could not be read — please enter it.' })
  }
  const ppv = parseCvDate(draft.passport_validity_date)
  if (ppv.kind === 'date') draft.passport_validity_date = ppv.value
  else delete d.passport_validity_date
  if (draft.passport_type && !/\be\.?c\.?r\b/i.test(text)) delete d.passport_type // not written: invented
  if (!draft.passport_type && pre.passportType) draft.passport_type = pre.passportType
  if (!draft.nationality && pre.nationality) draft.nationality = pre.nationality
  if (!draft.visa_status && pre.visaStatus) draft.visa_status = pre.visaStatus
  if (!draft.notice_period && pre.noticePeriod) draft.notice_period = pre.noticePeriod
  if (!draft.current_location && pre.location) draft.current_location = pre.location
  for (const k of ['visa_status', 'notice_period', 'nationality', 'current_location'] as const) {
    const v = draft[k]
    if (typeof v === 'string' && !inText(v, normText, tokenSet, 0.5)) {
      delete d[k]
      warnings.push({ field: k, message: 'Not found in the CV — removed. Add it if it applies.' })
    }
  }

  // ---- work experience
  const jobs = draft.work_experience as (DraftWorkExperience & Record<string, unknown>)[]
  jobs.forEach((j, i) => {
    // A whole range copied into start_date: split it.
    if (typeof j.start_date === 'string' && !j.end_date) {
      const r = splitRange(j.start_date)
      if (r) { j.start_date = r[0]; j.end_date = r[1] }
    }
    const s = parseCvDate(j.start_date)
    if (s.kind === 'date') j.start_date = s.value
    else {
      delete j.start_date
      warnings.push({ field: `work_experience.${i}.start_date`, message: 'Start date not found — please enter it.' })
      critical.push(`The job "${j.role ?? '?'}" at "${j.company ?? '?'}" has no readable start date — copy it exactly as written in the resume.`)
    }
    const e = parseCvDate(j.end_date)
    if (e.kind === 'date') j.end_date = e.value
    else {
      // "Present" and unreadable both store as empty (= current role); only the latter is worth a look.
      if (e.kind === 'unknown' && j.end_date) warnings.push({ field: `work_experience.${i}.end_date`, message: 'End date could not be read — please check it.' })
      delete j.end_date
    }
    if (j.start_date && j.end_date && j.end_date < j.start_date) {
      warnings.push({ field: `work_experience.${i}.end_date`, message: 'End date is before the start date — please check.' })
    }
    if (!inText(j.company, normText, tokenSet)) warnings.push({ field: `work_experience.${i}.company`, message: 'Company name not found as written in the CV — please check.' })
    if (!inText(j.role, normText, tokenSet)) warnings.push({ field: `work_experience.${i}.role`, message: 'Job title not found as written in the CV — please check.' })
    if (!j.company || !j.role) critical.push(`A job is missing its ${!j.company ? 'company' : 'job title'} — every job needs both, copied from the resume.`)
  })

  // ---- education
  draft.education.forEach((ed, i) => {
    for (const k of ['start_year', 'end_year'] as const) {
      const v = ed[k] as unknown
      const y = typeof v === 'number' ? v : yearOf(parseCvDate(v).kind === 'date' ? (parseCvDate(v) as { value: string }).value : null)
      if (y && y >= 1950 && y <= 2100) ed[k] = y
      else delete ed[k]
    }
    // One year written for a qualification is the year of PASSING ("HSC, 2002"),
    // which the model filed as the start year on 8% of qualifications in the
    // resume-lab set. Unless the CV shows it as an ongoing course.
    if (ed.start_year && !ed.end_year) {
      const ongoing = new RegExp(`${ed.start_year}\\s*(?:–|—|-|to)\\s*(?:present|current|till|ongoing|pursuing|now|date)`, 'i')
      if (!ongoing.test(text)) { ed.end_year = ed.start_year; delete ed.start_year }
    }
    if (ed.institution && !inText(ed.institution, normText, tokenSet)) warnings.push({ field: `education.${i}.institution`, message: 'Institution not found as written in the CV — please check.' })
  })

  // ---- certifications
  draft.certifications.forEach((c) => {
    for (const k of ['issue_date', 'expiry_date'] as const) {
      const p = parseCvDate(c[k])
      if (p.kind === 'date') c[k] = p.value
      else delete c[k]
    }
  })

  // ---- skills: drop invented, de-duplicate, renumber
  const seen = new Set<string>()
  const before = draft.skills.length
  draft.skills = draft.skills
    .filter((s) => typeof s.name === 'string' && s.name.trim() && inText(s.name, normText, tokenSet, 0.5))
    .filter((s) => { const k = norm(String(s.name)); if (seen.has(k)) return false; seen.add(k); return true })
    .map((s, i) => ({ ...s, name: String(s.name).trim(), sort_order: i + 1 }))
  if (before && !draft.skills.length) warnings.push({ field: 'skills', message: 'No skills could be confirmed in the CV — please add yours.' })

  // ---- coverage: a date range nothing accounts for is a missing job
  const used = (r: TextRange) =>
    jobs.some((j) => j.start_date && (j.start_date as string).slice(0, 7) === r.start!.slice(0, 7)) ||
    jobs.some((j) => j.start_date && yearOf(j.start_date as string) === yearOf(r.start) && (!r.end || !j.end_date || yearOf(j.end_date as string) === yearOf(r.end))) ||
    draft.education.some((ed) => ed.start_year === yearOf(r.start) || ed.end_year === yearOf(r.end))
  // A range the model filed elsewhere (a project list in Additional information) is accounted for.
  const elsewhere = draft.additional_information.map((a) => norm(String(a.value ?? ''))).join(' ')
  const missing = rangesIn(text).filter((r) =>
    !used(r) && !EDU_WORDS.test(r.line) && !NOT_JOBS.test(r.line) && !NOT_JOBS.test(r.section) &&
    !(elsewhere && elsewhere.includes(norm(r.line).slice(0, 30))),
  )
  if (missing.length) {
    critical.push(
      `These date ranges in the resume belong to jobs you did not return — include every job: ${missing.slice(0, 4).map((r) => `"${r.line.slice(0, 90)}"`).join('; ')}`,
    )
  }
  if (!jobs.length && /experience|employment|work history|career history/i.test(text) && rangesIn(text).length) {
    critical.push('work_experience is empty but the resume has an experience section — return every job.')
  }

  return { draft, warnings, critical }
}
