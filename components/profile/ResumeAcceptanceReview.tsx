'use client'

import { useEffect, useState, type ReactNode } from 'react'
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
  candidateName?: string
  recoveryKey?: string
  originalContents?: Record<string, string>
  suppliedFieldCount?: number
  verifiedFieldCount?: number
  originalIssueIds?: string[]
  currentIssueIds?: string[]
  diagnostic?: ReactNode
  fieldIssues?: Array<{ id: string; field: string; title: string; reason: string; value: string; confirmable?: boolean }>
  onFixField?: (field: string) => void
  onVerifyField?: (id: string) => void
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

type SectionDecision = { content: string; mode: 'reviewed' | 'skipped' }
const suggestionsFor = (section: AcceptanceSection) => section.changes.filter(change =>
  (change.suggested || (change.restorable && (change.kind === 'spelling' || change.kind === 'wording')))
  && change.kind !== 'check' && change.kind !== 'privacy')

/** Presentation only. The canonical editor owns every factual value and the final save. */
export function ResumeAcceptanceReview({ sections, review, candidateName, recoveryKey, originalContents, originalIssueIds, currentIssueIds, suppliedFieldCount, verifiedFieldCount, diagnostic, fieldIssues = [], onFixField, onVerifyField,
  score, strengths = [], improvements = [], completion, currentValue, onChoose, onEdit,
  confirmed, onConfirm, busy, error, onSave, saveDisabled = false, issues, profileExists }: Props) {
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [decisions, setDecisions] = useState<Record<string, SectionDecision>>({})
  const [phase, setPhase] = useState<'diagnostic' | 'review' | 'summary' | 'verify'>('diagnostic')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null)
  const [deferredIssues, setDeferredIssues] = useState<Record<string, string>>({})
  const [hydratedKey, setHydratedKey] = useState<string | undefined>()
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  useEffect(() => {
    setChoices({}); setDecisions({}); setPhase('diagnostic'); setActiveId(null); setActiveIssueId(null); setDeferredIssues({})
    if (recoveryKey) {
      try {
        const raw = sessionStorage.getItem(`${recoveryKey}:markers`)
        const saved: unknown = raw ? JSON.parse(raw) : null
        if (saved && typeof saved === 'object') {
          const data = saved as { importId?: string; choices?: Record<string, unknown>; decisions?: Record<string, unknown>; phase?: string; activeId?: string; activeIssueId?: string; deferredIssues?: Record<string, unknown> }
          if (data.importId === review.id && ['diagnostic', 'review', 'summary', 'verify'].includes(data.phase ?? '')) setPhase(data.phase as 'diagnostic' | 'review' | 'summary' | 'verify')
          if (data.importId === review.id && typeof data.activeId === 'string') setActiveId(data.activeId)
          if (data.importId === review.id && typeof data.activeIssueId === 'string') setActiveIssueId(data.activeIssueId)
          if (data.importId === review.id && data.deferredIssues && typeof data.deferredIssues === 'object') setDeferredIssues(Object.fromEntries(Object.entries(data.deferredIssues).filter((entry): entry is [string, string] => typeof entry[1] === 'string')))
          if (data.importId === review.id && data.choices && typeof data.choices === 'object') setChoices(Object.fromEntries(Object.entries(data.choices).filter((entry): entry is [string, string] => typeof entry[1] === 'string')))
          if (data.importId === review.id && data.decisions && typeof data.decisions === 'object') setDecisions(Object.fromEntries(Object.entries(data.decisions).filter((entry): entry is [string, SectionDecision] => {
            const value = entry[1] as SectionDecision | null
            return Boolean(value && typeof value.content === 'string' && (value.mode === 'reviewed' || value.mode === 'skipped'))
          })))
        }
      } catch { setStorageUnavailable(true) }
    }
    setHydratedKey(`${recoveryKey}:${review.id}`)
  }, [recoveryKey, review.id])
  useEffect(() => {
    if (!recoveryKey || hydratedKey !== `${recoveryKey}:${review.id}`) return
    try { sessionStorage.setItem(`${recoveryKey}:markers`, JSON.stringify({ importId: review.id, choices, decisions, phase, activeId, activeIssueId, deferredIssues })) }
    catch { setStorageUnavailable(true) }
  }, [choices, decisions, phase, activeId, activeIssueId, deferredIssues, recoveryKey, hydratedKey, review.id])

  const decisionFor = (section: AcceptanceSection) => {
    const explicit = decisions[section.id]
    if (explicit?.content === section.content) return explicit.mode
    return undefined
  }
  const decide = (section: AcceptanceSection, mode: SectionDecision['mode']) => {
    setDecisions(previous => ({ ...previous, [section.id]: { content: section.content, mode } }))
    const next = sections[sections.findIndex(item => item.id === section.id) + 1]
    if (next) openSection(next.id)
    else setPhase('summary')
    onConfirm(false)
  }
  const choose = (section: AcceptanceSection, change: ImportChange, value: string) => {
    onChoose(change, value)
    setChoices(previous => ({ ...previous, [change.id]: value }))
    setDecisions(previous => { const next = { ...previous }; delete next[section.id]; return next })
    onConfirm(false)
  }
  const openSection = (id: string) => {
    setPhase('review')
    setActiveId(id)
    requestAnimationFrame(() => {
      const target = document.getElementById(`review-section-${id}`)
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      target?.focus({ preventScroll: true })
    })
  }
  const pendingFieldIssues = fieldIssues.filter(issue => deferredIssues[issue.id] !== issue.value)
  const activeIssue = pendingFieldIssues.find(issue => issue.id === activeIssueId) ?? pendingFieldIssues[0]
  const deferredFieldCount = fieldIssues.length - pendingFieldIssues.length
  const reviewed = sections.filter(section => decisionFor(section) === 'reviewed').length
  const skipped = sections.filter(section => decisionFor(section) === 'skipped').length
  const completionItems = completion ?? sections
  const activeIndex = Math.max(0, sections.findIndex(section => section.id === activeId))
  const changed = sections.filter(section => originalContents?.[section.id] !== undefined && originalContents[section.id] !== section.content)
  const originalIssues = Array.from(new Set(originalIssueIds ?? []))
  const currentIssues = Array.from(new Set(currentIssueIds ?? []))
  const resolved = originalIssues.filter(id => !currentIssues.includes(id))
  const remaining = sections.filter(section => section.status === 'missing' || section.status === 'attention')
  const suggestions = sections.flatMap(suggestionsFor)
  const accepted = suggestions.filter(change => choices[change.id] === change.after && currentValue(change) === change.after).length
  const kept = suggestions.filter(change => choices[change.id] === change.before && currentValue(change) === change.before).length
  return <main data-ui-service="resume-review" className="page-gutter mx-auto w-full max-w-6xl min-w-0 py-6 text-ink sm:py-8">
    <header className="mb-6">
      <p className="type-helper font-semibold text-teal">Your resume · Your decision</p>
      <h1 className="mt-2 type-title text-ink">Review your resume</h1>
      {candidateName?.trim() ? <p className="mt-2 type-card text-ink">{candidateName}</p> : null}
      <p className="mt-2 max-w-2xl type-body text-ink-soft">Check the extracted details, choose any available suggestions, and confirm what goes into your Career Profile. {profileExists ? 'Your saved profile has not changed.' : 'Your profile has not been created yet.'}</p>
    </header>

    {diagnostic}

    <section aria-labelledby="resume-analysis-title" className="rounded-card border border-line bg-white p-4 sm:p-5">
      <h2 id="resume-analysis-title" className="type-section text-ink">1. Career Diagnostic Report</h2>
      <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-3">
        <div className="min-w-0 rounded-ctl border border-line bg-canvas p-4">
          <p className="type-label font-semibold text-ink">Current analysis score</p>
          {typeof score === 'number' && Number.isFinite(score) ? <><p className="mt-2 type-stat text-teal">{score}<span className="type-helper text-ink-muted"> /100</span></p><progress className="mt-2 h-2 w-full accent-teal" max={100} value={score} aria-label="Current resume analysis score" /><p className="mt-2 type-helper text-ink-muted">From your existing analysis. Review decisions do not change this score.</p></> : <p className="mt-2 type-helper text-ink-muted">No analysis score was provided with this import.</p>}
        </div>
        <AnalysisList title="Strengths" items={strengths} empty="No strengths were included in the existing analysis." />
        <AnalysisList title="Improvement areas" items={improvements} empty="No improvement areas were included in the existing analysis." />
      </div>
      <div className="mt-4 rounded-ctl border border-line bg-canvas p-3">
        <p className="type-label font-semibold text-ink">Review progress: {reviewed} of {sections.length} sections reviewed{skipped ? ` · ${skipped} skipped for now` : ''}</p>
        <progress className="review-progress mt-2 h-2 w-full" max={Math.max(sections.length, 1)} value={reviewed} aria-label="Sections reviewed" />
        <p className="mt-2 type-helper text-ink-muted">This tracks your decisions, not resume quality. You can save with skipped sections or keep your original wording.</p>
      </div>
      <nav aria-label="Resume review sections" className="mt-4 grid gap-2 sm:grid-cols-2">{sections.map(section => <button type="button" key={section.id} disabled={busy} onClick={() => openSection(section.id)} className="min-h-11 min-w-0 rounded-ctl border border-line bg-canvas p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
        <span className="flex flex-wrap justify-between gap-2 type-helper"><span className="font-semibold text-ink">{section.title}</span><span className={decisionFor(section) === 'reviewed' ? 'review-status-ok' : section.status === 'complete' ? 'text-ink-soft' : section.status === 'missing' ? 'review-status-missing' : 'review-status-attention'}>{decisionFor(section) === 'reviewed' ? 'Confirmed by you' : section.status === 'complete' ? 'Details captured · not yet verified' : section.status === 'optional' ? 'Optional' : 'Check details'}</span></span>
      </button>)}</nav>
      <p className="mt-2 type-helper text-ink-muted">Captured details still require your review. Select a section to check it using the same Career Profile editor.</p>
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={busy || !sections.length} onClick={() => openSection(sections.find(section => !decisionFor(section))?.id ?? sections[0].id)}>Review and Improve My Career Profile</Button>
    </section>

    <section aria-labelledby="resume-suggestions-title" className="mt-6">
      <h2 id="resume-suggestions-title" className="type-section text-ink">2. Guided career review</h2>
      <p className="mt-2 type-helper text-ink-soft">Suggestions shown here come from the existing resume processing. Keep only facts you can confirm. You can keep your wording or edit any section manually.</p>
      {review.wordingStatus === 'unavailable' ? <p role="status" className="mt-3 rounded-ctl border border-gold/40 bg-gold-soft p-3 type-helper text-gold-ink">Wording suggestions were unavailable for this import. Your extracted details are still available to review and edit.</p> : null}
      {storageUnavailable ? <p role="status" className="mt-3 rounded-ctl border border-gold/40 bg-gold-soft p-3 type-helper text-gold-ink">This browser could not retain review markers. Keep this tab open until you save.</p> : null}
      {phase === 'review' ? <div role="status" className="mt-4 rounded-ctl border border-line bg-canvas p-3 type-helper text-ink">Step {activeIndex + 1} of {sections.length} · {reviewed} confirmed · {skipped} deferred. Check facts before choosing optional wording improvements.</div> : <p className="mt-3 type-helper text-ink-muted">{phase === 'diagnostic' ? 'Start when you are ready. You will review one section at a time.' : 'Your review decisions are retained. Select a section above to edit again.'}</p>}
      {phase === 'review' && activeIssue ? <section aria-labelledby="guided-field-title" className="mt-4 min-w-0 rounded-card border border-gold/40 bg-white p-4 sm:p-5">
        <p role="status" className="type-helper text-ink-soft">Factual checks first · {pendingFieldIssues.length} awaiting review · {deferredFieldCount} deferred. Corrected checks disappear only when the underlying information is valid.</p>
        <h3 id="guided-field-title" className="mt-3 type-card text-ink">{activeIssue.title}</h3>
        <p className="mt-2 type-helper text-ink-soft">{activeIssue.reason}</p>
        <div className="mt-3 min-w-0 rounded-ctl border border-line bg-canvas p-3"><p className="type-label font-semibold text-ink">Current field information</p><p className="mt-2 whitespace-pre-wrap break-words type-helper text-ink">{redactImportText(activeIssue.value) || 'Not recorded. Supply the fact only if you know it.'}</p></div>
        <p className="mt-3 type-helper text-ink-muted">Open the matching Career Profile field to correct or verify this detail. We will keep your other review decisions. Deferring this check does not verify it or remove a save requirement.</p>
        <div className="mt-4 flex flex-wrap gap-2">{activeIssue.confirmable && activeIssue.value.trim() && onVerifyField ? <Button type="button" variant="secondary" disabled={busy} onClick={() => { onConfirm(false); onVerifyField(activeIssue.id) }}>I verified this value</Button> : null}<Button type="button" disabled={busy || !onFixField} onClick={() => { setActiveIssueId(activeIssue.id); onFixField?.(activeIssue.field) }}>Correct this field</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { setDeferredIssues(previous => ({ ...previous, [activeIssue.id]: activeIssue.value })); setActiveIssueId(null); onConfirm(false) }}>Review later</Button></div>
      </section> : null}
      {phase === 'review' && !activeIssue && deferredFieldCount ? <p className="mt-3 type-helper text-ink-soft">{deferredFieldCount} factual checks are deferred and remain unresolved. <button type="button" className="min-h-11 font-semibold text-teal" disabled={busy} onClick={() => setDeferredIssues({})}>Revisit deferred checks</button></p> : null}
      <div className="mt-4 flex min-w-0 flex-col gap-4">
        {sections.map((section, sectionIndex) => {
          const suggestions = suggestionsFor(section)
          const decision = decisionFor(section)
          const isExpanded = phase === 'review' && !activeIssue && sectionIndex === activeIndex
          const original = originalContents?.[section.id] ?? section.content
          return <section key={section.id} aria-labelledby={`review-section-${section.id}`} className={`min-w-0 rounded-card border bg-white p-4 sm:p-5 ${decision === 'reviewed' ? 'border-ok' : 'border-line'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={`review-section-${section.id}`} tabIndex={-1} className="type-card scroll-mt-24 text-ink">{section.title}</h3>
              {decision ? <span role="status" className={`inline-flex items-center gap-1.5 type-helper ${decision === 'reviewed' ? 'review-status-ok' : 'review-status-attention'}`}>{decision === 'reviewed' ? <CheckCircleIcon className="size-5" aria-hidden="true" /> : <ExclamationTriangleIcon className="size-5" aria-hidden="true" />}{decision === 'reviewed' ? 'Reviewed' : 'Skipped for now'}</span> : null}
              <div className="flex flex-wrap gap-2">
                {decision ? <Button type="button" variant="ghost" size="sm" disabled={busy} aria-expanded={Boolean(isExpanded)} aria-controls={`review-content-${section.id}`} onClick={() => isExpanded ? setPhase('summary') : openSection(section.id)}>{isExpanded ? 'Collapse' : 'Reopen'}</Button> : null}
                <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onEdit(section.id)} aria-label={`Edit ${section.title} manually`}><PencilSquareIcon className="size-4 shrink-0" aria-hidden="true" />Edit manually</Button>
              </div>
            </div>
            {isExpanded ? <div id={`review-content-${section.id}`}>
              <p className="mt-3 type-helper font-semibold text-ink">{section.status === 'missing' ? 'Some information is missing. Add only details you know, or defer it.' : section.status === 'attention' ? 'Check the unclear or incomplete details below.' : section.status === 'optional' ? 'This section is optional. Add it only when relevant to your career.' : 'Information was captured. Confirm it matches your actual career.'}</p>
              {section.changes.filter(change => change.kind === 'check' || change.kind === 'privacy' || !suggestions.includes(change)).map(change => <p key={change.id} className="mt-3 rounded-ctl border border-gold/40 bg-gold-soft p-3 type-helper text-gold-ink"><span className="font-semibold">{change.label}: </span>{change.reason}</p>)}
              <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="min-w-0 rounded-ctl border border-line bg-canvas p-3">
                  <h4 className="type-label font-semibold text-ink-soft">Original extracted content</h4>
                  <p className="mt-2 whitespace-pre-wrap break-words type-helper leading-relaxed text-ink">{original.trim() ? redactImportText(original) : 'Not found in the extracted details.'}</p>
                  {original !== section.content ? <><h4 className="mt-4 type-label font-semibold text-teal">Your selected content</h4><p className="mt-2 whitespace-pre-wrap break-words type-helper text-ink">{redactImportText(section.content) || 'No content selected.'}</p></> : null}
                  {section.hint ? <p className="mt-3 type-helper text-ink-muted">{section.hint}</p> : null}
                </div>
                <div className="min-w-0 rounded-ctl border border-teal/30 bg-canvas p-3">
                  <h4 className="type-label font-semibold text-teal">Optional wording suggestion</h4>
                  {suggestions.length ? <div className="mt-2 space-y-4">{suggestions.map(change => {
                    const current = currentValue(change)
                    const available = current !== null && (current === change.before || current === change.after)
                    const selected = choices[change.id] !== undefined && choices[change.id] === current
                    return <div key={change.id} className="min-w-0 border-t border-line pt-3 first:border-t-0 first:pt-0">
                      <p className="type-label font-semibold text-ink">{change.label}</p>
                      <p className="mt-2 whitespace-pre-wrap break-words type-helper leading-relaxed text-ink">{redactImportText(change.after)}</p>
                      <p className="mt-2 type-helper text-ink-muted">{change.reason}</p>
                      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`${section.title}: ${change.label}`}>
                        <Button type="button" variant="secondary" size="sm" disabled={busy || !available} aria-pressed={selected && current === change.after} onClick={() => choose(section, change, change.after)}>Accept suggestion</Button>
                        <Button type="button" variant="ghost" size="sm" disabled={busy || !available} aria-pressed={selected && current === change.before} onClick={() => choose(section, change, change.before)}>Keep original</Button>
                      </div>
                      {!available ? <p className="mt-2 type-helper text-ink-muted">This text was edited or could not be matched safely. Your current value is kept; use Edit manually to review it.</p> : selected ? <p role="status" className="mt-2 type-helper font-semibold text-ok">{current === change.after ? 'Suggestion selected.' : 'Original wording selected.'}</p> : null}
                      <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 type-helper text-ink-soft">Compare original and suggested wording</summary><ImportComparison change={change} applied={current === change.after} /></details>
                    </div>
                  })}</div> : <>
                    <p className="mt-2 type-helper text-ink-muted">No suggestion provided for this section. Keep the extracted details, or edit them manually.</p>
                    <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" disabled>Accept suggestion</Button><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => decide(section, 'reviewed')}>{original === section.content ? 'Keep original' : 'Keep current details'}</Button></div>
                  </>}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">{sectionIndex > 0 ? <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => openSection(sections[sectionIndex - 1].id)}>Back</Button> : null}<Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => decide(section, 'reviewed')}>Confirm current details</Button><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => decide(section, 'skipped')}>Skip for now</Button></div>
              <p className="mt-2 type-helper text-ink-muted">Skipping keeps your current information. You can return to this section anytime.</p>
            </div> : null}
          </section>
        })}
      </div>
      {phase === 'review' ? <Button type="button" variant="ghost" className="mt-4" disabled={busy} onClick={() => setPhase('summary')}>See improvement summary</Button> : null}
    </section>

    {phase === 'summary' || phase === 'verify' ? <section aria-labelledby="improvement-summary-title" className="mt-6 rounded-card border border-line bg-white p-4 sm:p-5">
      <h2 id="improvement-summary-title" className="type-section text-ink">Before and after your review</h2>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Sections edited', changed.length], ['Sections confirmed', reviewed], ['Sections deferred', skipped],
          ...(suppliedFieldCount === undefined ? [] : [['Missing fields supplied', suppliedFieldCount]]),
          ...(verifiedFieldCount === undefined ? [] : [['Source values explicitly verified', verifiedFieldCount]]),
          ['Writing suggestions accepted', accepted], ['Original wording retained', kept], ['Suggestions not selected', suggestions.length - accepted - kept],
          ...(originalIssueIds && currentIssueIds ? [['Original validation findings', originalIssues.length], ['Validation findings resolved', resolved.length], ['Validation findings still requiring attention', currentIssues.length]] : [['Sections still needing attention', remaining.length]]),
        ].map(([label, count]) => <div key={label} className="min-w-0 rounded-ctl bg-canvas p-3"><dt className="type-helper text-ink-soft">{label}</dt><dd className="mt-1 type-card font-semibold text-ink">{count}</dd></div>)}
      </dl>
      <p className="mt-3 type-helper text-ink-muted">Edits and confirmations count sections; findings count the actual validation conditions. A confirmation alone does not fix a missing field. Changes here do not change your original PDF or DOCX, repair its layout, or increase the existing analysis score.</p>
      {changed.length ? <ul className="mt-4 space-y-3">{changed.map(section => <li key={section.id} className="border-t border-line pt-3"><button type="button" disabled={busy} className="min-h-11 text-left type-label font-semibold text-teal" onClick={() => openSection(section.id)}>{section.title} · Review changes</button><div className="grid min-w-0 gap-3 sm:grid-cols-2"><div className="min-w-0"><p className="type-helper font-semibold text-ink-soft">Before</p><p className="mt-1 whitespace-pre-wrap break-words type-helper text-ink">{redactImportText(originalContents?.[section.id] ?? '') || 'Not recorded'}</p></div><div className="min-w-0"><p className="type-helper font-semibold text-ink-soft">Now selected</p><p className="mt-1 whitespace-pre-wrap break-words type-helper text-ink">{redactImportText(section.content) || 'Not recorded'}</p></div></div></li>)}</ul> : <p className="mt-3 type-helper text-ink-soft">No changes to the original extracted section content have been detected.</p>}
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={busy} onClick={() => setPhase('verify')}>Verify final Career Profile</Button>
    </section> : null}

    <section aria-labelledby="resume-completion-title" className="mt-6 rounded-card border border-line bg-white p-4 sm:p-5">
      <h2 id="resume-completion-title" className="type-section text-ink">3. Profile completion</h2>
      <p className="mt-2 type-helper text-ink-muted">A visual checklist of your current details. It does not change your score.</p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">{completionItems.map(item => <li key={item.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-ctl border border-line bg-canvas px-3 py-3">
        <span className="type-label text-ink">{item.title}</span>
        <span className={`inline-flex shrink-0 items-center gap-1.5 type-helper ${decisions[item.id]?.mode === 'reviewed' && decisions[item.id]?.content === sections.find(section => section.id === item.id)?.content ? 'review-status-ok' : 'text-ink-soft'}`}><span>{decisions[item.id]?.mode === 'reviewed' && decisions[item.id]?.content === sections.find(section => section.id === item.id)?.content ? 'Confirmed by you' : item.status === 'complete' ? 'Captured' : item.status === 'optional' ? 'Optional' : 'Needs review'}</span></span>
      </li>)}</ul>
    </section>

    {phase === 'verify' ? <section aria-labelledby="resume-final-preview-title" className="mt-6 rounded-card border border-line bg-white p-4 sm:p-5">
      <h2 id="resume-final-preview-title" className="type-section text-ink">Final Career Profile verification</h2>
      <p className="mt-2 type-helper text-ink-soft">These are the selected career details that will be saved. Review each applicable section and edit anything that is incorrect.</p>
      <div className="mt-4 space-y-4">{sections.map(section => <section key={section.id} className="min-w-0 border-t border-line pt-3"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="type-card text-ink">{section.title}</h3><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onEdit(section.id)}>Edit {section.title}</Button></div><p className="mt-2 whitespace-pre-wrap break-words type-helper text-ink">{redactImportText(section.content) || 'Not recorded. You can add this later when applicable.'}</p></section>)}</div>
    </section> : null}

    {phase === 'verify' ? <section aria-labelledby="resume-confirm-title" className="mt-6 rounded-card border border-line bg-white p-4 sm:p-5">
      <h2 id="resume-confirm-title" className="type-section text-ink">4. Save confirmed data</h2>
      <p className="mt-2 type-helper text-ink-soft">Your choices remain in this review until you save. You can continue editing everything in your Career Profile afterward.</p>
      <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 py-2 type-label text-ink"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-teal" checked={confirmed} disabled={busy} onChange={event => onConfirm(event.target.checked)} /><span>I reviewed these details and confirm the selected values for my Career Profile.</span></label>
      {error ? <p role="alert" className="mt-3 rounded-ctl border border-alert/40 bg-alert-soft p-3 type-helper text-alert">{error}</p> : null}
      {issues}
      <Button type="button" className="mt-4 w-full sm:w-auto" disabled={!confirmed || busy || saveDisabled} busy={busy} busyLabel="Saving confirmed data…" onClick={onSave}>Save confirmed data</Button>
    </section> : <div className="mt-6"><Button type="button" variant="secondary" disabled={busy} onClick={() => setPhase('summary')}>Continue to improvement summary</Button></div>}
  </main>
}

function AnalysisList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div className="min-w-0 rounded-ctl border border-line bg-canvas p-4"><h3 className="type-label font-semibold text-ink">{title}</h3>{items.length ? <ul className="mt-2 list-disc space-y-2 pl-4 type-helper text-ink-soft">{items.map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}</ul> : <p className="mt-2 type-helper text-ink-muted">{empty}</p>}</div>
}
