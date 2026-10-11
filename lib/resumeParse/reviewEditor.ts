import type { ImportChange } from './importReview'

interface ReviewEditor {
  professional_summary: string
  work_experience: Array<{ company: string; role: string; start_date: string; description: string; highlights: string }>
  skills: Array<{ key: string; name: string }>
}
function jobIndex(editor: ReviewEditor, change: ImportChange): number {
  if (!change.job) return -1
  const anchor = change.job
  const matches = editor.work_experience.map((job, i) => ({ job, i })).filter(({ job }) => job.company === anchor.company && job.role === anchor.role && (!anchor.start_date || job.start_date.startsWith(anchor.start_date)))
  return matches.length === 1 ? matches[0].i : -1
}
export function currentImportValue(editor: ReviewEditor, change: ImportChange): string | null {
  if (change.field === 'professional_summary') return editor.professional_summary
  if (change.kind === 'duplicate') {
    const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
    return editor.skills.filter(s => key(s.name) === key(change.after)).length === 1 ? change.after : null
  }
  if (!change.restorable) return null
  const i = jobIndex(editor, change)
  if (i < 0) return null
  const job = editor.work_experience[i]
  if (change.field.endsWith('.description')) return job.description
  const lines = job.highlights.split('\n')
  const found = lines.filter(line => line === change.before || line === change.after)
  return found.length === 1 ? found[0] : null
}
/** Refuse stale/ambiguous comparisons instead of overwriting later user edits. */
export function applyImportChange<T extends ReviewEditor>(editor: T, change: ImportChange, value: string, makeKey: () => string): T {
  const current = currentImportValue(editor, change)
  if (current === null || (current !== change.before && current !== change.after)) return editor
  if (value !== change.before && value !== change.after) return editor
  if (change.kind === 'duplicate') return { ...editor, skills: [...editor.skills, { key: makeKey(), name: change.before }] }
  if (change.field === 'professional_summary') return { ...editor, professional_summary: value }
  const i = jobIndex(editor, change)
  if (i < 0) return editor
  return { ...editor, work_experience: editor.work_experience.map((job, index) => index !== i ? job : {
    ...job,
    ...(change.field.endsWith('.description') ? { description: value } : { highlights: job.highlights.split('\n').map(line => line === current ? value : line).join('\n') }),
  }) }
}
