'use client'

import Link from 'next/link'
import { ArrowUpTrayIcon, ClipboardDocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { buttonVariants } from '@/components/ui/Button'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { saveHandoff } from '@/lib/gulfReadiness/handoff'
import type { FunnelAnswers, GulfReadinessResult } from '@/lib/gulfReadiness/types'
import { Alert } from '@/components/ui/Alert'
import { ProcessingOrbit, ProcessingSteps } from '@/components/ui/Processing'
import { SCAN_NOTES } from '@/lib/processingNotes'

/**
 * The free anonymous Gulf Readiness Scorecard — upload, three short questions, a
 * real score. One self-contained flow so it feels like a single tool opening from
 * the landing CTA, not a hop across pages.
 *
 * The score is arithmetic and the endpoint persists nothing (lib/gulfReadiness,
 * /api/gulf-readiness). The result is held in this browser for the signup handoff.
 */

type Step = 'upload' | 'q1' | 'q2yes' | 'q2no' | 'analyzing' | 'result'

const MAX_TEXT = 20000
const MIN_TEXT = 50

const ANALYZE_STEPS = ['Reading your resume', 'Checking your career signals', 'Scoring your Gulf readiness']

const Shell = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
  <main className="min-h-dvh bg-canvas text-ink">
    <header className="border-b border-line bg-canvas/95">
      <div className="page-gutter mx-auto flex min-h-[64px] max-w-[1100px] flex-wrap items-center justify-between gap-2 py-2 sm:min-h-[72px] sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="font-display flex h-9 w-9 items-center justify-center rounded-ctl bg-teal text-lg text-white">G</span>
          <span className="font-bold tracking-wide">GCC MENTOR</span>
        </Link>
        {/* 44px tall and teal, like "Log in" everywhere else. It was a 20px
            grey line, easy to miss for the returning user it exists for. */}
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-ctl px-2.5 text-sm font-semibold text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          Log in
        </Link>
      </div>
    </header>
    <div className={`page-gutter mx-auto py-8 sm:px-8 sm:py-12 lg:py-16 ${wide ? 'max-w-[820px]' : 'max-w-[600px]'}`}>{children}</div>
  </main>
)

const Question = ({
  eyebrow,
  title,
  options,
  error,
  onBack,
}: {
  eyebrow: string
  title: string
  options: { label: string; onClick: () => void }[]
  error: string | null
  onBack: () => void
}) => (
  <div className="text-center">
    <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal type-caption">{eyebrow}</p>
    <h1 className="mt-3 type-title text-ink">{title}</h1>
    <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
      {options.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={o.onClick}
          className="rounded-card border border-line-strong bg-white px-5 py-4 text-left text-[14px] font-semibold text-ink transition-colors hover:border-teal hover:bg-gold-soft/30"
        >
          {o.label}
        </button>
      ))}
    </div>
    <button type="button" onClick={onBack} className="mt-4 min-h-11 px-3 text-sm font-semibold text-teal underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">Back to resume</button>
    {error ? <Alert variant="danger" className="mt-5">{error}</Alert> : null}
  </div>
)


export default function GulfReadinessScorePage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GulfReadinessResult | null>(null)

  const chooseFile = (next: File | null) => {
    setError(null)
    if (!next) return
    const lower = next.name.toLowerCase()
    if (!/\.(pdf|docx)$/.test(lower)) { setFile(null); return setError('Choose a PDF or Word (.docx) file.') }
    if (next.size > 4 * 1024 * 1024) { setFile(null); return setError('Your resume must be 4MB or smaller. Choose a smaller file or paste its text.') }
    setFile(next)
    setPasteMode(false)
  }

  const startQuestions = () => {
    setError(null)
    if (!pasteMode && !file) return setError('Choose a PDF or Word (.docx) resume to continue.')
    if (pasteMode && resumeText.trim().length < MIN_TEXT) return setError('Paste at least 50 characters of resume text to continue.')
    if (pasteMode && resumeText.length > MAX_TEXT) return setError('Pasted resume text must be 20,000 characters or fewer.')
    setStep('q1')
  }

  const runScore = async (answers: FunnelAnswers) => {
    setStep('analyzing')
    setError(null)
    const body = new FormData()
    if (!pasteMode && file) body.append('file', file)
    else body.append('resume_text', resumeText.trim())
    body.append('answers', JSON.stringify(answers))

    try {
      const res = await fetch('/api/gulf-readiness', { method: 'POST', body })
      const payload = (await res.json()) as {
        success?: boolean
        result?: GulfReadinessResult
        resumeText?: string
        error?: string
      }
      if (!res.ok || !payload.success || !payload.result) {
        throw new Error(payload.error ?? 'We could not score your resume. Please try again.')
      }
      saveHandoff({ answers, result: payload.result, resumeText: payload.resumeText ?? resumeText })
      setResult(payload.result)
      setStep('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.')
      // Keep the selected input and its draft so the visitor can correct it.
      setStep('upload')
    }
  }

  // ---- steps ----------------------------------------------------------------
  if (step === 'upload') {
    return (
      <Shell>
        <div className="text-center">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal type-caption">Free Gulf readiness score</p>
          <h1 className="mt-3 type-title text-ink">How Gulf-ready is your career?</h1>
          <p className="mt-3 type-body text-ink-soft">
            Two questions and your resume. You get your strengths, your gaps and what to fix first — no signup needed to see the score.
          </p>
        </div>

        <div className="mt-6 rounded-card border border-line bg-white p-4 sm:p-6">
          <div role="group" aria-label="Resume input method" className="grid grid-cols-2 gap-2 rounded-ctl bg-canvas p-1">
            {[{ paste: false, label: 'Upload resume', Icon: ArrowUpTrayIcon }, { paste: true, label: 'Paste text', Icon: ClipboardDocumentIcon }].map(({ paste, label, Icon }) => <button
              key={label} type="button" aria-pressed={pasteMode === paste} aria-controls="resume-input-panel"
              onClick={() => { setPasteMode(paste); setDragging(false); setError(null) }}
              className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-ctl border px-2 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ${pasteMode === paste ? 'border-teal bg-teal text-white' : 'border-transparent bg-transparent text-ink-soft hover:bg-teal-soft'}`}>
              <Icon className="size-4 shrink-0" aria-hidden="true" /><span>{label}</span>
            </button>)}
          </div>

          <div id="resume-input-panel">
          {pasteMode ? (
            <div id="resume-paste" className="mt-5">
              <label htmlFor="readiness-resume-text" className="field-label">Paste your resume text</label>
              <p id="resume-text-hint" className="mt-1 text-sm leading-relaxed text-ink-soft type-helper">Include your experience, skills and education. Use 50–20,000 characters.</p>
              <textarea id="readiness-resume-text" value={resumeText}
                onChange={(event) => { setResumeText(event.target.value); if (error) setError(null) }}
                maxLength={MAX_TEXT} rows={8} placeholder="Paste your resume here…"
                aria-invalid={Boolean(error)} aria-describedby={`resume-text-hint resume-text-count${error ? ' resume-input-error' : ''}`}
                style={{ height: 240, minHeight: 200, maxHeight: 320 }} className="field mt-3 w-full resize-y overflow-y-auto p-3.5 font-normal" />
              <p id="resume-text-count" className="mt-1 text-right text-xs text-ink-muted type-caption">{resumeText.length.toLocaleString()} / {MAX_TEXT.toLocaleString()} characters</p>
            </div>
          ) : (
            <div id="resume-upload" className="mt-5">
              <div className={`rounded-card border-2 border-dashed px-4 py-6 text-center transition-colors sm:p-7 ${dragging ? 'border-teal bg-teal-soft' : 'border-line-strong bg-canvas/40'}`}
                onDragOver={(event: DragEvent) => { event.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event: DragEvent) => { event.preventDefault(); setDragging(false); chooseFile(event.dataTransfer.files[0] ?? null) }}>
                <input ref={fileInput} id="readiness-resume-file" type="file" accept=".pdf,.docx" className="sr-only" tabIndex={-1} aria-label="Upload resume file"
                  aria-describedby={`resume-upload-hint${error ? ' resume-input-error' : ''}`} aria-invalid={Boolean(error)}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => { chooseFile(event.target.files?.[0] ?? null); event.target.value = '' }} />
                {file ? <CheckCircleIcon className="mx-auto size-8 text-teal" aria-hidden="true" /> : <ArrowUpTrayIcon className="mx-auto size-8 text-teal" aria-hidden="true" />}
                <h2 className="mt-3 break-words font-display type-card text-ink">{file ? file.name : 'Choose your resume'}</h2>
                <p id="resume-upload-hint" className="mt-2 text-sm text-ink-soft type-helper">PDF or Word (.docx) · Maximum 4MB</p>
                <button type="button" onClick={() => fileInput.current?.click()} className={buttonVariants({ variant: 'secondary', size: 'sm' }) + ' mt-4'}>{file ? 'Change file' : 'Choose a file'}</button>
                <p className="mt-3 text-xs text-ink-muted type-caption">You can also drag and drop your file here.</p>
              </div>
            </div>
          )}
          </div>
          {error ? <p id="resume-input-error" role="alert" className="mt-3 rounded-ctl border border-alert bg-alert-soft px-4 py-3 text-sm text-alert type-helper">{error}</p> : null}
          <button type="button" onClick={startQuestions} className={buttonVariants({ variant: 'primary' }) + ' mt-4 w-full'}>Continue</button>
          <p className="mt-4 text-center text-xs leading-relaxed text-ink-muted type-caption">Your anonymous resume check isn’t saved to our servers.</p>
        </div>
      </Shell>
    )
  }

  if (step === 'q1') {
    return (
      <Shell>
        <Question error={error} onBack={() => { setStep('upload'); setError(null) }}
          eyebrow="Question 1 of 2"
          title="Have you worked in the Gulf / Middle East?"
          options={[
            { label: 'Yes, I have Gulf / Middle East experience', onClick: () => { setStep('q2yes') } },
            { label: 'No, I haven’t worked in the Gulf yet', onClick: () => { setStep('q2no') } },
          ]}
        />
      </Shell>
    )
  }

  if (step === 'q2yes') {
    return (
      <Shell>
        <Question error={error} onBack={() => { setStep('upload'); setError(null) }}
          eyebrow="Question 2 of 2"
          title="Where are you based right now?"
          options={[
            { label: 'I’m currently in the Gulf / Middle East', onClick: () => runScore({ hasGulfExperience: true, currentlyInGulf: true }) },
            { label: 'I’ve returned / I’m now outside the Gulf', onClick: () => runScore({ hasGulfExperience: true, currentlyInGulf: false }) },
          ]}
        />
      </Shell>
    )
  }

  if (step === 'q2no') {
    return (
      <Shell>
        <Question error={error} onBack={() => { setStep('upload'); setError(null) }}
          eyebrow="Question 2 of 2"
          title="Do you have professional work experience?"
          options={[
            { label: 'Yes, I have professional experience', onClick: () => runScore({ hasGulfExperience: false, hasProfessionalExperience: true }) },
            { label: 'No, I’m a fresher / recent graduate', onClick: () => runScore({ hasGulfExperience: false, hasProfessionalExperience: false }) },
          ]}
        />
      </Shell>
    )
  }

  if (step === 'analyzing') {
    return (
      <Shell>
        {/* All three steps used to pulse at once, so the screen never looked
            like it was getting anywhere. They now advance in order and hold on
            the last until the score arrives. */}
        <div className="flex flex-col items-center gap-6 py-12 text-center">
          <ProcessingOrbit size={168} />
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal type-caption">Building your scorecard</p>
            <h1 className="mt-3 type-title">Scoring your Gulf readiness</h1>
          </div>
          <div className="w-full max-w-sm text-left">
            <ProcessingSteps steps={ANALYZE_STEPS} stepMs={1600} notes={SCAN_NOTES} />
          </div>
        </div>
      </Shell>
    )
  }

  // result
  return (
    <Shell wide>
      <div className="mb-6 text-center">
        <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-teal type-caption">Your Gulf readiness</p>
        <h1 className="mt-3 type-title">Here&rsquo;s where your career stands</h1>
      </div>
      {result ? <ScorecardResult result={result} locked /> : null}
    </Shell>
  )
}
