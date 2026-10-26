'use client'

import { buttonVariants } from '@/components/ui/Button'
import { ImportComparison } from './ImportComparison'
import { redactImportText, type ImportReview, type ImportChange } from '@/lib/resumeParse/importReview'
import type { ReviewCheck } from '@/lib/resumeParse/reviewChecks'

/** Findings link into the canonical editor; this panel contains no duplicate fields. */
export function ResumeImportFindings({ checks, review, currentValue, onChoose, confirmed, busy, onConfirm, onFix }: {
  review: ImportReview
  currentValue: (change: ImportChange) => string | null
  onChoose: (change: ImportChange, value: string) => void
  checks: ReviewCheck[]
  confirmed: boolean
  busy: boolean
  onConfirm: (value: boolean) => void
  onFix: (field: string) => void
}) {
  const issues = checks.filter(check => check.status === 'attention')
  const passed = checks.filter(check => check.status === 'passed').length
  return <section aria-label="Resume import review" className="page-gutter py-4">
    <div className="rounded-card border border-line bg-white p-4">
      <h2 className="type-section text-ink">Review your imported details</h2>
      <p className="mt-2 type-helper text-ink-soft">Your saved profile has not changed. Review the findings, then correct your details in the Career Profile sections below.</p>
      <p className="mt-3 type-helper text-ink-soft">{passed} checks passed · {issues.length} details need review</p>
      {issues.length ? <details className="mt-3 rounded-ctl border border-alert bg-alert-soft p-3"><summary className="min-h-11 cursor-pointer type-label font-semibold text-alert">Details to review ({issues.length})</summary><ul className="space-y-2">{issues.map(check => <li key={check.id}><button type="button" disabled={busy} className={buttonVariants({ variant: 'ghost', size: 'sm' })+' text-alert text-left'} onClick={() => onFix(check.field)}>{check.title} →</button><p className="type-helper text-ink-soft">{check.reason}</p></li>)}</ul></details> : null}
      <p className="mt-3 type-helper text-ink-muted">Formatting or missing source information can affect extraction. Employer ATS results may differ. Add actual information, or leave missing details for later.</p>
      {review.changes.some(change => change.suggested) ? <details className="mt-3 rounded-ctl border border-line p-3"><summary className="min-h-11 cursor-pointer type-label text-ink">Optional wording suggestions</summary>{review.changes.filter(change => change.suggested).map(change => <div key={change.id} className="mt-3"><ImportComparison change={change} applied={currentValue(change) === change.after} compact /><p className="type-helper text-ink-soft">{change.reason}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={busy || ![change.before, change.after].includes(currentValue(change) ?? '')} className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => onChoose(change, change.after)}>Use suggestion</button><button type="button" disabled={busy || ![change.before, change.after].includes(currentValue(change) ?? '')} className={buttonVariants({ variant: 'ghost', size: 'sm' })} onClick={() => onChoose(change, change.before)}>Keep original</button></div></div>)}</details> : null}
      {review.sourceText ? <details className="mt-3"><summary className="min-h-11 cursor-pointer type-label text-ink">Original resume text</summary><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-ctl bg-canvas p-3 type-helper text-ink-soft">{redactImportText(review.sourceText)}</pre></details> : null}
      <label className="mt-4 flex min-h-11 items-start gap-3 type-label text-ink"><input type="checkbox" className="mt-1 size-4 shrink-0" disabled={busy} checked={confirmed} onChange={event => onConfirm(event.target.checked)} /><span>I reviewed the details read from my resume. Missing information can be completed later.</span></label>
    </div>
  </section>
}
