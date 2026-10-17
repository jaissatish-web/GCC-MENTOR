'use client'

import { ImportComparison as Comparison } from '@/components/profile/ImportComparison'
import { useEffect, useRef, useState } from 'react'
import { DocumentMagnifyingGlassIcon, ShieldCheckIcon, ArrowUturnLeftIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import type { ImportChange, ImportReview } from '@/lib/resumeParse/importReview'
import type { ImportAttention } from '@/lib/resumeParse/importAttention'
import { cn } from '@/lib/utils'

export function ImportReviewCard({ review, attention, currentValue, onChange, onEdit, onRemove, busy = false, canConfirm = true }: {
  review: ImportReview
  attention: ImportAttention[]
  currentValue: (change: ImportChange) => string | null
  onChange: (change: ImportChange, value: string) => void
  onEdit: (field: string, change?: ImportChange) => void
  onRemove: () => Promise<void>
  busy?: boolean
  canConfirm?: boolean
}) {
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
    } catch { setReviewed(false); setExpanded(true) }
  }, [storageKey])
  const confirmReview = () => {
    if (busy || !canConfirm) return
    try { localStorage.setItem(storageKey, 'reviewed') }
    catch { setStorageError(true); return }
    setStorageError(false)
    setReviewed(true)
    setExpanded(false)
  }
  const [choices, setChoices] = useState<Record<string, 'before' | 'after'>>({})
  const choose = (change: ImportChange, side: 'before' | 'after') => {
    if (busy) return
    setChoices(previous => ({ ...previous, [change.id]: side }))
    setReviewed(false)
    try { localStorage.setItem(storageKey, 'seen') } catch { /* confirmation will report storage errors */ }
    onChange(change, side === 'before' ? change.before : change.after)
  }
  const [tab, setTab] = useState<'changes' | 'source'>('changes')
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const completed = review.changes.filter(c => !c.suggested && c.kind !== 'check')
  const suggestions = review.changes.filter(c => c.suggested)
  const alreadyInProfile = suggestions.filter(change => currentValue(change) === change.after).length
  const originalWording = suggestions.filter(change => currentValue(change) === change.before).length
  const manualReview = suggestions.length - alreadyInProfile - originalWording
  const checks = review.changes.filter(c => c.kind === 'check')
  const roles = review.imported.roles
  const incompleteWording = review.wordingStatus === 'unavailable' || !!(review.wordingCoverage && review.wordingCoverage.checked < review.wordingCoverage.total)
  const profileAttention = attention.filter(item => !item.change?.suggested)
  const groups = [
    { id: 'suggestions', title: 'Wording suggestions', hint: 'Optional changes. Review the meaning before applying.', items: suggestions },
    { id: 'checks', title: 'Details to verify', hint: 'Compare these notes with your original resume.', items: checks },
    { id: 'cleanups', title: 'Import cleanups', hint: 'Formatting and changes recorded during import. Expand to compare values.', items: completed },
  ]
  return (
    <section aria-labelledby="import-review-heading" className="mx-3 mt-4 overflow-hidden rounded-card border border-line bg-white sm:mx-5">
      <h2 id="import-review-heading"><button type="button" aria-expanded={expanded} aria-controls="import-review-content" onClick={() => setExpanded(value => !value)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal sm:px-5">
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 type-label font-semibold text-ink">Resume import review <span className={cn('rounded-full px-2 py-1 type-caption font-medium', reviewed ? 'bg-teal-soft text-teal' : 'bg-gold-soft text-gold-ink')}>{reviewed ? 'Reviewed by you' : 'Review pending'}</span></span>
          <span className="mt-1 block type-helper font-normal text-ink-soft">{completed.length} cleanups · {suggestions.length} wording suggestions · {checks.length} verification notes</span>
        </span>
        <span className="flex shrink-0 items-center gap-1 type-helper font-semibold text-teal"><span>{expanded ? 'Collapse' : 'Review details'}</span><ChevronDownIcon className={cn('size-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" /></span>
      </button></h2>
      <div id="import-review-content" hidden={!expanded}>
      <div className="border-t border-line bg-teal-soft/40 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-ctl bg-teal text-white"><DocumentMagnifyingGlassIcon className="size-6" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h3 className="type-label font-semibold text-ink">{roles} role{roles === 1 ? '' : 's'} · {review.imported.skills} skills · {review.imported.qualifications} qualification{review.imported.qualifications === 1 ? '' : 's'} imported</h3>
            <p className="mt-1 type-helper text-ink-soft">Compare the wording below. Suggestions are optional.</p>
          </div>
        </div>
      </div>
      <div className="border-t border-line p-4 sm:p-5">
        <ol aria-label="Import review steps" className="grid grid-cols-2 gap-2 sm:grid-cols-4">{['Review changes', 'Choose wording', 'Save profile', 'Confirm review'].map((label, i) => <li key={label} className="flex min-w-0 items-center gap-2 rounded-ctl border border-line bg-canvas p-2"><span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center rounded-full bg-teal-soft type-caption font-semibold text-teal">{i + 1}</span><span className="type-helper text-ink">{label}</span></li>)}</ol>
        {suggestions.length > 0 ? <div aria-label="Wording review summary" className="mt-3 flex flex-wrap gap-2">{[{ count: alreadyInProfile, label: 'Already in profile' }, { count: originalWording, label: 'Original wording' }, { count: manualReview, label: 'Review manually' }].filter(item => item.count > 0).map(item => <div key={item.label} className="flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1.5"><span className="type-helper font-semibold text-teal">{item.count}</span><span className="type-helper text-ink-soft">{item.label}</span></div>)}</div> : null}
        <p role="status" aria-live="polite" className="mt-3 type-helper font-medium text-teal">{busy ? 'Saving your profile…' : !canConfirm ? 'Profile changes are not saved yet. Save your profile before confirming.' : 'Your profile is saved. Review the comparisons, then confirm when ready.'}</p>
      </div>
      {profileAttention.length > 0 ? <div className="border-t border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="type-label font-semibold text-ink">{profileAttention.length ? 'Profile details to complete' : checks.length || incompleteWording ? 'Verify your imported details' : 'Review information'}</h3>
          {profileAttention.length > 0 && <span className="rounded-full bg-gold-soft px-2.5 py-1 type-caption font-bold text-gold-ink">{profileAttention.length} next step{profileAttention.length === 1 ? '' : 's'}</span>}
        </div>
        <p className="mt-1 type-helper text-ink-soft">{profileAttention.length ? 'Check these profile details before applying for jobs. Wording suggestions are listed separately below.' : checks.length ? `Check ${checks.length} import verification note${checks.length === 1 ? '' : 's'} against your original resume.` : incompleteWording ? 'The wording check did not cover every entry. Review your imported sentences against the original text.' : 'You can still review the imported details against your original resume.'}</p>
        <ol className="mt-3 space-y-3">
          {profileAttention.map((item, index) => <li key={item.id} className="rounded-ctl border border-gold/40 bg-gold-soft/50 p-3">
            <div className="flex items-start gap-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-ink type-caption font-bold text-white">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="type-label font-semibold text-ink">{item.title}</p>
                <p className="mt-1 type-helper text-ink-soft">{item.reason}</p>
                <p className="mt-1 type-caption font-semibold text-gold-ink">{item.priority === 'urgent' ? 'Important to complete' : item.priority === 'correction' ? 'Correction available' : 'Recommended improvement'}</p>
              </div>
            </div>
            {item.change && <Comparison change={item.change} applied={false} compact />}
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => onEdit(item.field, item.change)}>Edit manually</button>
              {item.change && <button type="button" disabled={busy} className={buttonVariants({ variant: 'primary', size: 'sm' })} onClick={() => onChange(item.change!, item.change!.after)}>Apply correction · Free</button>}
            </div>
          </li>)}
        </ol>
        {profileAttention.some(item => item.change) && <p className="mt-3 type-caption text-ink-muted">Review the wording, then press Save after applying or editing.</p>}
      </div> : null}
      <div id="import-review-details" className="ui-panel-padding border-t border-line p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Import review views">
          <button type="button" aria-pressed={tab === 'changes'} className={buttonVariants({ variant: tab === 'changes' ? 'primary' : 'ghost', size: 'sm' })} onClick={() => setTab('changes')}>Imported details</button>
          <button type="button" aria-pressed={tab === 'source'} className={buttonVariants({ variant: tab === 'source' ? 'primary' : 'ghost', size: 'sm' })} onClick={() => setTab('source')}>Original resume text</button>
        </div>
        {tab === 'source' ? <div className="mt-4">
          <p className="type-helper text-ink-soft">Text read from your uploaded or pasted resume. File layout may differ. Identity document numbers are masked.</p>
          <pre className="mt-3 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-ctl border border-line bg-canvas p-3 font-sans type-helper text-ink-soft">{review.sourceText}</pre>
        </div> : <div className="mt-4 space-y-3">
          {review.wordingStatus === 'unavailable' && <p className="pb-4 type-helper text-ink-soft">The additional wording check could not finish. Your resume was imported; no AI wording suggestions are shown.</p>}
          {review.wordingStatus === 'checked' && review.wordingCoverage && review.wordingCoverage.checked < review.wordingCoverage.total && <p className="pb-4 type-helper text-ink-soft">Wording check: {review.wordingCoverage.checked} of {review.wordingCoverage.total} entries. Check the remaining entries against your original resume.</p>}
          {!review.changes.length && <p className="py-4 type-helper text-ink-soft">No cleanup changes or review notes were recorded. You can still compare the original text and edit any profile section.</p>}
          <p className="type-caption text-ink-soft">Crossed-out words show removed text. Underlined words show new text. Career facts stay yours to verify.</p>
          {groups.filter(group => group.items.length > 0).map(group => <details key={group.id} open={group.id !== 'cleanups'} className="group rounded-ctl border border-line">
            <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-ctl px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
              <span className="min-w-0"><span className="type-label font-semibold text-ink">{group.title} <span className="ml-1 rounded-full bg-teal-soft px-2 py-0.5 type-caption text-teal">{group.items.length}</span></span><span className="mt-1 block type-helper text-ink-soft">{group.hint}</span></span>
              <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-teal transition-transform group-open:rotate-180" />
            </summary>
            <div className="divide-y divide-line border-t border-line px-3 pt-3">
          {group.items.map(change => {
            const current = currentValue(change)
            const applied = current === change.after
            const original = current === change.before
            const canToggle = change.restorable && current !== null && (original || applied) && change.kind !== 'duplicate'
            return <article key={change.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="type-label text-ink">{change.label}</h3>
                <span className="rounded-full bg-teal-soft px-2 py-1 type-caption font-medium text-teal">{change.kind === 'check' ? 'Needs your review' : change.suggested ? choices[change.id] === 'after' && applied ? canConfirm ? 'Chosen wording · profile saved' : 'Selected · save profile' : choices[change.id] === 'before' && original ? canConfirm ? 'Original wording kept' : 'Original selected · save profile' : applied ? 'Already in profile' : original ? 'Awaiting your choice' : 'Review manually' : 'Import cleanup'}</span>
              </div>
              {(change.before || change.after) && <Comparison change={change} applied={applied} />}
              <p className="mt-2 type-helper text-ink-soft">{change.reason}</p>
              {change.restorable && current !== null && !original && !applied && change.kind !== 'duplicate' && <p className="mt-2 type-caption text-ink-muted">This field has since been edited. Review it in your profile.</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {canToggle && change.suggested ? <>
                  <button type="button" disabled={busy} aria-pressed={choices[change.id] === 'after' && applied} className={buttonVariants({ variant: 'primary', size: 'sm' })} onClick={() => choose(change, 'after')}>Use suggestion</button>
                  <button type="button" disabled={busy} aria-pressed={choices[change.id] === 'before' && original} className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => choose(change, 'before')}>Keep original</button>
                </> : canToggle ? <button type="button" disabled={busy} className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => onChange(change, applied ? change.before : change.after)}>{applied && <ArrowUturnLeftIcon className="size-4" aria-hidden="true" />}{applied ? 'Restore original' : 'Keep correction'}</button> : null}
                {change.kind === 'duplicate' && current === change.after && <button type="button" disabled={busy} className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => onChange(change, change.before)}>Restore repeated entry</button>}
                <button type="button" className={buttonVariants({ variant: 'ghost', size: 'sm' })} onClick={() => onEdit(change.field, change)}>Review / edit profile</button>
              </div>
            </article>
          })}
            </div>
          </details>)}
        </div>}
        <p className="mt-4 flex items-start gap-2 type-caption text-ink-muted"><ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Suggestions need your approval. Your uploaded file is unchanged. Press Save after applying, restoring or editing profile details.</p>
        <details className="mt-4 border-t border-line pt-3"><summary className="flex min-h-11 cursor-pointer items-center type-helper text-ink-muted">Remove this saved comparison</summary><p className="mt-2 type-helper text-ink-soft">Removes the original text and this change history. Your Career Profile stays available.</p><button type="button" disabled={removing} className={buttonVariants({ variant: 'ghost', size: 'sm' }) + ' mt-2 text-alert'} onClick={async () => { setRemoving(true); setError(''); try { await onRemove() } catch { setError('Could not remove the comparison. Please try again.') } finally { setRemoving(false) } }}>{removing ? 'Removing…' : 'Remove comparison'}</button>{error && <p role="alert" className="mt-2 type-helper text-alert">{error}</p>}</details>
      </div>
      <div className="border-t border-line bg-teal-soft/30 p-4 sm:p-5">
        <p className="mb-3 type-helper text-ink-soft">{reviewed ? 'You confirmed this review. You can still inspect the comparison or edit your profile.' : 'Review your imported details and choose which suggestions to keep. Save any profile edits, then confirm this review. Confirming does not apply suggestions or save profile changes.'}</p>
        {!reviewed && <button type="button" disabled={busy || !canConfirm} onClick={confirmReview} className={buttonVariants({ variant: 'primary', size: 'sm' })}>Confirm review</button>}
        {!reviewed && !canConfirm && <p className="mt-2 type-caption text-ink-muted">Save your profile changes first, then confirm this review.</p>}
        {storageError && <p role="alert" className="mt-2 type-helper text-alert">Could not remember your review in this browser. Please try again.</p>}
      </div>
      </div>
    </section>
  )
}
