/**
 * Field-by-field scoring of a parsed CV against its true answer
 * (scripts/resume-lab/generate-fixtures.mjs writes both).
 *
 * Deliberately forgiving on FORMAT and strict on FACTS: "Al Futtaim Group" vs
 * "AL FUTTAIM GROUP" is right, a date one month off is wrong, a value the CV
 * does not contain is counted as invented.
 */

export interface Truth {
  full_name: string
  email: string
  phone: string
  nationality: string
  date_of_birth: string
  passport_type: string | null
  visa_status: string | null
  notice_period: string | null
  current_location: string
  linkedin_url: string | null
  work_experience: { company: string; role: string; start_date: string; end_date: string | null; location: string }[]
  education: { degree: string; institution: string; end_year: number }[]
  skills: string[]
  certifications: string[]
}

type Draft = Record<string, any>

export const norm = (s: unknown) => (typeof s === 'string' ? s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '') : '')
const digits = (s: unknown) => (typeof s === 'string' ? s.replace(/\D/g, '') : '')
const looseEq = (a: unknown, b: unknown) => {
  const x = norm(a), y = norm(b)
  return !!x && !!y && (x === y || x.includes(y) || y.includes(x))
}
const tokens = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 1))
const tokenOverlap = (a: string, b: string) => {
  const A = tokens(a), B = tokens(b)
  if (!A.size || !B.size) return 0
  let n = 0
  for (const t of A) if (B.has(t)) n++
  return n / Math.min(A.size, B.size)
}
const sameCompany = (a: unknown, b: unknown) => typeof a === 'string' && typeof b === 'string' && (looseEq(a, b) || tokenOverlap(a, b) >= 0.67)
const ym = (s: unknown) => (typeof s === 'string' ? (s.match(/^(\d{4})(?:-(\d{2}))?/) ?? []) : [])
// Scored as STORED: a value normalizeProfileDate cannot read is saved as null —
// so "To Date" as an end date is right (null = current role) and "28-Apr-1984"
// as a birth date is lost.
function sameDate(truth: string | null, pred: unknown): boolean {
  if (typeof pred === 'string' && !/^\d{4}/.test(pred.trim())) pred = null
  if (truth === null) return pred === null || pred === undefined || pred === ''
  const [, ty, tm] = ym(truth)
  const [, py, pm] = ym(pred)
  if (!py || ty !== py) return false
  return tm ? pm === tm : true
}

export interface CvScore {
  fields: Record<string, boolean>
  invented: string[]
  jobs: { total: number; found: number; extra: number; role: number; start: number; end: number; location: number }
  education: { total: number; found: number; year: number }
  skills: { total: number; found: number }
  certs: { total: number; found: number }
  saveable: boolean
  perfect: boolean
}

export function scoreCv(truth: Truth, draft: Draft | null): CvScore {
  const d = draft ?? {}
  const f: Record<string, boolean> = {}
  f.full_name = looseEq(truth.full_name, d.full_name)
  f.email = typeof d.email === 'string' && d.email.trim().toLowerCase() === truth.email.toLowerCase()
  const td = digits(truth.phone), pd = digits(d.phone)
  f.phone = pd.length >= 8 && (td === pd || td.endsWith(pd) || pd.endsWith(td))
  f.nationality = looseEq(truth.nationality, d.nationality)
  f.date_of_birth = d.date_of_birth === truth.date_of_birth
  f.current_location = looseEq(truth.current_location.split(',')[0], d.current_location)
  if (truth.linkedin_url) f.linkedin_url = typeof d.linkedin_url === 'string' && norm(d.linkedin_url).includes(norm(truth.linkedin_url.split('/in/')[1]))
  if (truth.passport_type) f.passport_type = d.passport_type === truth.passport_type
  if (truth.visa_status) f.visa_status = looseEq(truth.visa_status, d.visa_status) || tokenOverlap(truth.visa_status, String(d.visa_status ?? '')) >= 0.5
  if (truth.notice_period) f.notice_period = looseEq(truth.notice_period, d.notice_period) || digits(truth.notice_period) !== '' && digits(truth.notice_period) === digits(d.notice_period)

  // Invented: a value for a field the CV does not state.
  const invented: string[] = []
  if (!truth.passport_type && d.passport_type) invented.push('passport_type')
  if (!truth.visa_status && d.visa_status) invented.push('visa_status')
  if (!truth.notice_period && d.notice_period) invented.push('notice_period')
  if (!truth.linkedin_url && d.linkedin_url) invented.push('linkedin_url')

  const predJobs: Draft[] = Array.isArray(d.work_experience) ? d.work_experience : []
  const used = new Set<number>()
  const jobs = { total: truth.work_experience.length, found: 0, extra: 0, role: 0, start: 0, end: 0, location: 0 }
  for (const tj of truth.work_experience) {
    const i = predJobs.findIndex((pj, k) => !used.has(k) && sameCompany(tj.company, pj.company))
    if (i < 0) continue
    used.add(i)
    const pj = predJobs[i]
    jobs.found++
    if (looseEq(tj.role, pj.role)) jobs.role++
    if (sameDate(tj.start_date, pj.start_date)) jobs.start++
    if (sameDate(tj.end_date, pj.end_date)) jobs.end++
    if (looseEq(tj.location.split(',')[0], pj.location)) jobs.location++
  }
  jobs.extra = predJobs.length - used.size

  const predEdu: Draft[] = Array.isArray(d.education) ? d.education : []
  const education = { total: truth.education.length, found: 0, year: 0 }
  const usedE = new Set<number>()
  for (const te of truth.education) {
    const i = predEdu.findIndex((pe, k) => !usedE.has(k) && (looseEq(te.institution, pe.institution) || looseEq(te.degree, pe.degree)))
    if (i < 0) continue
    usedE.add(i)
    education.found++
    if (Number(predEdu[i].end_year) === te.end_year) education.year++
  }

  const predSkills: string[] = (Array.isArray(d.skills) ? d.skills : []).map((s: Draft) => String(s?.name ?? ''))
  // A spoken language in the skills list ("Arabic (Basic)") is fairly read as a language instead.
  const truthSkills = truth.skills.filter((s) => !/^(arabic|english|hindi|urdu)\b/i.test(s))
  const skills = { total: truthSkills.length, found: truthSkills.filter((s) => predSkills.some((p) => looseEq(s, p))).length }
  const predCerts: string[] = (Array.isArray(d.certifications) ? d.certifications : []).map((c: Draft) => String(c?.name ?? ''))
  const certs = { total: truth.certifications.length, found: truth.certifications.filter((c) => predCerts.some((p) => looseEq(c, p) || tokenOverlap(c, p) >= 0.6)).length }

  // Would PUT /api/profile accept it? name/phone/email, and every job needs
  // company + role + a start date normalizeProfileDate can read.
  const readable = (v: unknown) => typeof v === 'string' && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(v.trim())
  const saveable = !!d.full_name && !!d.email && !!d.phone && predJobs.every((j) => j.company && j.role && readable(j.start_date))

  const perfect =
    Object.values(f).every(Boolean) && invented.length === 0 &&
    jobs.found === jobs.total && jobs.extra === 0 && jobs.role === jobs.total && jobs.start === jobs.total && jobs.end === jobs.total &&
    education.found === education.total && skills.found >= skills.total * 0.9 && certs.found === certs.total

  return { fields: f, invented, jobs, education, skills, certs, saveable, perfect }
}
