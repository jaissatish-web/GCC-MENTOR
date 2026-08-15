'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from 'react'

const MAX_TEXT_LENGTH = 20000
const MAX_PDF_SIZE = 10 * 1024 * 1024
const MAX_WORD_SIZE = 5 * 1024 * 1024
const MIN_TEXT_LENGTH = 50

// The four things the scan ACTUALLY does, in the order it does them.
//
// The previous list promised "Spelling checking" and "Grammar checking", which
// this product has never performed — a progress bar that narrates work nobody
// is doing is the same class of problem as a model inventing achievements, just
// in the UI layer. These four map directly onto lib/gccReadiness/analyzeResume.
const ANALYSIS_STEPS = [
  'Reading your file',
  'Checking structure and contact details',
  'Checking achievements and wording',
  'Checking Gulf requirements',
] as const

// The analysis itself is deterministic and finishes in well under a second, so
// the steps exist to make a fast operation legible rather than to fill a long
// wait. They advance quickly and the real response almost always lands first;
// the interval only matters for a slow upload on a poor connection.
const STEP_INTERVAL_MS = 220

export default function AtsScanPage() {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Animate progress steps during analysis
  useEffect(() => {
    if (!loading) {
      if (progressTimer.current) clearInterval(progressTimer.current)
      setCurrentStep(0)
      return
    }
    progressTimer.current = setInterval(() => {
      setCurrentStep(prev => Math.min(prev + 1, ANALYSIS_STEPS.length - 1))
    }, STEP_INTERVAL_MS)
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current)
    }
  }, [loading])

  const chooseFile = (nextFile: File | null) => {
    setError(null)
    if (!nextFile) return
    const lower = nextFile.name.toLowerCase()
    const isPdf = lower.endsWith('.pdf')
    const isWord = lower.endsWith('.docx') || lower.endsWith('.doc')
    if (!isPdf && !isWord) return setError('Only PDF and Word files are supported.')
    const maxSize = isPdf ? MAX_PDF_SIZE : MAX_WORD_SIZE
    if (nextFile.size > maxSize) return setError(isPdf ? 'PDF file must be under 10MB.' : 'Word file must be under 5MB.')
    setFile(nextFile)
    setPasteMode(false)
    setResumeText('')
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    chooseFile(event.dataTransfer.files[0] ?? null)
  }

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => chooseFile(event.target.files?.[0] ?? null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    if (!file && resumeText.trim().length < MIN_TEXT_LENGTH) return setError('Upload a resume or paste at least 50 characters of resume text.')
    if (resumeText.length > MAX_TEXT_LENGTH) return setError('Pasted resume text must be 20,000 characters or fewer.')

    const body = new FormData()
    if (file) body.append('file', file)
    else body.append('resume_text', resumeText.trim())

    setLoading(true)
    setCurrentStep(0)
    try {
      const response = await fetch('/api/ats-scan', { method: 'POST', body })
      const payload = await response.json() as { success?: boolean; score?: unknown; jobMatch?: unknown; error?: string; limit?: { message?: string } }
      if (!response.ok) throw new Error(response.status === 429 ? payload.limit?.message ?? payload.error ?? 'Daily scan limit reached.' : payload.error ?? 'Could not analyze this resume.')
      if (!payload.success) throw new Error('The scan could not be completed. Please try again.')
      // Store result in sessionStorage so /gulf-readiness can read it
      sessionStorage.setItem('gcc_scan_result', JSON.stringify({ score: payload.score, jobMatch: payload.jobMatch }))
      router.push('/gulf-readiness')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not analyze this resume.')
      setLoading(false)
    }
  }

  // Progress screen during analysis
  if (loading) return <main className="min-h-dvh bg-bg text-ink-900"><header className="border-b border-line-light bg-bg/95"><div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-2.5"><span className="font-serif flex h-9 w-9 items-center justify-center rounded-radius-md bg-forest-deep text-lg text-gold-text-dark">G</span><span className="font-bold tracking-wide">GCC MENTOR</span></Link></div></header>
    <div className="mx-auto max-w-[560px] px-5 py-20 sm:px-8 lg:py-28">
      <div className="text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Analyzing your resume</p>
        <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Running a thorough check on your resume.</h1>
        <p className="mt-4 text-sm leading-relaxed text-ink-700">This usually takes about a minute. We are checking every section for GCC readiness.</p>
      </div>

      {/* Progress bar */}
      <div className="mt-10 overflow-hidden rounded-full bg-surface-2-light">
        <div
          className="h-2 rounded-full bg-forest transition-all duration-700 ease-out"
          style={{ width: `${Math.round(((currentStep + 1) / ANALYSIS_STEPS.length) * 100)}%` }}
        />
      </div>

      {/* Step tracker */}
      <div className="mt-8 space-y-3">
        {ANALYSIS_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-3 rounded-radius-lg border border-line-light bg-surface-light p-4">
            {i < currentStep ? (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">✓</span>
            ) : i === currentStep ? (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-redesign-gold bg-redesign-gold/10">
                <span className="size-2.5 animate-pulse rounded-full bg-redesign-gold" />
              </span>
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-line-light-strong bg-surface-2-light text-xs text-ink-400">{i + 1}</span>
            )}
            <span className={`text-sm ${i <= currentStep ? 'font-semibold text-ink-900' : 'text-ink-400'}`}>{step}</span>
          </div>
        ))}
      </div>
    </div></main>

  // Upload form (default)
  return <main className="min-h-dvh bg-bg text-ink-900"><header className="border-b border-line-light bg-bg/95"><div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-2.5"><span className="font-serif flex h-9 w-9 items-center justify-center rounded-radius-md bg-forest-deep text-lg text-gold-text-dark">G</span><span className="font-bold tracking-wide">GCC MENTOR</span></Link><Link href="/login" className="text-sm font-semibold text-ink-400 hover:text-ink-900">Log in</Link></div></header>
    <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 lg:py-20"><div className="mx-auto max-w-3xl text-center"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Free Gulf readiness check</p><h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">How ready is your CV for a Gulf opportunity?</h1><p className="mt-5 text-lg leading-relaxed text-ink-700">Upload your resume or paste its text. Get a free, grounded review of structure, clarity and Gulf-readiness — no login required.</p></div>
      <form onSubmit={submit} className="mx-auto mt-12 max-w-3xl rounded-radius-xl border border-line-light bg-surface-2-light p-5 shadow-redesign-md sm:p-8"><div className="flex flex-col gap-5"><div className={`rounded-radius-lg border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-redesign-gold bg-redesign-gold/10' : 'border-line-light-strong bg-surface-light'}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><input ref={fileInput} type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={onFileChange} /><p className="text-3xl text-gold-text">↑</p><h2 className="mt-3 font-serif text-2xl">{file ? file.name : 'Drop your resume here'}</h2><p className="mt-2 text-sm text-ink-700">PDF up to 10MB · Word up to 5MB</p><button type="button" onClick={() => fileInput.current?.click()} className={buttonVariants({ variant: 'secondary', size: 'sm' }) + ' mt-5'}>Choose a file</button></div><button type="button" onClick={() => { setPasteMode(v => !v); setFile(null); setError(null) }} className="self-center text-sm font-bold text-forest underline underline-offset-4">{pasteMode ? 'Use file upload instead' : 'Paste text instead'}</button>{pasteMode ? <label className="text-sm font-semibold">Resume text<textarea value={resumeText} onChange={event => setResumeText(event.target.value)} maxLength={MAX_TEXT_LENGTH} rows={10} placeholder="Paste your resume text here (50–20,000 characters)" className="mt-2 w-full rounded-radius-md border border-line-light bg-surface-light p-4 font-sans text-sm font-normal outline-none focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25" /><span className="mt-1 block text-right text-xs font-normal text-ink-400">{resumeText.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}</span></label> : null}<button type="submit" disabled={loading} className={buttonVariants({ variant: 'purchase' }) + ' mt-3 w-full'}>{loading ? 'Analyzing…' : 'Analyze my resume'}</button>{error ? <p role="alert" className="rounded-radius-md border border-terra bg-terra-tint px-4 py-3 text-sm leading-relaxed text-terra">{error}</p> : null}</div></form>
    </div></main>
}

export const maxDuration = 120