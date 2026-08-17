'use client'

import Link from 'next/link'
import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { buttonVariants } from '@/components/ui/Button'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { saveHandoff } from '@/lib/gulfReadiness/handoff'
import type { FunnelAnswers, GulfReadinessResult } from '@/lib/gulfReadiness/types'

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

export default function GulfReadinessScorePage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GulfReadinessResult | null>(null)

  // Answers accumulate across the two question steps.
  const [hasGulf, setHasGulf] = useState<boolean | null>(null)

  const chooseFile = (next: File | null) => {
    setError(null)
    if (!next) return
    const lower = next.name.toLowerCase()
    if (!/\.(pdf|docx?|doc)$/.test(lower)) return setError('Only PDF and Word files are supported.')
    setFile(next)
    setPasteMode(false)
    setResumeText('')
  }

  const startQuestions = () => {
    setError(null)
    if (!file && resumeText.trim().length < MIN_TEXT) {
      return setError('Upload a resume or paste at least 50 characters of resume text.')
    }
    if (resumeText.length > MAX_TEXT) return setError('Pasted resume text must be 20,000 characters or fewer.')
    setStep('q1')
  }

  const runScore = async (answers: FunnelAnswers) => {
    setStep('analyzing')
    setError(null)
    const body = new FormData()
    if (file) body.append('file', file)
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
      // Send them back to the questions so they can retry without re-uploading.
      setStep(hasGulf === null ? 'upload' : 'q1')
    }
  }

  // ---- shared chrome --------------------------------------------------------
  const Shell = ({ children, wide }: { children: React.ReactNode; wide?: boolean }) => (
    <main className="min-h-dvh bg-bg text-ink-900">
      <header className="border-b border-line-light bg-bg/95">
        <div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-serif flex h-9 w-9 items-center justify-center rounded-radius-md bg-forest-deep text-lg text-gold-text-dark">G</span>
            <span className="font-bold tracking-wide">GCC MENTOR</span>
          </Link>
          <Link href="/login" className="text-sm font-semibold text-ink-400 hover:text-ink-900">Log in</Link>
        </div>
      </header>
      <div className={`mx-auto px-5 py-12 sm:px-8 lg:py-16 ${wide ? 'max-w-[820px]' : 'max-w-[600px]'}`}>{children}</div>
    </main>
  )

  const Question = ({
    eyebrow,
    title,
    options,
  }: {
    eyebrow: string
    title: string
    options: { label: string; onClick: () => void }[]
  }) => (
    <div className="text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">{eyebrow}</p>
      <h1 className="mt-4 font-serif text-3xl leading-tight sm:text-4xl">{title}</h1>
      <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
        {options.map((o) => (
          <button
            key={o.label}
            type="button"
            onClick={o.onClick}
            className="rounded-radius-lg border border-line-light-strong bg-surface-light px-5 py-4 text-left text-[14px] font-semibold text-ink-900 transition-colors hover:border-redesign-gold hover:bg-gold-tint/30"
          >
            {o.label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="mt-5 text-sm text-terra">{error}</p> : null}
    </div>
  )

  // ---- steps ----------------------------------------------------------------
  if (step === 'upload') {
    return (
      <Shell>
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Free Gulf readiness score</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">How Gulf-ready is your career?</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-700">
            Upload your resume and answer two quick questions. Get a free Gulf Readiness Score — with the strengths,
            gaps and next steps for your GCC job search. No signup required to see your score.
          </p>
        </div>

        <div className="mt-8 rounded-radius-xl border border-line-light bg-surface-2-light p-5 shadow-redesign-md sm:p-7">
          <div
            className={`rounded-radius-lg border-2 border-dashed p-7 text-center transition-colors ${dragging ? 'border-redesign-gold bg-redesign-gold/10' : 'border-line-light-strong bg-surface-light'}`}
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
            <input ref={fileInput} type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e: ChangeEvent<HTMLInputElement>) => chooseFile(e.target.files?.[0] ?? null)} />
            <p className="text-2xl text-gold-text">↑</p>
            <h2 className="mt-2 font-serif text-xl">{file ? file.name : 'Drop your resume here'}</h2>
            <p className="mt-1.5 text-[12.5px] text-ink-700">PDF up to 10MB · Word up to 5MB</p>
            <button type="button" onClick={() => fileInput.current?.click()} className={buttonVariants({ variant: 'secondary', size: 'sm' }) + ' mt-4'}>
              Choose a file
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setPasteMode((v) => !v)
              setFile(null)
              setError(null)
            }}
            className="mx-auto mt-4 block text-[13px] font-bold text-forest underline underline-offset-4"
          >
            {pasteMode ? 'Use file upload instead' : 'Paste text instead'}
          </button>

          {pasteMode ? (
            <label className="mt-3 block text-[13px] font-semibold">
              Resume text
              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                maxLength={MAX_TEXT}
                rows={9}
                placeholder="Paste your resume text (50–20,000 characters)"
                className="mt-2 w-full rounded-radius-md border border-line-light bg-surface-light p-3.5 font-sans text-[13px] font-normal outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
              />
              <span className="mt-1 block text-right text-[11px] font-normal text-ink-400">{resumeText.length.toLocaleString()} / {MAX_TEXT.toLocaleString()}</span>
            </label>
          ) : null}

          <button type="button" onClick={startQuestions} className={buttonVariants({ variant: 'primary' }) + ' mt-4 w-full'}>
            Continue
          </button>
          {error ? <p role="alert" className="mt-3 rounded-radius-md border border-terra bg-terra-tint px-4 py-3 text-sm text-terra">{error}</p> : null}
          <p className="mt-4 text-center text-[11px] text-ink-400">Your anonymous check isn&rsquo;t saved to our servers.</p>
        </div>
      </Shell>
    )
  }

  if (step === 'q1') {
    return (
      <Shell>
        <Question
          eyebrow="Question 1 of 2"
          title="Have you worked in the Gulf / Middle East?"
          options={[
            { label: 'Yes, I have Gulf / Middle East experience', onClick: () => { setHasGulf(true); setStep('q2yes') } },
            { label: 'No, I haven’t worked in the Gulf yet', onClick: () => { setHasGulf(false); setStep('q2no') } },
          ]}
        />
      </Shell>
    )
  }

  if (step === 'q2yes') {
    return (
      <Shell>
        <Question
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
        <Question
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
        <div className="py-16 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Building your scorecard</p>
          <h1 className="mt-4 font-serif text-3xl">Scoring your Gulf readiness…</h1>
          <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2.5">
            {ANALYZE_STEPS.map((s) => (
              <div key={s} className="flex items-center gap-3 rounded-radius-lg border border-line-light bg-surface-light p-3.5 text-[13px] text-ink-700">
                <span className="size-2.5 animate-pulse rounded-full bg-redesign-gold" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </Shell>
    )
  }

  // result
  return (
    <Shell wide>
      <div className="mb-6 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Your Gulf readiness</p>
        <h1 className="mt-3 font-serif text-3xl">Here&rsquo;s where your career stands</h1>
      </div>
      {result ? <ScorecardResult result={result} locked /> : null}
    </Shell>
  )
}
