import { redactImportText, type ImportChange, type ImportReview } from './importReview'
import { currentImportValue } from './reviewEditor'

interface AttentionEditor {
  email: string
  phone: string
  full_name: string
  professional_summary: string
  skills: Array<{ key: string; name: string }>
  work_experience: Array<{ company: string; role: string; start_date: string; description: string; highlights: string }>
}
export interface ImportAttention {
  id: string
  field: string
  title: string
  reason: string
  priority: 'urgent' | 'correction' | 'recommended'
  excerpt?: string
  change?: ImportChange
}

/** Live, evidence-based items. Never manufacture three problems for a clean CV.
 * No model call: edits and accepted suggestions immediately remove resolved items.
 */
export function importAttention(review: ImportReview, editor: AttentionEditor): ImportAttention[] {
  const items: ImportAttention[] = []
  for (const [field, title, reason] of [
    ['full_name', 'Add your name', 'Your profile has no name. Enter it so recruiters can identify your application.'],
    ['email', 'Add a contact email', 'Your profile has no email address. Add one so recruiters can reply.'],
    ['phone', 'Add a contact number', 'Your profile has no phone number. Add the country code and a number recruiters can reach.'],
  ] as const) {
    if (!editor[field].trim()) items.push({ id: field, field, title, reason, priority: 'urgent' })
  }
  // Missing role dates/details are real gaps; an empty end date can mean Present.
  editor.work_experience.forEach((job, index) => {
    const field = `work_experience.${index}`
    const label = redactImportText(job.role || job.company || `Role ${index + 1}`)
    if (!job.start_date.trim()) items.push({ id: `${field}.date`, field, title: `Add the start date · ${label}`, reason: 'This role has no start date in your profile. Enter the actual month/year; do not estimate it.', priority: 'urgent' })
  })
  review.changes.forEach(change => {
    if (!change.restorable || !['spelling', 'wording'].includes(change.kind) || currentImportValue(editor, change) !== change.before) return
    items.push({ id: change.id, field: change.field, title: `${change.kind === 'spelling' ? 'Correct spelling' : 'Review this sentence'} · ${change.label}`, reason: change.kind === 'spelling' ? 'A spelling correction is available. Apply it or edit the sentence yourself.' : 'A wording correction is available using the same career details. Check its meaning before applying.', priority: 'correction', excerpt: change.before, change })
  })
  editor.work_experience.forEach((job, index) => {
    if (!job.description.trim() && !job.highlights.trim()) items.push({ id: `work_experience.${index}.details`, field: `work_experience.${index}`, title: `Add responsibilities · ${redactImportText(job.role || job.company || `Role ${index + 1}`)}`, reason: 'This role has no responsibilities in your profile. Add what you actually did; include results only when you can support them.', priority: 'recommended' })
  })
  if (!editor.professional_summary.trim()) items.push({ id: 'professional_summary', field: 'professional_summary', title: 'Add a short professional summary', reason: 'Your profile has no summary. Briefly describe your background and relevant skills using your real experience.', priority: 'recommended' })
  if (!editor.skills.some(skill => skill.name.trim())) items.push({ id: 'skills', field: 'skills', title: 'Add your relevant skills', reason: 'No skills are listed in your profile. Add only skills you have used or learned.', priority: 'recommended' })
  // Avoid three near-identical sentence suggestions from the same profile section.
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.change?.job ? `wording:${item.change.job.company}|${item.change.job.role}|${item.change.job.start_date}` : item.field
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 3)
}
