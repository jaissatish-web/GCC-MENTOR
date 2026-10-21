import type { ImportChange, ImportReview } from './importReview'
import { profileTextPresent, validProfileEmail, validProfilePhone } from '@/lib/profileFieldValidity'
import { parseCvDate } from './dates'

export interface ReviewCheckEditor {
  full_name: string
  email: string
  phone: string
  linkedin_url?: string
  date_of_birth?: string
  passport_validity_date?: string
  certifications?: Array<{ name: string; issue_date: string; expiry_date: string }>
  professional_summary: string
  skills: Array<{ name: string }>
  work_experience: Array<{ key?: string; company: string; role: string; start_date: string; end_date?: string; description: string; highlights: string }>
  education?: Array<{ key?: string; degree: string; institution: string; start_year: string; end_year: string }>
}
export type ReviewCategory = 'contact' | 'employment' | 'education' | 'writing' | 'other'
export interface ReviewCheck {
  id: string
  category: ReviewCategory
  field: string
  title: string
  value: string
  reason: string
  status: 'passed' | 'attention' | 'optional'
  /** Only extraction warnings with usable values can be confirmed by the user. */
  confirmable?: boolean
  change?: ImportChange
}
export const REVIEW_CATEGORIES: Array<{ id: ReviewCategory; label: string }> = [
  { id: 'contact', label: 'Contact & identity' }, { id: 'employment', label: 'Employment details' },
  { id: 'education', label: 'Education' }, { id: 'writing', label: 'Skills & writing' }, { id: 'other', label: 'Other imported details' },
]
export function reviewCategory(field: string): ReviewCategory {
  if (/^work_experience/.test(field)) return 'employment'
  if (/^education/.test(field)) return 'education'
  if (/^(skills|professional_summary)/.test(field)) return 'writing'
  if (/^(full_name|email|phone|linkedin_url)/.test(field)) return 'contact'
  return 'other'
}
function fieldValue(editor: ReviewCheckEditor, path: string): string {
  let value: unknown = editor
  for (const key of path.split('.')) {
    if (!value || typeof value !== 'object') return ''
    value = (value as Record<string, unknown>)[key]
  }
  if (typeof value === 'string') return value.trim()
  return value === undefined || value === null || Array.isArray(value) && !value.length ? '' : JSON.stringify(value)
}
/** Presence/format checks, never an ATS score or proof of factual accuracy. */
export function resumeReviewChecks(review: ImportReview, editor: ReviewCheckEditor, currentValue: (change: ImportChange) => string | null): ReviewCheck[] {
  const checks: ReviewCheck[] = []
  const add = (field: string, title: string, valid: boolean, reason: string, value = fieldValue(editor, field)) => checks.push({ id: `field:${field}`, field, category: reviewCategory(field), title, value, reason: valid ? 'Present and passes the basic format check. Please verify that the detail is accurate.' : reason, status: valid ? 'passed' : 'attention' })
  const usable = profileTextPresent
  add('full_name', 'Your name', usable(editor.full_name), 'Your name is missing or unreadable. Enter it exactly as you want recruiters to see it.')
  add('email', 'Contact email', validProfileEmail(editor.email), 'Enter a valid email address and compare it with your original resume. We could not confirm a usable email.')
  add('phone', 'Contact number', validProfilePhone(editor.phone), 'Enter a reachable phone number, including your country code. This value is missing or has an unexpected format.')
  const validDate = (s: string, present = false) => { const result = parseCvDate(s); if (result.kind !== 'date') return present && result.kind === 'present'; if (/^\d{4}-\d{2}-\d{2}$/.test(result.value)) { const date = new Date(`${result.value}T00:00:00Z`); return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === result.value } return true }
  if (editor.linkedin_url?.trim()) {
    let valid = false
    try { const url = new URL(editor.linkedin_url); valid = ['https:', 'http:'].includes(url.protocol) && /(^|\.)linkedin\.com$/i.test(url.hostname) } catch { /* Invalid URLs require manual correction. */ }
    add('linkedin_url', 'LinkedIn address', valid, 'This does not look like a LinkedIn URL. Paste the full address of your profile.')
  }
  for (const [field, label] of [['date_of_birth', 'Date of birth'], ['passport_validity_date', 'Passport validity date']] as const) {
    if (editor[field]?.trim()) add(field, label, validDate(editor[field]!), 'This date has an unexpected format. Confirm the actual date from your source document.')
  }
  editor.skills.forEach((skill, i) => add(`skills.${i}.name`, `Skill ${i + 1}`, usable(skill.name), 'Enter this skill, or remove the empty entry.'))
  editor.certifications?.forEach((cert, i) => {
    add(`certifications.${i}.name`, `Certificate ${i + 1} · name`, usable(cert.name), 'Enter the certificate name, or remove this entry.')
    for (const field of ['issue_date', 'expiry_date'] as const) if (cert[field]) add(`certifications.${i}.${field}`, `Certificate ${i + 1} · ${field === 'issue_date' ? 'issue' : 'expiry'} date`, validDate(cert[field]), 'This certificate date has an unexpected format. Confirm the actual date.')
  })
  editor.work_experience.forEach((job, i) => {
    const p = `work_experience.${i}`, label = `Role ${i + 1}`
    add(`${p}.company`, `${label} · employer`, usable(job.company), 'The employer is missing or unreadable. Confirm the actual company name.')
    add(`${p}.role`, `${label} · job title`, usable(job.role), 'The job title is missing or unreadable. Confirm your actual role.')
    add(`${p}.start_date`, `${label} · start date`, validDate(job.start_date), 'The start date is missing or invalid. Enter the actual date; do not estimate it.')
    // A blank end date is supported by the existing profile as a current role.
    if (job.end_date) {
      add(`${p}.end_date`, `${label} · end date`, validDate(job.end_date, true), 'The end date could not be read as a date. Confirm it, or mark the role as current.')
      const start = parseCvDate(job.start_date), end = parseCvDate(job.end_date)
      if (start.kind === 'date' && end.kind === 'date') add(`${p}.date_order`, `${label} · date order`, end.value.slice(0, Math.min(start.value.length, end.value.length)) >= start.value.slice(0, Math.min(start.value.length, end.value.length)), 'The end date is before the start date. Check both dates.', `${job.start_date} → ${job.end_date}`)
    }
    add(`${p}.description`, `${label} · responsibilities`, usable(job.description) || usable(job.highlights), 'No responsibilities were captured for this role. Add what you actually did.', [job.description, job.highlights].filter(Boolean).join('\n'))
  })
  editor.education?.forEach((edu, i) => {
    const p = `education.${i}`
    add(`${p}.degree`, `Qualification ${i + 1} · degree`, usable(edu.degree), 'Confirm the name of this qualification.')
    add(`${p}.institution`, `Qualification ${i + 1} · institution`, usable(edu.institution), 'Confirm the school, college or institution.')
    for (const f of ['start_year', 'end_year'] as const) if (edu[f]) add(`${p}.${f}`, `Qualification ${i + 1} · ${f === 'start_year' ? 'start' : 'completion'} year`, /^(19|20)\d{2}$/.test(edu[f]), 'Confirm a four-digit year from your original resume.')
    if (/^\d{4}$/.test(edu.start_year) && /^\d{4}$/.test(edu.end_year)) add(`${p}.date_order`, `Qualification ${i + 1} · year order`, edu.end_year >= edu.start_year, 'The completion year is before the start year. Check both years.', `${edu.start_year} → ${edu.end_year}`)
  })
  add('skills', 'Relevant skills', editor.skills.some(s => usable(s.name)), 'No usable skills were captured. Add only skills you have used or learned.', editor.skills.map(s => s.name).join(', '))
  if (editor.professional_summary.trim()) add('professional_summary', 'Professional summary', usable(editor.professional_summary), 'The summary contains unreadable text. Review the original and edit it.')
  for (const change of review.changes) {
    if (change.kind === 'check') {
      const existing = checks.find(c => c.field === change.field)
      if (existing?.status === 'attention') { existing.reason += ` Import note: ${change.reason}`; continue }
      // Unmapped/global warnings stay visible; a present value alone does not resolve them.
      const value = fieldValue(editor, change.field)
      if (existing) { existing.status = 'attention'; existing.confirmable = !!value; existing.reason = change.reason; continue }
      checks.push({ id: `warning:${change.id}`, field: change.field, category: reviewCategory(change.field), title: `Verify · ${change.field.replace(/^work_experience\.(\d+)\./, (_, n) => `Role ${Number(n) + 1} · `).replace(/^education\.(\d+)\./, (_, n) => `Qualification ${Number(n) + 1} · `).replace(/_/g, ' ')}`, value, reason: change.reason, status: 'attention', confirmable: true })
    } else if (change.suggested) {
      const current = currentValue(change)
      checks.push({ id: `wording:${change.id}`, field: change.field, category: 'writing', title: change.label, value: current ?? '', reason: change.reason, status: 'optional', change })
    }
  }
  return checks
}
