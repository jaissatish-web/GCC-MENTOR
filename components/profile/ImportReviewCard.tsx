'use client'

import { useState } from 'react'
import { CheckCircleIcon, DocumentMagnifyingGlassIcon, PencilSquareIcon, ShieldCheckIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import type { ImportChange, ImportReview } from '@/lib/resumeParse/importReview'

export function ImportReviewCard({ review, currentValue, onChange, onEdit, onRemove, busy = false }: {
  review: ImportReview
  currentValue: (change: ImportChange) => string | null
  onChange: (change: ImportChange, value: string) => void
  onEdit: (field: string) => void
  onRemove: () => Promise<void>
  busy?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'changes' | 'source'>('changes')
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const completed = review.changes.filter(c => !c.suggested && c.kind !== 'check')
  const suggestions = review.changes.filter(c => c.suggested)
  const checks = review.changes.filter(c => c.kind === 'check')
  const roles = review.imported.roles
  return (
    <section aria-labelledby="import-review-heading" className="mx-3 mt-4 overflow-hidden rounded-card border border-teal/20 bg-white sm:mx-5">
      <div className="bg-gradient-to-br from-teal-soft/80 via-white to-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-ctl bg-teal text-white"><DocumentMagnifyingGlassIcon className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="type-caption font-semibold text-teal">YOUR RESUME IMPORT REVIEW</p>
            <h2 id="import-review-heading" className="mt-1 type-section text-ink">Your experience, clearly organized</h2>
            <p className="mt-1.5 type-helper text-ink-soft">{roles} role{roles === 1 ? '' : 's'}, {review.imported.skills} skills and {review.imported.qualifications} qualification{review.imported.qualifications === 1 ? '' : 's'} imported. See what changed and keep control of your profile.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 type-helper">
          {completed.length > 0 && <span className="flex items-center gap-1.5 font-semibold text-teal"><CheckCircleIcon className="size-4" aria-hidden="true" />{completed.length} import cleanup{completed.length === 1 ? '' : 's'} completed</span>}
          {suggestions.length > 0 && <span className="flex items-center gap-1.5 text-ink"><PencilSquareIcon className="size-4" aria-hidden="true" />{suggestions.length} wording suggestion{suggestions.length === 1 ? '' : 's'}</span>}
          {checks.length > 0 && <span className="text-ink-soft">{checks.length} detail{checks.length === 1 ? '' : 's'} to verify</span>}
          {!review.changes.length && <span className="text-teal">Your details were organized successfully.</span>}
        </div>
        <button type="button" aria-expanded={open} aria-controls="import-review-details" className={buttonVariants({ variant: 'secondary', size: 'sm' }) + ' mt-4 w-full sm:w-auto'} onClick={() => setOpen(v => !v)}>{open ? 'Close review' : 'Review changes & original text'}</button>
      </div>
      {open && <div id="import-review-details" className="border-t border-line p-4 sm:p-5">
        <p className="mb-3 type-caption text-ink-muted">Changes recorded during your latest import. Later profile edits are preserved.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Import review views">
          <button type="button" aria-pressed={tab === 'changes'} className={buttonVariants({ variant: tab === 'changes' ? 'primary' : 'ghost', size: 'sm' })} onClick={() => setTab('changes')}>Changes & checks</button>
          <button type="button" aria-pressed={tab === 'source'} className={buttonVariants({ variant: tab === 'source' ? 'primary' : 'ghost', size: 'sm' })} onClick={() => setTab('source')}>Original resume text</button>
        </div>
        {tab === 'source' ? <div className="mt-4">
          <p className="type-helper text-ink-soft">Text read from your uploaded or pasted resume. File layout may differ. Identity document numbers are masked.</p>
          <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-ctl bg-canvas p-3 font-sans type-helper text-ink">{review.sourceText}</pre>
        </div> : <div className="mt-4 divide-y divide-line">
          {review.wordingStatus === 'unavailable' && <p className="pb-4 type-helper text-ink-soft">The additional wording check could not finish. Your resume was imported; no AI wording suggestions are shown.</p>}
          {review.wordingStatus === 'checked' && review.wordingCoverage && review.wordingCoverage.checked < review.wordingCoverage.total && <p className="pb-4 type-helper text-ink-soft">Grammar suggestions covered {review.wordingCoverage.checked} of {review.wordingCoverage.total} summary and responsibility entries. You can review all imported details in your Career Profile.</p>}
          {!review.changes.length && <p className="py-4 type-helper text-ink-soft">No cleanup changes or review notes were recorded. You can still compare the original text and edit any profile section.</p>}
          {review.changes.map(change => {
            const current = currentValue(change)
            const applied = current === change.after
            const original = current === change.before
            const canToggle = change.restorable && current !== null && (original || applied) && change.kind !== 'duplicate'
            return <article key={change.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="type-label text-ink">{change.label}</h3>
                <span className="type-caption font-semibold text-teal">{change.kind === 'check' ? 'Needs your review' : change.suggested ? (applied ? 'Applied in your profile' : 'Suggestion') : change.kind === 'spelling' && original ? 'Original restored' : 'Import cleanup'}</span>
              </div>
              {(change.before || change.after) && <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-ctl bg-canvas p-3"><p className="type-caption font-semibold text-ink-muted">{change.kind === 'duplicate' || change.label === 'Unverified first-reading entry' ? 'First reading' : 'Before'}</p><p className="mt-1 whitespace-pre-wrap break-words type-helper text-ink-soft">{change.before || 'Not present'}</p></div>
                <div className="min-w-0 rounded-ctl bg-teal-soft/60 p-3"><p className="type-caption font-semibold text-teal">{change.suggested && !applied ? 'Suggested wording' : 'After import'}</p><p className="mt-1 whitespace-pre-wrap break-words type-helper text-ink">{change.after || 'Not included'}</p></div>
              </div>}
              <p className="mt-2 type-helper text-ink-soft">{change.reason}</p>
              {change.restorable && current !== null && !original && !applied && change.kind !== 'duplicate' && <p className="mt-2 type-caption text-ink-muted">This field has since been edited. Review it in your profile.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {canToggle && <button type="button" disabled={busy} className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => onChange(change, applied ? change.before : change.after)}>{applied && <ArrowUturnLeftIcon className="size-4" aria-hidden="true" />}{applied ? 'Restore original' : change.suggested ? 'Apply correction' : 'Keep correction'}</button>}
                {change.kind === 'duplicate' && current === change.after && <button type="button" disabled={busy} className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => onChange(change, change.before)}>Restore repeated entry</button>}
                <button type="button" className={buttonVariants({ variant: 'ghost', size: 'sm' })} onClick={() => onEdit(change.field)}>Review / edit profile</button>
              </div>
            </article>
          })}
        </div>}
        <p className="mt-4 flex items-start gap-2 type-caption text-ink-muted"><ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Suggestions need your approval. Your uploaded file is unchanged. Press Save after applying, restoring or editing profile details.</p>
        <details className="mt-4 border-t border-line pt-3"><summary className="cursor-pointer type-caption text-ink-muted">Remove this saved comparison</summary><p className="mt-2 type-helper text-ink-soft">Removes the original text and this change history. Your Career Profile stays available.</p><button type="button" disabled={removing} className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' mt-2 text-alert'} onClick={async () => { setRemoving(true); setError(''); try { await onRemove() } catch { setError('Could not remove the comparison. Please try again.') } finally { setRemoving(false) } }}>{removing ? 'Removing…' : 'Remove comparison'}</button>{error && <p role="alert" className="mt-2 type-helper text-alert">{error}</p>}</details>
      </div>}
    </section>
  )
}
