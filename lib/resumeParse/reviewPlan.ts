import type { ReviewCheck } from './reviewChecks'

/** Essential-check grouping retained for editor disclosure and issue summaries.
 * The explicit defer/save action uses `invalid`, not this legacy grouping.
 */
export function isBlockingImportCheck(check: ReviewCheck): boolean {
  if (check.status !== 'attention') return false
  if (check.confirmable) return true
  if (/^(full_name|email|phone)$/.test(check.field)) return true
  if (/^work_experience\.\d+\.(company|role|start_date|end_date|date_order)$/.test(check.field)) return true
  if (/^skills\.\d+\.name$/.test(check.field)) return true
  if (/^education\.\d+\.degree$|^certifications\.\d+\.name$/.test(check.field)) return true
  return !!check.value.trim()
}

export function importReviewPlan(checks: ReviewCheck[], confirmations: Record<string, string>) {
  const outstanding = checks.filter(check => check.status === 'attention' && !(check.confirmable && confirmations[check.id] === check.value))
  return {
    outstanding,
    // A missing fact can be deferred. A malformed supplied value must be
    // corrected or cleared; skipping never confirms an uncertain extraction.
    invalid: outstanding.filter(check => !check.confirmable && !!check.value.trim()),
    blocking: outstanding.filter(isBlockingImportCheck),
    later: outstanding.filter(check => !isBlockingImportCheck(check)),
    passed: checks.filter(check => check.status === 'passed' || (check.confirmable && confirmations[check.id] === check.value)).length,
  }
}

/** Keep imported field notes attached to the matching entry after an add/merge.
 * Ambiguous anchors become section-level checks instead of pointing at another job.
 */
export function rebaseImportField(field: string, draft: import('@/types/careerProfile').CareerProfileDraft, target: import('@/types/careerProfile').CareerProfileFull): string {
  const match = field.match(/^(work_experience|education|certifications)\.(\d+)(.*)$/)
  if (!match) return field
  const [, group, rawIndex, suffix] = match
  const normalize = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
  const keys = group === 'work_experience' ? ['company', 'role'] : group === 'education' ? ['degree', 'institution'] : ['name', 'issuer']
  const sourceRows = draft[group as 'work_experience' | 'education' | 'certifications']
  const source = sourceRows[Number(rawIndex)] as unknown as Record<string, unknown> | undefined
  if (!source) return group
  const candidates = target[group as 'work_experience' | 'education' | 'certifications'].map((row, index) => ({ row: row as unknown as Record<string, unknown>, index })).filter(({row}) => keys.every(key => normalize(row[key]) === normalize(source[key])) && (group !== 'work_experience' || !source.start_date || String(row.start_date ?? '').startsWith(String(source.start_date).slice(0, 7))))
  return candidates.length === 1 ? `${group}.${candidates[0].index}${suffix}` : group
}
