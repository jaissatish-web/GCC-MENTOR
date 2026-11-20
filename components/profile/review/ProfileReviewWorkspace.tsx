'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './ProfileReviewWorkspace.module.css'

export interface ReviewWorkspaceSection {
  id: string
  title: string
  summary?: string
  status?: 'attention' | 'complete' | 'optional'
}

export interface ProfileReviewWorkspaceProps {
  children: ReactNode
  candidateName?: string
  manualEntry?: boolean
  sections: ReviewWorkspaceSection[]
  activeSectionId?: string
  onSectionChange: (id: string) => void
  unresolvedCount: number
  onUnresolved: () => void
  confirmed: boolean
  onConfirm: (confirmed: boolean) => void
  busy?: boolean
  error?: string | null
  saveDisabled?: boolean
  onSave: () => void
  onCancel?: () => void
  recoveryNotice?: string | null
  changesSummary?: ReactNode
  source?: ReactNode
  sourceLabel?: string
  sourceNotice?: string
  onSourceReattach?: () => void
}

/** Presentation only: all values and writes belong to the existing canonical profile editor. */
export function ProfileReviewWorkspace({ children, manualEntry = false, sections, activeSectionId, onSectionChange, unresolvedCount, onUnresolved, confirmed, onConfirm, busy = false, error, saveDisabled = false, onSave, onCancel, recoveryNotice, changesSummary, source, sourceLabel = 'Originally extracted details', sourceNotice, onSourceReattach }: ProfileReviewWorkspaceProps) {
  const [sourceOpen, setSourceOpen] = useState(false)
  const [modal, setModal] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1099px)').matches)
  const sourceRef = useRef<HTMLElement>(null)
  const sourceTrigger = useRef<HTMLButtonElement>(null)
  const confirmation = useRef<HTMLInputElement>(null)
  // Track the modal breakpoint continuously rather than only when the panel opens. The role,
  // aria-modal and the focus trap must match whatever viewport the panel is actually shown
  // at - including after a resize, or after a navigation that preserves component state.
  // Computing it only inside the sourceOpen effect left the role stale in exactly those
  // cases, which is what made the review guard fail intermittently: it asserted the ARIA
  // role of a panel whose breakpoint had last been read at a different width.
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1099px)')
    const sync = () => setModal(query.matches)
    sync()
    query.addEventListener('change', sync)
    return () => query.removeEventListener('change', sync)
  }, [])
  useEffect(() => {
    if (!sourceOpen) return
    const query = window.matchMedia('(max-width: 1099px)')
    const bodyOverflow = document.body.style.overflow
    const update = () => { setModal(query.matches); document.body.style.overflow = query.matches ? 'hidden' : bodyOverflow }
    update(); query.addEventListener('change', update)
    sourceRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setSourceOpen(false); sourceTrigger.current?.focus(); return }
      if (event.key !== 'Tab' || !query.matches) return
      const focusable = sourceRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex="0"]')
      const first = focusable?.[0], last = focusable?.[focusable.length - 1]
      if (!first || !last) { event.preventDefault(); sourceRef.current?.focus(); return }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === sourceRef.current)) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKey)
    return () => { query.removeEventListener('change', update); document.removeEventListener('keydown', handleKey); document.body.style.overflow = bodyOverflow }
  }, [sourceOpen])
  const closeSource = () => { setSourceOpen(false); sourceTrigger.current?.focus() }
  const save = () => {
    if (busy || saveDisabled) return
    if (!confirmed) { confirmation.current?.scrollIntoView({ block: 'center' }); confirmation.current?.focus(); return }
    onSave()
  }
  return <main className={styles.workspace} data-profile-review-v4="true">
    <header className={styles.header}>
      <p className={styles.eyebrow}>YOUR CAREER, ACCURATELY CAPTURED</p>
      <h1>Review your Career Profile</h1>
      <p>Check your facts. Edit anything in place, then save when you’re ready.</p>
      <ol className={styles.stages} aria-label="Career Profile stages">
        {['Add information', manualEntry ? 'Manual entry' : 'AI extraction', 'Review and edit', 'Confirm and save'].map((label, index) => <li key={label} aria-current={index === 2 ? 'step' : undefined}><span aria-hidden="true">{index < 2 ? '✓' : index + 1}</span>{label}</li>)}
      </ol>
      <div className={styles.headerActions}>
        <button type="button" className={unresolvedCount ? styles.attention : styles.secondary} onClick={onUnresolved}>{unresolvedCount ? `${unresolvedCount} ${unresolvedCount === 1 ? 'detail needs' : 'details need'} checking` : 'Review optional details'}</button>
        <button ref={sourceTrigger} type="button" className={styles.secondary} aria-expanded={sourceOpen} aria-controls="v4-source-panel" onClick={() => setSourceOpen(open => !open)}>Compare with source</button>
      </div>
      {recoveryNotice ? <p className={styles.notice} role="status">{recoveryNotice}</p> : null}
    </header>
    <div className={`${styles.layout} ${sourceOpen ? styles.sourceIsOpen : ''}`}>
      <details className={styles.sectionJump}><summary>Jump to a section</summary><nav className={styles.navigation} aria-label="Review sections">
        {sections.map(section => <button type="button" key={section.id} aria-current={activeSectionId === section.id ? 'true' : undefined} onClick={() => onSectionChange(section.id)}><span>{section.title}</span>{section.summary ? <small>{section.summary}</small> : null}{section.status === 'attention' ? <small className={styles.needsChecking}>Needs checking</small> : section.status === 'optional' ? <small>Optional — not supplied</small> : null}</button>)}
      </nav></details>
      <div className={styles.editor} data-canonical-review-editor>{children}</div>
      {sourceOpen ? <><div className={styles.backdrop} aria-hidden="true" onClick={closeSource} /><aside ref={sourceRef} tabIndex={-1} id="v4-source-panel" className={styles.source} role={modal ? 'dialog' : 'complementary'} aria-modal={modal || undefined} aria-labelledby="v4-source-title"><div className={styles.sourceHeader}><h2 id="v4-source-title">{sourceLabel}</h2><button type="button" className={styles.secondary} onClick={closeSource} aria-label="Close source comparison">Close</button></div>{sourceNotice ? <p className={styles.notice}>{sourceNotice}</p> : null}{source ?? <p>The original file is unavailable in this tab. Your editable Career Profile remains available.</p>}{onSourceReattach ? <button type="button" className={styles.secondary} onClick={onSourceReattach}>Reattach original file to compare</button> : null}</aside></> : null}
    </div>
    <section className={styles.confirmation} aria-labelledby="v4-save-title">
      <h2 id="v4-save-title">Ready to save?</h2>
      {changesSummary ? <div className={styles.changes}>{changesSummary}</div> : null}
      <label className={styles.acknowledgement}><input ref={confirmation} id="v4-profile-confirm" type="checkbox" checked={confirmed} disabled={busy} onChange={event => onConfirm(event.target.checked)} /><span>I have checked the details I supplied. Missing or uncertain information will remain unconfirmed.</span></label>
    </section>
    <div className={styles.saveBar}>
      <div role={error ? 'alert' : 'status'} aria-live={error ? 'assertive' : 'polite'} className={error ? styles.error : styles.saveStatus}>{error ?? (busy ? 'Saving your Career Profile…' : 'Your changes are not saved yet')}</div>
      <div className={styles.saveActions}>{onCancel ? <button type="button" className={styles.secondary} disabled={busy} onClick={onCancel}>Cancel</button> : null}<button type="button" className={styles.primary} disabled={busy || saveDisabled} onClick={save}>{busy ? 'Saving…' : 'Save Career Profile'}</button></div>
    </div>
  </main>
}

export function ReviewSavedSuccess({ preview, onEdit }: { preview: ReactNode; onEdit: () => void }) {
  return <main className={`${styles.workspace} ${styles.success}`} data-profile-review-saved="true"><span className={styles.successIcon} aria-hidden="true">✓</span><p className={styles.eyebrow}>YOUR MASTER PROFILE</p><h1>Career Profile saved</h1><p role="status">Your saved details are ready to use. Missing and uncertain facts remain unconfirmed.</p><div className={styles.successActions}>{preview}<button type="button" className={styles.secondary} onClick={onEdit}>Edit Career Profile</button></div></main>
}
