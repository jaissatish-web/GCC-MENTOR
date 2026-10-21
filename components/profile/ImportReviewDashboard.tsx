'use client'

import { useEffect, useState } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import { ImportComparison } from './ImportComparison'
import { REVIEW_CATEGORIES, type ReviewCategory, type ReviewCheck } from '@/lib/resumeParse/reviewChecks'
import { redactImportText } from '@/lib/resumeParse/importReview'
import type { ImportChange } from '@/lib/resumeParse/importReview'
import { cn } from '@/lib/utils'

export function ImportReviewDashboard({ checks, reviewId, busy, saved, onEdit, onChoose, onPendingChange, onStatusChange }: {
  reviewId: string
  onStatusChange: (pending: number) => void
  checks: ReviewCheck[]
  busy: boolean
  saved: boolean
  onEdit: (field: string, change?: ImportChange) => void
  onChoose: (change: ImportChange, side: 'before' | 'after') => void
  onPendingChange: () => void
}) {
  // Persist only SHA-256 fingerprints, scoped to this import and exact value.
  // Source text and personal field values never enter browser storage.
  const [confirmed, setConfirmed] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  const [rememberError, setRememberError] = useState(false)
  const confirmationKey = `gcc-import-field-review:v1:${reviewId}`
  const confirmationInputs = JSON.stringify(checks.filter(c => c.confirmable).map(c => [c.id, c.value]))
  useEffect(() => {
    let active = true
    const restore = async () => {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem(confirmationKey) ?? '{}')
        const remembered = stored && typeof stored === 'object' ? stored as Record<string, unknown> : {}
        const matches: Record<string, string> = {}
        for (const [id, value] of JSON.parse(confirmationInputs) as Array<[string, string]>) {
          if (remembered[id] === await confirmationDigest(confirmationKey, id, value)) matches[id] = value
        }
        if (active) setConfirmed(matches)
      } catch { /* Storage/crypto unavailable: confirmation remains valid for this session. */ }
      finally { if (active) setReady(true) }
    }
    void restore()
    return () => { active = false }
  }, [confirmationKey, confirmationInputs])
  const confirmDetail = async (check: ReviewCheck) => {
    setConfirmed(previous => ({ ...previous, [check.id]: check.value }))
    onPendingChange()
    try {
      const fingerprint = await confirmationDigest(confirmationKey, check.id, check.value)
      const stored = JSON.parse(localStorage.getItem(confirmationKey) ?? '{}')
      localStorage.setItem(confirmationKey, JSON.stringify({ ...stored, [check.id]: fingerprint }))
      setRememberError(false)
    } catch { setRememberError(true) }
  }
  const [wordingChoices, setWordingChoices] = useState<Record<string, string>>({})
  const resolved = (c: ReviewCheck) => c.status === 'passed' || (c.status === 'optional' ? wordingChoices[c.id] === c.value : c.confirmable && confirmed[c.id] === c.value)
  const [selected, setSelected] = useState<ReviewCategory>(() => checks.find(c => c.status === 'attention')?.category ?? 'contact')
  const relevant = checks.filter(c => c.category === selected)
  const pending = checks.filter(c => c.status !== 'optional' && !resolved(c)).length
  useEffect(() => { onStatusChange(ready ? pending : -1) }, [ready, pending, onStatusChange])
  const passed = checks.filter(c => c.status !== 'optional' && resolved(c)).length
  const optional = checks.filter(c => c.status === 'optional' && !resolved(c)).length
  return <div className="border-t border-line p-4 sm:p-5">
    <h3 className="type-section-title text-ink">Your resume, clearly checked</h3>
    <p className="mt-1 type-helper text-ink-soft" role="status" aria-live="polite">{passed} checks passed · {pending} need review{optional ? ` · ${optional} optional wording suggestions` : ''}</p>
    <p className="mt-2 type-helper text-ink-muted">These are import and basic format checks, not an ATS score or a job-match score.</p>
    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 type-caption text-ink-soft"><span className="inline-flex items-center gap-1"><CheckCircleIcon className="size-4 text-ok" aria-hidden="true" />Passed / confirmed</span><span className="inline-flex items-center gap-1"><ExclamationTriangleIcon className="size-4 text-alert" aria-hidden="true" />Needs review</span><span>Optional suggestions shown separately</span></div>
    <div className="mt-3 grid gap-2 sm:grid-cols-2" role="group" aria-label="Resume check categories">
      {REVIEW_CATEGORIES.map(category => {
        const items = checks.filter(c => c.category === category.id && c.status !== 'optional')
        const suggestions = checks.filter(c => c.category === category.id && c.status === 'optional')
        if (!items.length && !suggestions.length) return null
        const good = items.filter(resolved).length, remaining = items.length - good
        return <button type="button" key={category.id} aria-pressed={selected === category.id} onClick={() => setSelected(category.id)} className={cn('min-h-20 rounded-ctl border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', selected === category.id ? 'border-teal bg-teal-soft/40' : 'border-line bg-white')}>
          <span className="block type-label font-semibold text-ink">{category.label}</span>
          <span className="mt-1 block type-helper text-ink-soft">{good} passed · {remaining} review{suggestions.length ? ` · ${suggestions.length} optional` : ''}</span>
          {items.length > 0 && <span className="mt-2 flex h-2.5 overflow-hidden rounded-full bg-canvas" aria-hidden="true"><span className="bg-ok" style={{ width: `${good / items.length * 100}%` }} /><span className="bg-alert" style={{ width: `${remaining / items.length * 100}%` }} /></span>}
        </button>
      })}
    </div>
    {pending > 0 && <div className="mt-4 rounded-ctl bg-alert-soft p-3 type-helper text-ink-soft"><p className="font-semibold text-alert">Some details need your verification</p><p className="mt-1">We could not reliably read or validate some details. Some employer ATS systems may also miss or misread them. Check your original resume, then confirm or correct each flagged field.</p><details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 font-semibold">Why can this happen?</summary><p>Information may be absent from the resume, unclear because of formatting, or misread during extraction. A failed check here does not prove that an employer’s ATS will fail.</p></details></div>}
    <div className="mt-4 space-y-3" aria-label={`${REVIEW_CATEGORIES.find(c => c.id === selected)?.label} checks`}>
      {relevant.filter(c => !resolved(c)).map(check => <article key={check.id} className="rounded-ctl border border-line p-3">
        <p className={cn('flex items-start gap-2 type-label font-semibold', check.status === 'optional' ? 'text-ink' : 'text-alert')}><ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{check.title}</p>
        <p className="mt-1 type-caption font-medium text-ink-muted">{check.status === 'optional' ? 'Optional wording improvement' : 'Needs your review'}</p>
        {check.change ? <ImportComparison change={check.change} applied={check.value === check.change.after} compact /> : check.value ? <div className="mt-2 whitespace-pre-wrap break-words rounded-ctl bg-canvas p-3 type-helper text-ink"><span className="mb-1 block type-caption text-ink-muted">Current profile value</span>{redactImportText(check.value)}</div> : <p className="mt-2 type-helper text-alert">No usable value captured</p>}
        <p className="mt-2 type-helper text-ink-soft">{check.reason}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {check.change && check.change.restorable && (check.value === check.change.before || check.value === check.change.after) && <>{(['after', 'before'] as const).map(side => <button type="button" key={side} disabled={busy} className={buttonVariants({ variant: side === 'after' ? 'primary' : 'secondary', size: 'sm' })} onClick={() => { onChoose(check.change!, side); setWordingChoices(previous => ({ ...previous, [check.id]: side === 'after' ? check.change!.after : check.change!.before })) }}>{side === 'after' ? 'Use suggestion' : 'Keep original'}</button>)}</>}
          {check.status === 'optional' && check.change && check.value !== check.change.before && check.value !== check.change.after && <button type="button" disabled={busy} className={buttonVariants({ variant: 'primary', size: 'sm' })} onClick={() => { setWordingChoices(previous => ({ ...previous, [check.id]: check.value })); onPendingChange() }}>Keep my edited wording</button>}
          <button type="button" disabled={busy} className={buttonVariants({ variant: 'secondary', size: 'sm' })} onClick={() => onEdit(check.field, check.change)}>Review / edit detail</button>
          {check.confirmable && <button type="button" disabled={busy || !saved} className={buttonVariants({ variant: 'primary', size: 'sm' })} onClick={() => void confirmDetail(check)}>{check.value ? 'I verified this detail' : 'Not in my resume / not applicable'}</button>}
        </div>
      </article>)}
      {relevant.filter(resolved).length > 0 && <details className="rounded-ctl bg-ok-soft p-3"><summary className="flex min-h-11 cursor-pointer items-center gap-2 type-label font-semibold text-ok"><CheckCircleIcon className="size-5 shrink-0" aria-hidden="true" />{relevant.filter(resolved).length} passed / confirmed · View details</summary><ul className="mt-2 space-y-2">{relevant.filter(resolved).map(c => <li key={c.id} className="type-helper text-ink-soft"><span className="font-semibold">{c.title}</span> · {c.status === 'passed' ? 'Basic check passed' : 'Reviewed by you'}{c.confirmable && <button type="button" disabled={busy} className={buttonVariants({ variant: 'ghost', size: 'sm' })} onClick={() => { setConfirmed(previous => { const next = { ...previous }; delete next[c.id]; return next }); try { const stored = JSON.parse(localStorage.getItem(confirmationKey) ?? '{}'); delete stored[c.id]; localStorage.setItem(confirmationKey, JSON.stringify(stored)) } catch { setRememberError(true) }; onPendingChange() }}>Review again</button>}</li>)}</ul></details>}
    </div>
    {rememberError && <p role="status" className="mt-3 type-helper text-ink-soft">Verified for this visit. Your browser could not remember this confirmation; you may need to verify it again when you return.</p>}
    {!saved && <p className="mt-3 type-helper text-gold-ink">These checks reflect your current edits. Save your profile to keep corrections.</p>}
  </div>
}

async function confirmationDigest(scope: string, id: string, value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([scope, id, value])))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}
