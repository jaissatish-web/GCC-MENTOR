'use client'

import { useState, type ReactNode } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { ImportComparison } from './ImportComparison'
import { redactImportText, type ImportChange, type ImportReview } from '@/lib/resumeParse/importReview'

export type AcceptanceStatus = 'complete' | 'attention' | 'missing' | 'optional'
export interface AcceptanceSection {
  id: string
  title: string
  content: string
  status: AcceptanceStatus
  hint?: string
  changes: ImportChange[]
}

interface Props {
  sections: AcceptanceSection[]
  review: ImportReview
  score?: number
  strengths?: string[]
  improvements?: string[]
  completion?: Array<{ id: string; title: string; status: AcceptanceStatus }>
  currentValue: (change: ImportChange) => string | null
  onChoose: (change: ImportChange, value: string) => void
  onEdit: (sectionId: string) => void
  confirmed: boolean
  onConfirm: (value: boolean) => void
  busy: boolean
  error?: string | null
  onSave: () => void
  saveDisabled?: boolean
  issues?: ReactNode
  profileExists: boolean
}

/** Presentation only. The existing editor owns every value and the final save. */
export function ResumeAcceptanceReview({ sections, review, score, strengths = [], improvements = [], completion,
  currentValue, onChoose, onEdit, confirmed, onConfirm, busy, error, onSave, saveDisabled = false, issues, profileExists }: Props) {
  // These markers acknowledge a displayed value; later edits invalidate the marker.
  // No values or choices are persisted by this component.
  const [choices, setChoices] = useState<Record<string, string>>({})
  const choose = (change: ImportChange, value: string) => {
    onChoose(change, value)
    setChoices(previous => ({ ...previous, [change.id]: value }))
    onConfirm(false)
  }
  const completionItems = completion ?? sections
  return <main data-ui-service="resume-review" className="page-gutter mx-auto w-full max-w-6xl min-w-0 py-6 text-ink sm:py-8">
    <header className="mb-6">
      <p className="type-helper font-semibold text-teal">Your resume · Your decision</p>
      <h1 className="mt-2 type-title text-ink">Review your resume</h1>
      <p className="mt-2 max-w-2xl type-body text-ink-soft">Check the extracted details, choose any available suggestions, and confirm what goes into your Career Profile. {profileExists ? 'Your saved profile has not changed.' : 'Your profile has not been created yet.'}</p>
    </header>

    <section aria-labelledby="resume-analysis-title" className="rounded-card border border-line bg-white p-4 sm:p-5">
      <h2 id="resume-analysis-title" className="type-section text-ink">1. Resume analysis overview</h2>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-3">
        <div className="min-w-0 rounded-ctl border border-line bg-canvas p-4">
          <p className="type-label font-semibold text-ink">Current analysis score</p>
          {typeof score === 'number' && Number.isFinite(score) ? <><p className="mt-2 type-stat text-teal">{score}<span className="type-helper text-ink-muted"> /100</span></p><progress className="mt-2 h-2 w-full accent-teal" max={100} value={score} aria-label="Current resume analysis score" /><p className="mt-2 type-helper text-ink-muted">From your existing analysis.</p></> : <p className="mt-2 type-helper text-ink-muted">No analysis score was provided with this import.</p>}
        </div>
        <AnalysisList title="Strengths" items={strengths} empty="No strengths were included in the existing analysis." />
        <AnalysisList title="Improvement areas" items={improvements} empty="No improvement areas were included in the existing analysis." />
      </div>
    </section>

    <section aria-labelledby="resume-suggestions-title" className="mt-6">
      <h2 id="resume-suggestions-title" className="type-section text-ink">2. AI suggestions review</h2>
      <p className="mt-2 type-helper text-ink-soft">Suggestions shown here come from the existing resume processing. You can keep your wording or edit any section manually.</p>
      {review.wordingStatus === 'unavailable' ? <p role="status" className="mt-3 rounded-ctl border border-gold/40 bg-gold-soft p-3 type-helper text-gold-ink">Wording suggestions were unavailable for this import. Your extracted details are still available to review and edit.</p> : null}
      <div className="mt-4 flex min-w-0 flex-col gap-4">
        {sections.map(section => {
          const suggestions = section.changes.filter(change => (change.suggested || (change.restorable && (change.kind === 'spelling' || change.kind === 'wording'))) && change.kind !== 'check' && change.kind !== 'privacy')
          const kept = choices[`section:${section.id}`] === section.content
          return <section key={section.id} aria-labelledby={`review-section-${section.id}`} className="min-w-0 rounded-card border border-line bg-white p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`review-section-${section.id}`} className="type-card text-ink">{section.title}</h3>
              <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onEdit(section.id)} aria-label={`Edit ${section.title} manually`}><PencilSquareIcon className="size-4 shrink-0" aria-hidden="true" />Edit manually</Button>
            </div>
            <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-ctl border border-line bg-canvas p-3">
                <h4 className="type-label font-semibold text-ink-soft">Current extracted content</h4>
                <p className="mt-2 whitespace-pre-wrap break-words type-helper leading-relaxed text-ink">{section.content.trim() ? redactImportText(section.content) : 'Not found in the extracted details.'}</p>
                {section.hint ? <p className="mt-3 type-helper text-ink-muted">{section.hint}</p> : null}
              </div>
              <div className="min-w-0 rounded-ctl border border-teal/30 bg-canvas p-3">
                <h4 className="type-label font-semibold text-teal">AI enhanced suggestion</h4>
                {suggestions.length ? <div className="mt-2 space-y-4">{suggestions.map(change => {
                  const current = currentValue(change)
                  const available = current !== null && (current === change.before || current === change.after)
                  const selected = choices[change.id] === current
                  return <div key={change.id} className="min-w-0 border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <p className="whitespace-pre-wrap break-words type-helper leading-relaxed text-ink">{redactImportText(change.after)}</p>
                    <p className="mt-2 type-helper text-ink-muted">{change.reason}</p>
                    <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`${section.title}: ${change.label}`}>
                      <Button type="button" variant="secondary" size="sm" disabled={busy || !available} aria-pressed={selected && current === change.after} onClick={() => choose(change, change.after)}>Accept suggestion</Button>
                      <Button type="button" variant="ghost" size="sm" disabled={busy || !available} aria-pressed={selected && current === change.before} onClick={() => choose(change, change.before)}>Keep original</Button>
                    </div>
                    {!available ? <p className="mt-2 type-helper text-ink-muted">This text was edited or could not be matched safely. Your current value is kept; use Edit manually to review it.</p> : selected ? <p role="status" className="mt-2 type-helper font-semibold text-teal">{current === change.after ? 'Suggestion selected.' : 'Original wording selected.'}</p> : null}
                    <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 type-helper text-ink-soft">Compare original and suggested wording</summary><ImportComparison change={change} applied={current === change.after} /></details>
                  </div>
                })}</div> : <>
                  <p className="mt-2 type-helper text-ink-muted">No suggestion provided for this section. Keep the extracted details, or edit them manually.</p>
                  <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" disabled>Accept suggestion</Button><Button type="button" variant="ghost" size="sm" disabled={busy} aria-pressed={kept} onClick={() => { setChoices(previous => ({ ...previous, [`section:${section.id}`]: section.content })); onConfirm(false) }}>Keep original</Button></div>
                  {kept ? <p role="status" className="mt-2 type-helper font-semibold text-teal">Current extracted content selected.</p> : null}
                </>}
              </div>
            </div>
          </section>
        })}
      </div>
    </section>

    <section aria-labelledby="resume-completion-title" className="mt-6 rounded-card border border-line bg-white p-4 sm:p-5">
      <h2 id="resume-completion-title" className="type-section text-ink">3. Profile completion</h2>
      <p className="mt-2 type-helper text-ink-muted">A visual checklist of your current details. It does not change your score.</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">{completionItems.map(item => <li key={item.id} className="flex min-w-0 items-center justify-between gap-3 rounded-ctl border border-line bg-canvas px-3 py-3">
        <span className="type-label text-ink">{item.title}</span>
        <span className={`inline-flex shrink-0 items-center gap-1.5 type-helper ${item.status === 'complete' ? 'text-ok' : 'text-gold-ink'}`}>{item.status === 'complete' ? <CheckCircleIcon className="size-5" aria-hidden="true" /> : <ExclamationTriangleIcon className="size-5" aria-hidden="true" />}<span>{item.status === 'complete' ? 'Complete' : item.status === 'optional' ? 'Optional' : 'Needs review'}</span></span>
      </li>)}</ul>
    </section>

    <section aria-labelledby="resume-confirm-title" className="mt-6 rounded-card border border-line bg-white p-4 sm:p-5">
      <h2 id="resume-confirm-title" className="type-section text-ink">4. Save confirmed data</h2>
      <p className="mt-2 type-helper text-ink-soft">Your choices remain in this review until you save. You can continue editing everything in your Career Profile afterward.</p>
      <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 py-2 type-label text-ink"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-teal" checked={confirmed} disabled={busy} onChange={event => onConfirm(event.target.checked)} /><span>I reviewed these details and confirm the selected values for my Career Profile.</span></label>
      {error ? <p role="alert" className="mt-3 rounded-ctl border border-alert/40 bg-alert-soft p-3 type-helper text-alert">{error}</p> : null}
      {issues}
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={!confirmed || busy || saveDisabled} busy={busy} busyLabel="Saving confirmed data…" onClick={onSave}>Save confirmed data</Button>
    </section>
  </main>
}

function AnalysisList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div className="min-w-0 rounded-ctl border border-line bg-canvas p-4"><h3 className="type-label font-semibold text-ink">{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-2 pl-4 type-helper text-ink-soft">{items.map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}</ul> : <p className="mt-2 type-helper text-ink-muted">{empty}</p>}</div>
}
