'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircleIcon, DocumentMagnifyingGlassIcon, PencilSquareIcon, ShieldCheckIcon, ArrowUturnLeftIcon, PlusIcon, MinusIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import type { ImportChange, ImportReview } from '@/lib/resumeParse/importReview'
import type { ImportAttention } from '@/lib/resumeParse/importAttention'
import { cn } from '@/lib/utils'

export function ImportReviewCard({ review, attention, currentValue, onChange, onEdit, onRemove, busy = false, canConfirm = true }: {
  review: ImportReview
  attention: ImportAttention[]
  currentValue: (change: ImportChange) => string | null
  onChange: (change: ImportChange, value: string) => void
  onEdit: (field: string) => void
  onRemove: () => Promise<void>
  busy?: boolean
  canConfirm?: boolean
}) {
  const [open, setOpen] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [storageError, setStorageError] = useState(false)
  // Presentation preferences only: never store source text or career details.
  const storageKey = `gcc-import-review-ui:v1:${review.id}`
  const initializedKey = useRef<string | null>(null)
  useEffect(() => {
    if (initializedKey.current === storageKey) return
    initializedKey.current = storageKey
    try {
      const state = localStorage.getItem(storageKey)
      setReviewed(state === 'reviewed')
      setExpanded(state === null)
      localStorage.setItem(storageKey, state === 'reviewed' ? 'reviewed' : 'seen')
    } catch { setExpanded(true) }
  }, [storageKey])
  const confirmReview = () => {
    if (busy || !canConfirm) return
    try { localStorage.setItem(storageKey, 'reviewed') }
    catch { setStorageError(true); return }
    setStorageError(false)
    setReviewed(true)
    setExpanded(false)
  }
  const [tab, setTab] = useState<'changes' | 'source'>('changes')
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const completed = review.changes.filter(c => !c.suggested && c.kind !== 'check')
  const suggestions = review.changes.filter(c => c.suggested)
  const checks = review.changes.filter(c => c.kind === 'check')
  const roles = review.imported.roles
  const incompleteWording = review.wordingStatus === 'unavailable' || !!(review.wordingCoverage && review.wordingCoverage.checked < review.wordingCoverage.total)
  const sentencePreview = completed.find(c => (c.kind === 'spelling' || c.kind === 'wording') && c.before && c.after)
  return (
    <section aria-labelledby="import-review-heading" className={cn('mx-3 mt-4 overflow-hidden rounded-card border bg-white sm:mx-5', reviewed ? 'border-line' : 'border-rose-200')}>
      <h2 id="import-review-heading"><button type="button" aria-expanded={expanded} aria-controls="import-review-content" onClick={() => setExpanded(value => !value)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left type-helper text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal sm:px-5">
        <span>Resume import · <span className={reviewed ? 'text-teal' : 'text-rose-800'}>{reviewed ? 'Reviewed by you ✓' : 'Review pending'}</span></span>
        {expanded ? <MinusIcon className="size-5 shrink-0" aria-hidden="true" /> : <PlusIcon className="size-5 shrink-0" aria-hidden="true" />}
      </button></h2>
      <div id="import-review-content" hidden={!expanded}>
      <div className="ui-panel-padding bg-gradient-to-br from-rose-50 via-white to-white p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-ctl bg-teal text-white"><DocumentMagnifyingGlassIcon className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <p className="type-caption font-semibold text-teal">YOUR RESUME IMPORT REVIEW</p>
            <h3 className="mt-1 type-section text-ink">See what changed in your resume</h3>
            <p className="mt-1.5 type-helper text-ink-soft">{roles} role{roles === 1 ? '' : 's'}, {review.imported.skills} skills and {review.imported.qualifications} qualification{review.imported.qualifications === 1 ? '' : 's'} imported. See what changed and keep control of your profile.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 type-helper">
          {completed.length > 0 && <span className="flex items-center gap-2 rounded-ctl border border-rose-300 bg-rose-100 px-3 py-2 font-bold text-rose-800"><CheckCircleIcon className="size-5" aria-hidden="true" />{completed.length} cleanup change{completed.length === 1 ? '' : 's'} recorded</span>}
          {suggestions.length > 0 && <span className="flex items-center gap-1.5 text-ink"><PencilSquareIcon className="size-4" aria-hidden="true" />{suggestions.length} wording suggestion{suggestions.length === 1 ? '' : 's'} recorded</span>}
          {checks.length > 0 && <span className="text-ink-soft">{checks.length} detail{checks.length === 1 ? '' : 's'} to verify</span>}
          {!review.changes.length && <span className="text-teal">Your details were organized successfully.</span>}
        </div>
        <button type="button" aria-expanded={open} aria-controls="import-review-details" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'mt-4 w-full bg-rose-600 text-white hover:bg-rose-700 sm:w-auto')} onClick={() => setOpen(v => !v)}>{open ? 'Close review' : 'Review changes & original text'}</button>
        {sentencePreview && <div className="mt-4">
          <p className="type-label text-ink">One correction from your import</p>
          <Comparison change={sentencePreview} applied={currentValue(sentencePreview) === sentencePreview.after} compact />
        </div>}
      </div>
      <div className="ui-panel-padding border-t border-rose-200 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="type-label text-rose-800">{attention.length ? 'Needs attention before you apply' : checks.length || incompleteWording ? 'Verify your imported details' : 'No outstanding corrections found'}</h3>
          {attention.length > 0 && <span className="rounded-full bg-rose-100 px-2.5 py-1 type-caption font-bold text-rose-800">{attention.length} next step{attention.length === 1 ? '' : 's'}</span>}
        </div>
        <p className="mt-1 type-helper text-ink-soft">{attention.length ? 'Fix these in your profile. Available sentence corrections are free to apply now.' : checks.length ? `Open the review to check ${checks.length} import verification note${checks.length === 1 ? '' : 's'} against your original resume.` : incompleteWording ? 'The wording check did not cover every entry. Review your imported sentences against the original text.' : 'You can still review the imported details against your original resume.'}</p>
        <ol className="mt-3 space-y-3">
          {attention.map((item, index) => <li key={item.id} className="rounded-ctl border border-rose-200 bg-rose-50/60 p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-rose-700 type-caption font-bold text-white">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="type-label text-rose-800">{item.title}</p>
                <p className="mt-1 type-helper text-ink-soft">{item.reason}</p>
                <p className="mt-1 type-caption font-semibold text-rose-800">{item.priority === 'urgent' ? 'Important to complete' : item.priority === 'correction' ? 'Correction available' : 'Recommended improvement'}</p>
              </div>
            </div>
            {item.change && <Comparison change={item.change} applied={false} compact />}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => onEdit(item.field)}>Edit manually</button>
              {item.change && <button type="button" disabled={busy} className={buttonVariants({ variant: 'primary', size: 'sm' })} onClick={() => onChange(item.change!, item.change!.after)}>Apply correction · Free</button>}
            </div>
          </li>)}
        </ol>
        {attention.some(item => item.change) && <p className="mt-3 type-caption text-ink-muted">Review the wording, then press Save after applying or editing.</p>}
      </div>
      {open && <div id="import-review-details" className="ui-panel-padding border-t border-line p-4 sm:p-5">
        <p className="mb-3 type-caption text-ink-muted">Changes recorded during your latest import. Later profile edits are preserved.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Import review views">
          <button type="button" aria-pressed={tab === 'changes'} className={buttonVariants({ variant: tab === 'changes' ? 'primary' : 'ghost', size: 'sm' })} onClick={() => setTab('changes')}>Changes & checks</button>
          <button type="button" aria-pressed={tab === 'source'} className={buttonVariants({ variant: tab === 'source' ? 'primary' : 'ghost', size: 'sm' })} onClick={() => setTab('source')}>Original resume text</button>
        </div>
        {tab === 'source' ? <div className="mt-4">
          <p className="type-helper text-ink-soft">Text read from your uploaded or pasted resume. File layout may differ. Identity document numbers are masked.</p>
          <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-ctl border border-rose-200 bg-rose-50 p-3 font-sans type-helper text-rose-800">{review.sourceText}</pre>
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
                <span className={cn('type-caption font-semibold', change.kind === 'check' || change.suggested && !applied || change.kind === 'spelling' && original ? 'text-rose-800' : 'text-emerald-800')}>{change.kind === 'check' ? 'Needs your review' : change.suggested ? (applied ? 'Applied in your profile' : 'Suggestion · not applied') : change.kind === 'spelling' && original ? 'Original restored' : 'Import cleanup'}</span>
              </div>
              {(change.before || change.after) && <Comparison change={change} applied={applied} />}
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
      <div className="border-t border-line p-4 sm:p-5">
        <p className="mb-3 type-helper text-ink-soft">{reviewed ? 'You confirmed this review. You can still inspect the comparison or edit your profile.' : 'Review your details and apply or leave suggestions as you choose. Save any profile changes before confirming.'}</p>
        {!reviewed && <button type="button" disabled={busy || !canConfirm} onClick={confirmReview} className={buttonVariants({ variant: 'primary', size: 'sm' })}>I have reviewed my imported details</button>}
        {!reviewed && !canConfirm && <p className="mt-2 type-caption text-ink-muted">Save your profile changes first, then confirm this review.</p>}
        {storageError && <p role="alert" className="mt-2 type-helper text-alert">Could not remember your review in this browser. Please try again.</p>}
      </div>
      </div>
    </section>
  )
}

function Comparison({ change, applied, compact = false }: { change: ImportChange; applied: boolean; compact?: boolean }) {
  const display = (value: string) => compact && value.length > 420 ? value.slice(0, 420) + '…' : value
  return <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
    <div className="min-w-0 rounded-ctl border border-rose-200 bg-rose-50 p-3">
      <p className="type-caption font-bold text-rose-800">{change.kind === 'duplicate' || change.label === 'Unverified first-reading entry' || change.kind === 'format' ? 'Before · first reading' : 'Before · original wording'}</p>
      <p className="mt-1 whitespace-pre-wrap break-words type-helper text-rose-900">{display(change.before) || 'Not present'}</p>
    </div>
    <div className={cn('min-w-0 rounded-ctl border p-3', change.kind === 'check' ? 'border-rose-200 bg-white' : 'border-emerald-200 bg-emerald-50')}>
      <p className={cn('type-caption font-bold', change.kind === 'check' ? 'text-ink-soft' : 'text-emerald-800')}>{change.kind === 'check' ? 'Import decision · verify' : change.suggested ? applied ? 'After · applied in your profile' : 'Suggested correction · not applied' : 'After · corrected during import'}</p>
      <p className={cn('mt-1 whitespace-pre-wrap break-words type-helper', change.kind === 'check' ? 'text-ink' : 'text-emerald-900')}>{display(change.after) || 'Not included'}</p>
    </div>
  </div>
}
