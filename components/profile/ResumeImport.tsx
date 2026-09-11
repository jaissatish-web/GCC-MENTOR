'use client'

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import {
  ArrowPathIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  DocumentArrowUpIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { Button, buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ProcessingInline } from '@/components/ui/Processing'
import { EXTRACTION_NOTES } from '@/lib/processingNotes'
import type { CareerProfileDraft } from '@/types/careerProfile'

/**
 * Inline resume import, on the Career Profile page (founder decision 2026-08-18).
 *
 * This replaces the old multi-screen "Create Resume" walk — /create-resume →
 * /onboarding/extracting → back to /profile — which dipped out of the app shell
 * and whose two "back" affordances went to different places. Everything now
 * happens on ONE screen inside the shell: pick a file or paste text, watch the
 * extraction here, and the resulting draft is handed to the parent, which runs
 * the SAME add-or-replace decision the page already had. No navigation, so no
 * inconsistent back button.
 *
 * It only produces a draft (POST /api/parse/upload | /api/parse/text). What
 * happens to that draft — merge, replace, or first-time load — is the parent's
 * call, exactly as when a draft used to arrive via sessionStorage.
 *
 * COLLAPSIBLE ONCE A PROFILE EXISTS (founder request 2026-09-11). A user who
 * had already uploaded a CV was still greeted by "Fill this in from your CV"
 * and three buttons, which reads as "you have not done this yet". With
 * `collapsible`, the panel is one line — "Your profile is already created" —
 * and one button, "Recreate my profile", which opens the same three ways in.
 * Recreating stays safe: the parent's add-or-replace choice still governs.
 */

type Mode = 'idle' | 'upload' | 'paste'

const MIN_TEXT = 50
const MAX_TEXT = 20000

export function ResumeImport({
  initialMode = 'idle',
  collapsible = false,
  onDraft,
  onFillManually,
}: {
  /** Deep-link intent, e.g. ?import=upload opens the file panel. */
  initialMode?: Mode
  /** A saved profile already exists — show "Recreate my profile" instead. */
  collapsible?: boolean
  onDraft: (draft: CareerProfileDraft) => void
  onFillManually: () => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<Mode>(initialMode)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  // A deep link (?import=upload|paste) is an explicit intent, so it opens the
  // panel even when a profile exists.
  const [expanded, setExpanded] = useState(!collapsible || initialMode !== 'idle')

  // The profile can come into existence while this is mounted — the auto-save
  // right after a first extraction. From then on it is "created", so fold the
  // panel away, unless the user is in the middle of an import.
  useEffect(() => {
    if (collapsible && !parsing && mode === 'idle') setExpanded(false)
    // Only react to the profile coming into existence, not to every mode change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsible])

  const collapse = () => {
    setExpanded(false)
    setMode('idle')
    setError(null)
    setText('')
  }

  const run = async (call: () => Promise<Response>) => {
    setParsing(true)
    setError(null)
    try {
      const res = await call()
      const body = (await res.json().catch(() => null)) as { draft?: CareerProfileDraft; error?: string } | null
      if (!res.ok || !body?.draft) {
        setError(body?.error || 'We could not read that resume. Please try again.')
        setParsing(false)
        return
      }
      // Success — hand the draft up. The parent swaps the page (add/replace) or
      // fills the editor, so we leave `parsing` on until this component unmounts
      // or the parent re-renders it; reset defensively in case it stays mounted.
      onDraft(body.draft)
      setParsing(false)
      setMode('idle')
      setText('')
    } catch {
      setError('Network error. Please check your connection and try again.')
      setParsing(false)
    }
  }

  const chooseFile = (file: File | null) => {
    if (!file) return
    if (!/\.(pdf|docx?|doc)$/i.test(file.name)) {
      setError('Only PDF and Word files are supported.')
      return
    }
    const form = new FormData()
    form.append('file', file)
    void run(() => fetch('/api/parse/upload', { method: 'POST', body: form }))
  }

  const submitText = () => {
    const trimmed = text.trim()
    if (trimmed.length < MIN_TEXT) {
      setError('Paste at least 50 characters of resume text.')
      return
    }
    if (trimmed.length > MAX_TEXT) {
      setError('Resume text must be 20,000 characters or fewer.')
      return
    }
    void run(() =>
      fetch('/api/parse/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      }),
    )
  }

  // ── Collapsed: the profile exists, so say so, and offer one way to redo it ──
  if (collapsible && !expanded) {
    return (
      <div className="mx-5 mt-4 flex flex-col gap-3 rounded-card border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-ctl bg-ok-soft text-ok">
            <CheckCircleIcon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[14.5px] font-bold text-ink">Your profile is already created</h2>
            <p className="text-[12.5px] leading-relaxed text-ink-soft">
              Got a newer CV? Recreate your profile from it — nothing changes until you choose what to keep.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          aria-expanded={false}
          className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-full shrink-0 justify-center sm:w-auto')}
        >
          <ArrowPathIcon aria-hidden="true" className="size-4" />
          Recreate my profile
        </button>
      </div>
    )
  }

  const recreating = collapsible

  return (
    // A TINTED PANEL, not one more white card. It is a shortcut that fills the
    // form below, so it must not look like part of the form — on the same white
    // as the fields it read as a tenth section with three identical buttons.
    <div className="mx-5 mt-4 rounded-card border border-teal/15 bg-teal-soft/70 p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-ctl bg-teal text-white shadow-m-1">
          {recreating ? <ArrowPathIcon className="size-5" /> : <DocumentArrowUpIcon className="size-5" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-[14.5px] font-bold text-ink">
            {recreating ? 'Recreate your profile' : 'Fill this in from your CV'}
          </h2>
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            {recreating
              ? 'Upload or paste a newer CV, or edit the form yourself. Nothing changes until you choose what to keep.'
              : 'Upload or paste your CV and we fill the form in for you.'}
          </p>
        </div>
        {recreating && !parsing ? (
          <button
            type="button"
            onClick={collapse}
            className="-mr-1 -mt-1 inline-flex min-h-11 shrink-0 items-center px-2 text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {parsing ? (
        <ProcessingInline
          className="mt-3"
          steps={[
            'Reading your resume',
            'Finding your roles and dates',
            'Picking out skills and certifications',
            'Getting it ready for you to check',
          ]}
          stepMs={5000}
          notes={EXTRACTION_NOTES}
        />
      ) : (
        <>
          {/* Three equal white buttons gave no answer to "which one do I
              press?". Upload is the fast path, so it is the filled one. */}
          <div className="mt-3.5 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setError(null)
                setMode('upload')
              }}
              aria-pressed={mode === 'upload'}
              className={cn(buttonVariants({ variant: 'progress', size: 'sm' }), 'w-full justify-center')}
            >
              <DocumentArrowUpIcon aria-hidden="true" className="size-4" />
              {recreating ? 'Upload a newer CV' : 'Upload CV'}
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null)
                setMode('paste')
              }}
              aria-pressed={mode === 'paste'}
              className={cn(
                buttonVariants({ variant: 'secondary', size: 'sm' }),
                'w-full justify-center',
                mode === 'paste' && 'border-teal text-teal',
              )}
            >
              <ClipboardDocumentIcon aria-hidden="true" className="size-4" />
              Paste text
            </button>
            <button
              type="button"
              onClick={() => {
                if (recreating) collapse()
                onFillManually()
              }}
              className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'w-full justify-center')}
            >
              <PencilSquareIcon aria-hidden="true" className="size-4" />
              {recreating ? 'Edit it myself' : 'Type it myself'}
            </button>
          </div>

          {mode === 'upload' ? (
            <div
              className={cn(
                'mt-3 rounded-ctl border-2 border-dashed p-5 text-center transition-colors',
                dragging ? 'border-teal bg-teal/10' : 'border-line-strong bg-white',
              )}
              onDragOver={(e: DragEvent) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e: DragEvent) => {
                e.preventDefault()
                setDragging(false)
                chooseFile(e.dataTransfer.files[0] ?? null)
              }}
            >
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.doc,.docx"
                className="sr-only"
                onChange={(e: ChangeEvent<HTMLInputElement>) => chooseFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-[13px] text-ink-soft">Drop your resume here, or</p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-2')}
              >
                Choose a file
              </button>
              <p className="mt-2 text-[12px] text-ink-muted">PDF up to 5MB · Word up to 2MB</p>
            </div>
          ) : null}

          {mode === 'paste' ? (
            <div className="mt-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_TEXT}
                rows={7}
                placeholder="Paste your resume text (50–20,000 characters)"
                className="field"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[12px] text-ink-muted">{text.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>
                <Button variant="primary" size="sm" onClick={submitText}>
                  Read this text
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {error ? (
        <p role="alert" className="mt-3 rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-2.5 text-[12px] text-alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
