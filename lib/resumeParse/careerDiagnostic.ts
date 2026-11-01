import type { ImportReview } from './importReview'
import type { ReviewCheck } from './reviewChecks'
import { HEADLINE_CATEGORY, HEADLINE_LABEL } from '@/lib/resumeHeadline'
import { validProfileEmail, validProfilePhone, profileTextPresent } from '@/lib/profileFieldValidity'

/** A read-only projection: accepts saved profiles, extraction drafts and editor projections. */
export interface DiagnosticProfile {
  full_name?: string | null
  email?: string | null
  phone?: string | null
  current_location?: string | null
  professional_summary?: string | null
  professional_headline?: string | null
  target_job_title?: string | null
  target_country?: string | null
  work_experience: Array<{ company?: string | null; role?: string | null; start_date?: string | null; end_date?: string | null; end_date_unconfirmed?: boolean; description?: string | null; highlights?: string[] | string | null }>
  skills: Array<{ name?: string | null }>
  education: Array<{ degree?: string | null; institution?: string | null; start_year?: number | string | null; end_year?: number | string | null }>
  certifications: Array<{ name?: string | null; issuer?: string | null }>
  additional_information?: Array<{ label?: string | null; value?: string | null; category_name?: string | null; show_on_resume?: boolean | null }>
}
export type FindingKind = 'extraction_failure' | 'machine_readability' | 'missing_unclear' | 'recruiter_readability' | 'writing'
export interface CareerFinding {
  id: string; section: string; field: string; kind: FindingKind
  severity: 'attention' | 'review' | 'suggestion'
  title: string; detected: string; why: string; evidence?: string; correction: string
  /** Historical extraction repair is distinct from user confirmation. */
  repaired?: boolean
}
export interface FieldCoverage { id: string; title: string; captured: number; applicable: number; fields: string[]; rule: string }
export type Profession = 'neutral' | 'engineering' | 'healthcare' | 'finance' | 'technology' | 'driving' | 'education' | 'hospitality' | 'sales' | 'management'
export const PROFESSION_LABELS: Record<Profession, string> = {
  neutral: 'General / another profession', engineering: 'Engineering & technical trades', healthcare: 'Healthcare', finance: 'Accounting & finance', technology: 'Software & IT', driving: 'Driving & logistics', education: 'Teaching & academic', hospitality: 'Hospitality', sales: 'Sales & marketing', management: 'Management & administration',
}
const present = (v: unknown) => profileTextPresent(typeof v === 'string' ? v : v == null ? '' : String(v))
export function diagnosticSection(field: string): string {
  if (/^work_experience/.test(field)) return 'experience'
  if (/^education/.test(field)) return 'education'
  if (/^certifications/.test(field)) return 'training'
  if (/^skills/.test(field)) return 'skills'
  if (/professional_summary/.test(field)) return 'summary'
  if (/^(full_name|phone|email|current_location|linkedin_url|date_of_birth)/.test(field)) return 'contact'
  return 'projects'
}
export function inferProfession(title: string): Profession {
  if (/\b(nurs\w*|doctor|physician|clinical|dentist|pharmacist|medical)\b/i.test(title)) return 'healthcare'
  if (/\b(account\w*|audit\w*|finance|financial|bookkeep\w*)\b/i.test(title)) return 'finance'
  if (/\b(software|developer|programmer|data scientist|IT|cyber\w*|web|devops)\b/i.test(title)) return 'technology'
  if (/\b(driver|chauffeur|logistics|truck|delivery)\b/i.test(title)) return 'driving'
  if (/\b(teacher|lecturer|professor|educator|academic)\b/i.test(title)) return 'education'
  if (/\b(chef|hospitality|hotel|waiter|housekeep\w*|restaurant)\b/i.test(title)) return 'hospitality'
  if (/\b(sales|marketing|brand|advertising)\b/i.test(title)) return 'sales'
  if (/\b(engineer|technician|electrician|instrument\w*|mechanic|welder|commissioning)\b/i.test(title)) return 'engineering'
  if (/\b(manager|director|executive|administrator|HR|supervisor)\b/i.test(title)) return 'management'
  return 'neutral'
}
export const PROFESSION_QUESTIONS: Record<Profession, Array<{ section: string; question: string }>> = {
  neutral: [{ section: 'skills', question: 'Which skills or practical training best represent the work you can do?' }],
  engineering: [{ section: 'experience', question: 'Are the systems, equipment and actual scope of your work clear for each role?' }, { section: 'projects', question: 'Would a real project example help explain your contribution?' }],
  healthcare: [{ section: 'experience', question: 'Have you described your clinical specialty and the care you actually provided?' }, { section: 'licences', question: 'Do you hold a professional registration you want to record? Add only your actual qualification and status.' }],
  finance: [{ section: 'skills', question: 'Which accounting systems, reporting or audit tasks have you actually used?' }, { section: 'training', question: 'Do you hold a relevant finance qualification that is missing here?' }],
  technology: [{ section: 'skills', question: 'Which languages, platforms and tools have you actually used?' }, { section: 'projects', question: 'Do you have projects or portfolio links showing your own contribution?' }],
  driving: [{ section: 'licences', question: 'Would you like to record the licence categories and vehicles you are actually qualified to drive?' }, { section: 'training', question: 'Have you completed relevant safety or transport training?' }],
  education: [{ section: 'experience', question: 'Are the subjects, learner groups and teaching work you delivered clear?' }, { section: 'research', question: 'Do you have relevant academic projects or publications to include?' }],
  hospitality: [{ section: 'experience', question: 'Are your service area, actual duties and guest-facing experience clear?' }, { section: 'languages', question: 'Which languages do you use, and what level can you honestly describe?' }],
  sales: [{ section: 'experience', question: 'Are the products, customers and responsibilities from your actual experience clear?' }],
  management: [{ section: 'experience', question: 'Does your experience explain your actual responsibilities, team scope and decisions?' }],
}
function monthNumber(value?: string | null): number | null {
  const m = value?.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (!m || Number(m[2]) < 1 || Number(m[2]) > 12) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
    const date = new Date(`${value}T00:00:00Z`)
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null
  }
  return Number(m[1]) * 12 + Number(m[2]) - 1
}
export function buildCareerDiagnostic(profile: DiagnosticProfile, review: ImportReview, checks: ReviewCheck[] = []) {
  const rows = profile.additional_information ?? []
  const ownTitle = profile.professional_headline?.trim() || rows.find(row => row.category_name === HEADLINE_CATEGORY && row.label === HEADLINE_LABEL)?.value?.trim()
  // A target title describes intent; never present it as extracted employment.
  const title = ownTitle || profile.work_experience.find(job => present(job.role))?.role?.trim() || ''
  const coverage: FieldCoverage[] = []
  const addCoverage = (id: string, title: string, fields: Array<[string, boolean]>, rule: string) => coverage.push({ id, title, captured: fields.filter(([, ok]) => ok).length, applicable: fields.length, fields: fields.map(([name]) => name), rule })
  addCoverage('contact', 'Personal & contact', [['Name', present(profile.full_name)], ['Email format', validProfileEmail(profile.email ?? '')], ['Phone format', validProfilePhone(profile.phone ?? '')], ['Current location', present(profile.current_location)]], 'Four recorded contact fields. Email and phone require a usable format; this is not identity verification.')
  addCoverage('summary', 'Professional summary', [['Summary', present(profile.professional_summary)]], 'One optional summary field; missing does not prevent saving.')
  if (profile.work_experience.length) addCoverage('experience', 'Employment', profile.work_experience.flatMap((job, i): Array<[string, boolean]> => [
    [`Role ${i + 1}: employer`, present(job.company)], [`Role ${i + 1}: title`, present(job.role)], [`Role ${i + 1}: start`, monthNumber(job.start_date) !== null || /^\d{4}$/.test(job.start_date ?? '')],
    [`Role ${i + 1}: end/current`, present(job.end_date) || job.end_date_unconfirmed === false], [`Role ${i + 1}: responsibilities`, present(job.description) || (Array.isArray(job.highlights) ? job.highlights.some(present) : present(job.highlights))],
  ]), 'Five fields per recorded role. No employment requirement for graduates or people without recorded jobs. A blank end date alone never proves a role is current.')
  addCoverage('skills', 'Skills', [['At least one named skill', profile.skills.some(row => present(row.name))]], 'One coverage check for recorded skills; quantity is not proficiency.')
  if (profile.education.length) addCoverage('education', 'Education', profile.education.flatMap((edu, i): Array<[string, boolean]> => [[`Qualification ${i + 1}: name`, present(edu.degree)], [`Qualification ${i + 1}: institution`, present(edu.institution)]]), 'Two fields per recorded qualification. No degree or education level is assumed mandatory.')
  if (profile.certifications.length) addCoverage('training', 'Certifications & training', profile.certifications.flatMap((cert, i): Array<[string, boolean]> => [[`Certificate ${i + 1}: name`, present(cert.name)], [`Certificate ${i + 1}: issuer`, present(cert.issuer)]]), 'Two descriptive fields per recorded certificate. An issuer is useful context, not a requirement to hold a certificate.')
  const projects = rows.filter(row => /project|portfolio/i.test(row.category_name ?? '') && present(row.value))
  if (projects.length) addCoverage('projects', 'Projects & portfolio', projects.flatMap((row, i): Array<[string, boolean]> => [[`Project ${i + 1}: label`, present(row.label)], [`Project ${i + 1}: details`, present(row.value)]]), 'Two descriptive fields per recorded project item; empty optional projects are omitted.')
  const findings: CareerFinding[] = checks.filter(check => check.status !== 'passed').map(check => ({
    id: check.id, section: diagnosticSection(check.field), field: check.field, kind: check.status === 'optional' ? 'writing' : 'missing_unclear', severity: check.status === 'optional' ? 'suggestion' : !check.value.trim() || !check.confirmable ? 'attention' : 'review', title: check.title, detected: check.reason,
    why: check.status === 'optional' ? 'Clearer wording can help a recruiter understand the same facts. This is optional.' : 'Missing or ambiguous information can make your experience harder to understand. Check the source before changing a fact.',
    evidence: check.value || undefined, correction: check.status === 'optional' ? 'Accept only if the suggested wording preserves your facts, or keep your original.' : 'Confirm the source or enter the correct information in the existing profile fields.',
  }))
  // A recorded recovery is evidence of a first-reading miss. It does not establish an employer ATS failure.
  review.changes.filter(change => change.kind === 'format' && change.before === 'Missed in the first reading').forEach(change => findings.push({ id: `recovered:${change.id}`, section: diagnosticSection(change.field), field: change.field, kind: 'extraction_failure', severity: 'review', title: `${change.label}: recovered after first reading`, detected: change.reason, why: 'Our first reading missed a value that the later source-text check recovered. Verify the recovered value.', evidence: change.after, correction: 'Compare this value with your source before confirming.', repaired: true }))
  const timeline = profile.work_experience.map((job, index) => {
    const start = monthNumber(job.start_date), end = monthNumber(job.end_date)
    const dates = `${job.start_date || 'Start not recorded'} → ${job.end_date || (job.end_date_unconfirmed === false ? 'Current (recorded)' : 'End/current status not confirmed')}`
    return { index, employer: job.company?.trim() || 'Employer not recorded', role: job.role?.trim() || 'Role not recorded', dates, months: start !== null && end !== null && end >= start ? end - start : null, start, end }
  })
  timeline.forEach((job, i) => timeline.slice(i + 1).forEach(other => {
    if (job.start === null || job.end === null || other.start === null || other.end === null || job.end < job.start || other.end < other.start) return
    if (Math.max(job.start, other.start) < Math.min(job.end, other.end)) findings.push({ id: `overlap:${job.index}:${other.index}`, section: 'experience', field: `work_experience.${job.index}.start_date`, kind: 'missing_unclear', severity: 'review', title: 'Possible concurrent roles', detected: `${job.role} at ${job.employer} and ${other.role} at ${other.employer} have overlapping recorded months.`, why: 'Concurrent, freelance or part-time work can be valid. Verify dates and explain the arrangement only if needed.', evidence: `${job.dates}; ${other.dates}`, correction: 'Keep accurate overlapping dates. Correct dates only when the recorded value is wrong.' })
  }))
  // Gaps are advisory only. Any unresolved/year-only boundary could cover an
  // apparent interval, so withhold every gap until the entire recorded timeline
  // has month-precision boundaries or an explicitly recorded current status.
  const intervals = timeline.map(job => ({ ...job, effectiveEnd: job.end ?? (profile.work_experience[job.index].end_date_unconfirmed === false && !profile.work_experience[job.index].end_date ? Infinity : null) }))
  const completeTimeline = intervals.length > 1 && intervals.every(job => job.start !== null && job.effectiveEnd !== null && job.effectiveEnd >= job.start)
  if (completeTimeline) {
    const ordered = [...intervals].sort((a, b) => a.start! - b.start!)
    let coveredThrough = ordered[0].effectiveEnd!
    let boundaryRole = ordered[0]
    for (const next of ordered.slice(1)) {
      // Adjacent employment months leave no known unrecorded whole month.
      if (next.start! > coveredThrough + 1) {
        const previousEnd = profile.work_experience[boundaryRole.index].end_date!
        const nextStart = profile.work_experience[next.index].start_date!
        findings.push({ id: `timeline-gap:${boundaryRole.index}:${next.index}`, section: 'experience', field: `work_experience.${next.index}.start_date`, kind: 'missing_unclear', severity: 'review', title: 'Possible unrecorded time between roles', detected: `The recorded timeline has no role covering the whole months between ${previousEnd} and ${nextStart}.`, why: 'Study, caregiving, a career break, freelance work or other activity can explain this time. Continuous employment is not required, and this is not an error or an ATS decision.', evidence: `Previous recorded end: ${previousEnd}; next recorded start: ${nextStart}.`, correction: 'Verify the recorded dates. Add a truthful explanation or relevant activity only if useful; keeping this interval is valid.' })
      }
      if (next.effectiveEnd! > coveredThrough) { coveredThrough = next.effectiveEnd!; boundaryRole = next }
    }
  }
  return { title, profession: inferProfession(title), location: profile.current_location?.trim() || '', targetCountry: profile.target_country?.trim() || '', coverage, timeline, findings, snapshot: { employers: new Set(profile.work_experience.map(row => row.company?.trim()).filter(Boolean)).size, roles: profile.work_experience.length, skills: profile.skills.filter(row => present(row.name)).length, qualifications: profile.education.filter(row => present(row.degree)).length, certificates: profile.certifications.filter(row => present(row.name)).length, projects: projects.length } }
}
export const FINDING_LABELS: Record<FindingKind, string> = {
  extraction_failure: 'Confirmed GCC Mentor extraction miss', machine_readability: 'Potential machine-readability risk', missing_unclear: 'Missing or unclear information', recruiter_readability: 'Recruiter-readability improvement', writing: 'Optional writing enhancement',
}
