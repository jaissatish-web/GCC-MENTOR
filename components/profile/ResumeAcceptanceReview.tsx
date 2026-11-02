'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { CheckCircleIcon, ExclamationTriangleIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'
import { ImportComparison } from './ImportComparison'
import { ReviewSectionContent, type ReviewDisplayGroup } from './ReviewSectionContent'
import { redactImportText, type ImportChange, type ImportReview } from '@/lib/resumeParse/importReview'

export type AcceptanceStatus = 'complete' | 'attention' | 'missing' | 'optional'
export interface AcceptanceSection {
  id: string
  title: string
  content: string
  status: AcceptanceStatus
  hint?: string
  changes: ImportChange[]
  displayGroups?: ReviewDisplayGroup[]
  field?: string
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
  fieldIssues?: Array<{ id: string; field: string; title: string; reason: string; value: string; confirmable?: boolean; blocking?: boolean }>
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
  score, strengths = [], improvements = [], currentValue, onChoose, onEdit,
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
    const currentIndex = visibleSections.findIndex(item => item.id === section.id)
    const next = currentIndex < 0 ? undefined : visibleSections[currentIndex + 1]
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
    const section = sections.find(item => item.id === id)
    const owner = (field: string) => {
      if (/^(full_name|email|phone|whatsapp|linkedin_url|date_of_birth|nationality|passport|current_location)/.test(field)) return 'sec_identity'
      if (field.startsWith('professional_summary')) return 'sec_summary'
      const group = field.split('.')[0]
      return `sec_${group}`
    }
    const issue = fieldIssues.find(item => deferredIssues[item.id] !== item.value && (owner(item.field) === id || section?.field === item.field.split('.')[0]))
    setActiveIssueId(issue?.id ?? `section:${id}`)
    requestAnimationFrame(() => {
      const target = document.getElementById('guided-field-title') ?? document.getElementById(`review-section-${id}`)
      target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
      target?.focus({ preventScroll: true })
    })
  }
  const needsAttention = (section: AcceptanceSection) => section.status === 'missing' || section.status === 'attention'
  const verifiedSection = (section: AcceptanceSection) => decisionFor(section) === 'reviewed' && !needsAttention(section)
  const pendingFieldIssues = fieldIssues.filter(issue => deferredIssues[issue.id] !== issue.value)
  const activeIssue = activeIssueId?.startsWith('section:') ? undefined : pendingFieldIssues.find(issue => issue.id === activeIssueId) ?? pendingFieldIssues[0]
  const deferredFieldCount = fieldIssues.length - pendingFieldIssues.length
  const reviewed = sections.filter(section => decisionFor(section) === 'reviewed').length
  const skipped = sections.filter(section => decisionFor(section) === 'skipped').length
  const activeIndex = Math.max(0, sections.findIndex(section => section.id === activeId))
  const changed = sections.filter(section => originalContents?.[section.id] !== undefined && originalContents[section.id] !== section.content)
  const originalIssues = Array.from(new Set(originalIssueIds ?? []))
  const currentIssues = Array.from(new Set(currentIssueIds ?? []))
  const resolved = originalIssues.filter(id => !currentIssues.includes(id))
  const remaining = sections.filter(section => section.status === 'missing' || section.status === 'attention')
  const suggestions = sections.flatMap(suggestionsFor)
  const accepted = suggestions.filter(change => choices[change.id] === change.after && currentValue(change) === change.after).length
  const kept = suggestions.filter(change => choices[change.id] === change.before && currentValue(change) === change.before).length
  const activeSection = sections[activeIndex]
  const visibleSections = sections.filter(section => section.content.trim() || needsAttention(section))
  const emptySections = sections.filter(section => !visibleSections.includes(section))
  const phaseIndex = ['diagnostic', 'review', 'summary', 'verify'].indexOf(phase)
  const sectionCards = (items: AcceptanceSection[]) => <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{items.map(section => {
    const decision = decisionFor(section)
    return <button key={section.id} type="button" data-review-target={section.id} data-review-status={needsAttention(section) ? 'attention' : decision ?? 'unreviewed'} disabled={busy} onClick={event => { const disclosure = event.currentTarget.closest('nav')?.closest('details'); if (disclosure) disclosure.open = false; openSection(section.id) }} className={`flex min-h-24 min-w-0 flex-col items-start justify-between gap-3 rounded-card border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${needsAttention(section) ? 'border-alert bg-alert-soft' : verifiedSection(section) ? 'border-ok bg-ok-soft' : 'border-line bg-white'}`}>
      <span className="type-label font-semibold text-ink">{section.title}</span>
      <span className={`inline-flex items-center gap-1.5 type-caption font-semibold ${needsAttention(section) ? 'review-status-missing' : verifiedSection(section) ? 'review-status-ok' : 'review-status-attention'}`}>
        {verifiedSection(section) ? <CheckCircleIcon className="size-4" aria-hidden="true" /> : needsAttention(section) ? <ExclamationTriangleIcon className="size-4" aria-hidden="true" /> : <PencilSquareIcon className="size-4" aria-hidden="true" />}
        {needsAttention(section) ? 'Check details' : verifiedSection(section) ? 'Reviewed' : decision === 'skipped' ? 'Review later' : section.status === 'optional' ? 'Optional' : 'Ready to review'}
      </span>
    </button>
  })}</div>
  const sectionNavigation = <nav aria-label="Resume review sections">{sectionCards(visibleSections)}{emptySections.length ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 type-helper font-semibold text-teal">Optional sections · {emptySections.length}</summary>{sectionCards(emptySections)}</details> : null}</nav>
  return <main data-ui-service="resume-review" data-review-phase={phase} className="page-gutter mx-auto w-full max-w-4xl min-w-0 py-5 text-ink sm:py-7">
    <header className="mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="type-helper font-semibold text-teal">Career Profile{candidateName?.trim() ? ` · ${candidateName}` : ''}</p><span className="type-caption text-ink-muted">{profileExists ? 'Changes not saved' : 'Not saved yet'}</span></div>
      <h1 className="mt-2 type-title text-ink">Review your resume</h1>
      <ol aria-label="Review stages" className="mt-4 grid grid-cols-4 gap-2">{['Overview', 'Review', 'Summary', 'Save'].map((label, index) => <li key={label} aria-current={index === phaseIndex ? 'step' : undefined} className={`border-t-2 pt-2 type-caption ${index === phaseIndex ? 'border-teal font-semibold text-teal' : 'border-line text-ink-muted'}`}>{label}</li>)}</ol>
    </header>
    {phase !== 'diagnostic' ? <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => setPhase('diagnostic')}>View diagnostic report</Button><span className="type-caption text-ink-muted">{reviewed} reviewed · {skipped} later</span></div> : null}
    {review.wordingStatus === 'unavailable' ? <p role="status" className="mb-3 rounded-ctl border border-gold bg-gold-soft p-3 type-helper review-status-attention">Writing suggestions unavailable</p> : null}
    {storageUnavailable || !recoveryKey ? <p role="status" className="mb-3 rounded-ctl border border-gold bg-gold-soft p-3 type-helper text-gold-ink">Keep this tab open until you save.</p> : null}

    {phase === 'diagnostic' ? <>
      {diagnostic}
      {typeof score === 'number' && Number.isFinite(score) || strengths.length || improvements.length ? <details className="mt-3 rounded-card border border-line bg-white p-3"><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">Resume analysis</summary>{typeof score === 'number' && Number.isFinite(score) ? <div data-analysis-score className="mt-3"><span className="type-card">{score}/100</span><progress className="mt-2 h-2 w-full" max={100} value={score} aria-label="Current resume analysis score" /><p className="type-caption text-ink-muted">Existing analysis score</p></div> : null}{strengths.length ? <AnalysisList title="Strengths" items={strengths} /> : null}{improvements.length ? <AnalysisList title="Improvements" items={improvements} /> : null}</details> : null}
      <section aria-labelledby="resume-analysis-title" className="mt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 id="resume-analysis-title" className="type-section text-ink">Choose a section</h2><span className="type-caption text-ink-muted">{visibleSections.filter(section => decisionFor(section) === 'reviewed').length}/{visibleSections.length} reviewed</span></div>
        <Button type="button" className="mt-4 w-full" disabled={busy || !visibleSections.length} onClick={() => { openSection(visibleSections.find(section => !decisionFor(section))?.id ?? visibleSections[0].id); setActiveIssueId(pendingFieldIssues[0]?.id ?? null) }}>Review details</Button>
        <div className="mt-3">{sectionNavigation}</div>

        <Button type="button" variant="ghost" className="mt-2 w-full" disabled={busy} onClick={() => setPhase('summary')}>Review summary</Button>
      </section>
    </> : null}

    {phase === 'review' ? <section aria-labelledby="resume-suggestions-title">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 id="resume-suggestions-title" className="type-section text-ink">{activeIssue ? 'Check this detail' : visibleSections.includes(activeSection) ? `Section ${visibleSections.indexOf(activeSection) + 1} of ${visibleSections.length}` : 'Optional details' }</h2><span className="type-caption text-ink-muted">{activeIssue ? `${pendingFieldIssues.length} checks left` : `${reviewed} reviewed`}</span></div>
      {activeIssue ? <section key={activeIssue.id} aria-labelledby="guided-field-title" data-review-field={activeIssue.field} className="min-w-0 rounded-card border-2 border-alert bg-white p-4 sm:p-5">
        <span className="review-status-missing type-caption font-semibold">{activeIssue.blocking === false ? 'Optional · saving allowed' : 'Needs attention'}</span>
        <h3 id="guided-field-title" tabIndex={-1} className="mt-2 type-card text-ink">{activeIssue.title}</h3>
        <p className="mt-2 type-helper text-ink-soft">{activeIssue.reason.split(/(?<=[.!?])\s/)[0].slice(0, 180)}</p>
        <div className="mt-4 rounded-ctl bg-canvas p-3"><p className="type-caption font-semibold text-ink-muted">Current detail</p><div className="mt-1"><ReviewSectionContent content={activeIssue.value} /></div></div>
        {activeIssue.blocking === false ? <p className="mt-3 type-helper review-status-missing">You can keep this value and still save.</p> : null}
        <div className="mt-4 flex flex-wrap gap-2">{activeIssue.confirmable && activeIssue.value.trim() && onVerifyField ? <Button type="button" variant="secondary" disabled={busy} onClick={() => { onConfirm(false); onVerifyField(activeIssue.id) }}>{activeIssue.field.endsWith('.current_status') ? 'Confirm this is my current role' : 'I verified this value'}</Button> : null}<Button type="button" disabled={busy || !onFixField} onClick={() => { setActiveIssueId(activeIssue.id); onFixField?.(activeIssue.field) }}>Correct this field</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { setDeferredIssues(previous => ({ ...previous, [activeIssue.id]: activeIssue.value })); setActiveIssueId(null); onConfirm(false) }}>Review later</Button></div>
        <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 type-helper text-teal">Why this matters</summary><p className="type-helper text-ink-soft">{activeIssue.reason}</p></details>
      </section> : activeSection ? <section key={activeSection.id} data-review-card aria-labelledby={`review-section-${activeSection.id}`} className={`min-w-0 rounded-card border bg-white p-4 sm:p-5 ${needsAttention(activeSection) ? 'border-alert' : verifiedSection(activeSection) ? 'border-ok' : 'border-line'}`}>
        <header className="flex flex-wrap items-center justify-between gap-2"><h3 id={`review-section-${activeSection.id}`} tabIndex={-1} className="type-card scroll-mt-24 text-ink">{activeSection.title}</h3><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onEdit(activeSection.id)} aria-label={`Edit ${activeSection.title} manually`}><PencilSquareIcon className="size-4" aria-hidden="true" />Edit manually</Button></header>
        <p className="mt-2 type-caption text-ink-muted">{needsAttention(activeSection) ? 'Check missing or unclear details.' : activeSection.status === 'optional' ? 'Add only if relevant.' : 'Check these details match your experience.'}</p>
        <div id={`review-content-${activeSection.id}`} className="mt-4">
          <div data-review-content="selected"><ReviewSectionContent content={activeSection.content} groups={activeSection.displayGroups} /></div>
          {activeSection.changes.filter(change => change.kind === 'check' || change.kind === 'privacy').length ? <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 type-helper text-teal">Import notes</summary>{activeSection.changes.filter(change => change.kind === 'check' || change.kind === 'privacy').map(change => <p key={change.id} className="mt-2 type-helper text-ink-soft">{change.label}: {change.reason}</p>)}</details> : null}
          {suggestionsFor(activeSection).length ? <section className="mt-4 rounded-card border border-teal/30 bg-canvas p-3"><h4 className="type-label font-semibold text-teal">Suggested wording</h4>{suggestionsFor(activeSection).map(change => {
            const current = currentValue(change), available = current !== null && (current === change.before || current === change.after), selected = choices[change.id] !== undefined && choices[change.id] === current
            return <div key={change.id} className="mt-3 min-w-0"><p className="type-label font-semibold text-ink">{change.label}</p><p className="mt-2 whitespace-pre-wrap break-words type-helper text-ink">{redactImportText(change.after)}</p><div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={`${activeSection.title}: ${change.label}`}><Button type="button" variant="secondary" size="sm" disabled={busy || !available} aria-pressed={selected && current === change.after} onClick={() => choose(activeSection, change, change.after)}>Accept suggestion</Button><Button type="button" variant="ghost" size="sm" disabled={busy || !available} aria-pressed={selected && current === change.before} onClick={() => choose(activeSection, change, change.before)}>Keep original</Button></div>{!available ? <p className="mt-2 type-caption text-ink-muted">Your manual edit is kept.</p> : selected ? <p role="status" className="mt-2 type-helper review-status-ok">{current === change.after ? 'Suggestion selected.' : 'Original wording selected.'}</p> : null}<details className="mt-2"><summary className="min-h-11 cursor-pointer py-2 type-helper text-teal">Compare & why</summary><p className="type-helper text-ink-soft">{change.reason}</p><ImportComparison change={change} applied={current === change.after} /></details></div>
          })}</section> : null}
          <details className="mt-3"><summary className="min-h-11 cursor-pointer py-2 type-helper text-teal">Original resume details</summary><div data-review-content="original"><ReviewSectionContent content={originalContents?.[activeSection.id] ?? activeSection.content} /></div></details>
          <div className="mt-4 flex flex-wrap gap-2">{visibleSections.indexOf(activeSection) > 0 ? <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => openSection(visibleSections[visibleSections.indexOf(activeSection) - 1].id)}>Back</Button> : null}<Button type="button" disabled={busy} onClick={() => decide(activeSection, 'reviewed')}>Confirm current details</Button><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => decide(activeSection, 'skipped')}>Skip for now</Button></div>
        </div>
      </section> : null}
      {deferredFieldCount ? <p className="mt-3 type-caption text-ink-muted">{deferredFieldCount} checks for later <button type="button" className="min-h-11 px-2 font-semibold text-teal" disabled={busy} onClick={() => { setDeferredIssues({}); setActiveIssueId(null) }}>Revisit deferred checks</button></p> : null}
      <Button type="button" variant="ghost" className="mt-4" disabled={busy} onClick={() => setPhase('summary')}>Review summary</Button>
    </section> : null}

    {phase === 'summary' ? <section aria-labelledby="improvement-summary-title">
      <h2 id="improvement-summary-title" className="type-section text-ink">Your review summary</h2>
      <dl className="mt-4 grid grid-cols-3 gap-2">{[['Updated', changed.length, 'border-teal'], ['Reviewed', sections.filter(verifiedSection).length, 'border-ok'], ['Still open', currentIssues.length, 'border-alert']].map(([label, count, border]) => <div key={label} className={`min-w-0 rounded-card border bg-white p-3 ${border}`}><dt className="type-caption text-ink-muted">{label}</dt><dd className="mt-1 type-stat text-ink">{count}</dd></div>)}</dl>
      {changed.length ? <div className="mt-4 space-y-2">{changed.map(section => <details key={section.id} className="rounded-card border border-line bg-white p-3"><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">{section.title} · Updated</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><div><h3 className="type-caption font-semibold text-ink-muted">Before</h3><ReviewSectionContent content={originalContents?.[section.id] ?? ''} /></div><div><h3 className="type-caption font-semibold text-teal">Now</h3><ReviewSectionContent content={section.content} groups={section.displayGroups} /></div></div><Button type="button" variant="ghost" size="sm" onClick={() => openSection(section.id)}>Review changes</Button></details>)}</div> : <p className="mt-3 type-helper text-ink-soft">Original details retained.</p>}
      <details className="mt-3 rounded-card border border-line bg-white p-3"><summary className="min-h-11 cursor-pointer type-helper font-semibold text-teal">Review details</summary><dl className="mt-3 grid grid-cols-2 gap-3">{[['Sections deferred', skipped], ['Missing fields supplied', suppliedFieldCount ?? 0], ['Source values explicitly verified', verifiedFieldCount ?? 0], ['Writing suggestions accepted', accepted], ['Original wording retained', kept], ['Suggestions not selected', suggestions.length - accepted - kept], ['Original validation findings', originalIssues.length], ['Validation findings resolved', resolved.length], ['Validation findings still requiring attention', currentIssueIds ? currentIssues.length : remaining.length]].map(([label,count]) => <div key={label}><dt className="type-caption text-ink-muted">{label}</dt><dd className="type-label font-semibold text-ink">{count}</dd></div>)}</dl><p className="mt-3 type-caption text-ink-muted">Profile changes do not edit your uploaded file or increase its analysis score.</p></details>
      <Button type="button" className="mt-4 w-full" disabled={busy} onClick={() => setPhase('verify')}>Preview profile</Button>
    </section> : null}

    {phase === 'verify' ? <>
      <section aria-labelledby="resume-final-preview-title"><h2 id="resume-final-preview-title" className="type-section text-ink">Final Career Profile verification</h2><div className="mt-4 space-y-2">{visibleSections.map(section => <details key={section.id} name="final-profile" className={`min-w-0 rounded-card border bg-white p-3 ${needsAttention(section) ? 'border-alert' : verifiedSection(section) ? 'border-ok' : 'border-line'}`}><summary className="min-h-11 cursor-pointer type-label font-semibold text-ink">{section.title}</summary><div className="mt-3"><ReviewSectionContent content={section.content} groups={section.displayGroups} /><Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => onEdit(section.id)}>Edit {section.title}</Button></div></details>)}</div></section>
      <section aria-labelledby="resume-confirm-title" className="mt-4 rounded-card border border-line bg-white p-4"><h2 id="resume-confirm-title" className="type-card text-ink">Ready to save?</h2><label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3 py-2 type-label text-ink"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-teal" checked={confirmed} disabled={busy} onChange={event => onConfirm(event.target.checked)} /><span>I confirm these Career Profile details.</span></label>{error ? <p role="alert" className="mt-3 rounded-ctl border border-alert bg-alert-soft p-3 type-helper review-status-missing">{error}</p> : null}{issues}<Button type="button" className="mt-3 w-full" disabled={!confirmed || busy || saveDisabled} busy={busy} busyLabel="Saving…" onClick={onSave}>Save Career Profile</Button></section>
    </> : null}
    {phase !== 'diagnostic' ? <details key={phase} className="mt-4"><summary className="min-h-11 cursor-pointer py-2 type-helper font-semibold text-teal">All sections</summary>{sectionNavigation}</details> : null}
  </main>
}

function AnalysisList({ title, items }: { title: string; items: string[] }) {
  return <div className="mt-3"><h3 className="type-label font-semibold text-ink">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-4 type-helper text-ink-soft">{items.map((item, index) => <li key={`${index}:${item}`}>{item}</li>)}</ul></div>
}
