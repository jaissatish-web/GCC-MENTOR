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
import type { ImportReview } from '@/lib/resumeParse/importReview'
import type { ParseWarning } from '@/lib/resumeParse/check'
import { uploadResumeFile, requestResumeImport, IMPORT_DISPLAY_FAILED } from '@/lib/resumeParse/clientImport'

/** Resume input and actual request progress, hosted on /profile/import.
 * The canonical profile workspace owns the draft handoff and existing
 * Add / Replace / Keep decision. This component never saves profile facts.
 * A failed request retains the selected file or pasted text for explicit retry.
 * Existing server recreation limits remain authoritative.
 */

type Mode = 'idle' | 'upload' | 'paste'

/** The subset of /api/parse/recreate-status this panel shows. */
interface RecreationQuota {
  unlimited?: boolean
  limit: number
  used: number
  remaining: number
  resetsOnLabel: string
}

const MIN_TEXT = 50
const MAX_TEXT = 20000

export function ResumeImport({
  initialMode = 'idle',
  collapsible = false,
  onDraft,
  onFillManually,
  onProcessingChange,
}: {
  /** Deep-link intent, e.g. ?import=upload opens the file panel. */
  initialMode?: Mode
  /** A saved profile already exists — show "Recreate my profile" instead. */
  collapsible?: boolean
  /** `notes`: the reader's "please check" list (lib/resumeParse), when it sent one. */
  onDraft: (draft: CareerProfileDraft, notes?: ParseWarning[], review?: ImportReview) => void | Promise<void>
  onFillManually: () => void
  /** Lets the canonical editor pause conflicting actions while the reader runs. */
  onProcessingChange?: (processing: boolean) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const importBusy = useRef(false)
  const processingObserver = useRef(onProcessingChange)
  useEffect(() => { processingObserver.current = onProcessingChange }, [onProcessingChange])
  useEffect(() => () => { processingObserver.current?.(false) }, [])
  const [mode, setMode] = useState<Mode>(initialMode)
  const [parsing, setParsing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkSaved, setCheckSaved] = useState(false)
  const [text, setText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  // A deep link (?import=upload|paste) is an explicit intent, so it opens the
  // panel even when a profile exists.
  const [expanded, setExpanded] = useState(!collapsible || initialMode !== 'idle')
  const [quota, setQuota] = useState<RecreationQuota | null>(null)

  // The profile can come into existence while this is mounted — the auto-save
  // right after a first extraction. From then on it is "created", so fold the
  // panel away, unless the user is in the middle of an import.
  useEffect(() => {
    if (collapsible && !parsing && mode === 'idle') setExpanded(false)
    // Only react to the profile coming into existence, not to every mode change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collapsible])

  // How many recreations are left — only meaningful once a profile exists.
  // Best-effort: if it cannot be read, the panel simply does not show a count,
  // and the server still enforces the limit.
  useEffect(() => {
    if (!collapsible) return
    let alive = true
    fetch('/api/parse/recreate-status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RecreationQuota | null) => {
        if (alive && data && typeof data.remaining === 'number') setQuota(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [collapsible])

  const exhausted = collapsible && quota !== null && quota.remaining <= 0

  const collapse = () => {
    setExpanded(false)
    setMode('idle')
    setError(null)
    setText('')
    setSelectedFile(null)
  }

  const run = async (call: () => Promise<Response>) => {
    // React state updates are asynchronous; this also blocks a second drop/click.
    if (importBusy.current) return
    importBusy.current = true
    processingObserver.current?.(true)
    setParsing(true)
    setError(null)
    setCheckSaved(false)
    try {
      const result = await requestResumeImport(call)
      if (!result.ok) {
        if (result.recreation) setQuota(result.recreation)
        setError(result.error)
        setCheckSaved(result.checkSaved)
        return
      }
      try {
        await onDraft(result.draft, result.warnings, result.review)
        setMode('idle')
        setText('')
        setSelectedFile(null)
      } catch {
        setError(IMPORT_DISPLAY_FAILED)
        setCheckSaved(true)
      }
    } finally {
      setParsing(false)
      importBusy.current = false
      processingObserver.current?.(false)
    }
  }

  const chooseFile = (file: File | null) => {
    if (file) {
      setSelectedFile(file)
      void run(() => uploadResumeFile(file))
    }
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

  /** At zero: when they come back, and that editing by hand still works. */
  const limitReachedText = quota
    ? `You've used all ${quota.limit} profile recreation${quota.limit === 1 ? '' : 's'} for this month. You can recreate it again from ${quota.resetsOnLabel} — and you can still edit your profile by hand.`
    : ''

  // ── Collapsed: the profile exists, so say so, and offer one way to redo it ──
  if (collapsible && !expanded) {
    return (
      <div className="mt-3 flex min-w-0 flex-col gap-3 rounded-card border border-line bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-ctl bg-ok-soft text-ok">
            <CheckCircleIcon className="size-5" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-[14.5px] font-bold text-ink">Your profile is already created</h2>
            <p className="type-helper leading-relaxed text-ink-soft">
              {exhausted
                ? limitReachedText
                : 'Got a newer resume? Recreate your profile from it — nothing changes until you choose what to keep.'}
            </p>
            {quota && !exhausted ? (
              <p className="type-helper font-semibold text-ink-muted">
                {quota.unlimited ? 'Unlimited resume imports' : `${quota.remaining} of ${quota.limit} recreations left this month`}
              </p>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          disabled={exhausted}
          aria-expanded={false}
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'sm' }),
            'w-full shrink-0 justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto',
          )}
        >
          <ArrowPathIcon aria-hidden="true" className="size-4" />
          Recreate my profile
        </button>
      </div>
    )
  }

  const recreating = collapsible

  return (
    // The parent already supplies page gutters; avoid nesting a second inset.
    <div data-resume-import aria-busy={parsing} className="mt-3 min-w-0 rounded-card border border-line bg-white p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-ctl bg-teal text-white shadow-m-1">
          {recreating ? <ArrowPathIcon className="size-5" /> : <DocumentArrowUpIcon className="size-5" />}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-[14.5px] font-bold text-ink">
            {parsing ? 'Reading your resume' : recreating ? 'Recreate your profile' : 'Add your resume'}
          </h2>
          <p className="type-helper leading-relaxed text-ink-soft">
            {parsing
              ? 'You’ll review the extracted details next.'
              : recreating
              ? 'Upload or paste a newer resume, or edit the form yourself. Nothing changes until you choose what to keep.'
              : 'Upload a file or paste text. You’ll check the extracted details next.'}
          </p>
          {recreating && quota && !exhausted ? (
            <p className="type-helper font-semibold text-ink-muted">
              {quota.unlimited ? 'Unlimited resume imports' : `${quota.remaining} of ${quota.limit} recreations left this month`}
            </p>
          ) : null}
        </div>
        {recreating && !parsing ? (
          <button
            type="button"
            onClick={collapse}
            className="-mr-1 -mt-1 inline-flex min-h-11 shrink-0 items-center px-2 type-button font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Cancel
          </button>
        ) : null}
      </div>

      {parsing ? (
        <ProcessingInline
          className="mt-3"
          steps={[
            'Resume input selected',
            'Reading and organizing your career information',
            'Preparing your review after the response arrives',
          ]}
          activeIndex={1}
          completedIndices={[0]}
          notes={EXTRACTION_NOTES}
        />
      ) : exhausted ? (
        // None left this month (e.g. arrived by a deep link): say when they
        // come back, and leave the one way in that costs nothing.
        <div className="mt-3.5 flex flex-col gap-2.5">
          <p className="rounded-ctl border border-line bg-white px-3.5 py-3 type-helper leading-relaxed text-ink-soft">
            {limitReachedText}
          </p>
          <button
            type="button"
            onClick={() => {
              collapse()
              onFillManually()
            }}
            className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-full justify-center sm:w-auto sm:self-start')}
          >
            <PencilSquareIcon aria-hidden="true" className="size-4" />
            Edit it myself
          </button>
        </div>
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
              {recreating ? 'Upload a newer resume' : 'Upload resume'}
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
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const selected = e.target.files?.[0] ?? null
                  e.target.value = '' // Selecting the same file again must trigger onChange.
                  chooseFile(selected)
                }}
              />
              <p className="type-helper text-ink-soft">Drop your resume here, or</p>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'mt-2')}
              >
                Choose a file
              </button>
              <p className="mt-2 type-helper text-ink-muted">PDF up to 4MB · Word (.docx) up to 2MB</p>
            </div>
          ) : null}

          {mode === 'paste' ? (
            <div className="mt-3">
              <label htmlFor="resume-import-text" className="mb-2 block field-label">Your resume text</label>
              <textarea
                id="resume-import-text"
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
        <div role="alert" className="mt-3 rounded-ctl border border-alert/40 bg-alert-soft px-3.5 py-2.5 text-[12px] text-alert">
          <p>{error}</p>
          {mode === 'upload' && selectedFile && !checkSaved ? <button type="button" disabled={parsing} onClick={() => chooseFile(selectedFile)} className="mt-2 inline-block min-h-11 font-semibold underline">Try the selected file again</button> : null}
          {checkSaved ? <button type="button" onClick={() => window.location.assign('/profile')} className="mt-2 inline-block font-semibold underline">Refresh and check saved resume</button> : null}
        </div>
      ) : null}
    </div>
  )
}
