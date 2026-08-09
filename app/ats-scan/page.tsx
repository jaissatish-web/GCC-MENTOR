'use client'

import Link from 'next/link'
import { ChangeEvent, DragEvent, FormEvent, useRef, useState } from 'react'

type CategoryScores = {
  structure: number
  clarity_and_impact: number
  gulf_readiness: number
}

type JobMatch = {
  match_score: number
  present_keywords: string[]
  missing_keywords: string[]
} | null

type ScanResult = {
  overall_score: number
  category_scores: CategoryScores
  strengths: string[]
  improvements: string[]
  gulf_format_notes: string[]
  summary: string
  job_match: JobMatch
}

const MAX_TEXT_LENGTH = 20000
const MAX_JD_LENGTH = 8000
const MIN_TEXT_LENGTH = 50

function Score({ value, large = false }: { value: number; large?: boolean }) {
  return <span className={`font-mono font-bold text-emerald ${large ? 'text-7xl' : 'text-3xl'}`}>{value}<span className={large ? 'text-3xl' : 'text-base'}>/100</span></span>
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return <section className="rounded-2xl border border-line bg-white p-5"><h3 className="font-serif text-2xl">{title}</h3><ul className="mt-4 space-y-3">{items.map(item => <li key={item} className="flex gap-2 text-sm leading-relaxed text-ink-body"><span className="text-gold">✓</span><span>{item}</span></li>)}</ul></section>
}

export default function AtsScanPage() {
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [pasteMode, setPasteMode] = useState(false)
  const [resumeText, setResumeText] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)

  const chooseFile = (nextFile: File | null) => {
    setError(null)
    if (!nextFile) return
    const lower = nextFile.name.toLowerCase()
    const validType = lower.endsWith('.pdf') || lower.endsWith('.docx') || lower.endsWith('.doc')
    const maxSize = lower.endsWith('.pdf') ? 5 * 1024 * 1024 : 2 * 1024 * 1024
    if (!validType) return setError('Only PDF and Word files are supported.')
    if (nextFile.size > maxSize) return setError(lower.endsWith('.pdf') ? 'PDF file must be under 5MB.' : 'Word file must be under 2MB.')
    setFile(nextFile)
    setPasteMode(false)
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
    setResult(null)
    if (!file && resumeText.trim().length < MIN_TEXT_LENGTH) return setError('Paste at least 50 characters of resume text, or upload a file.')
    if (resumeText.length > MAX_TEXT_LENGTH) return setError('Pasted resume text must be 20,000 characters or fewer.')
    if (jobDescription.length > MAX_JD_LENGTH) return setError('Job description must be 8,000 characters or fewer.')
    const body = new FormData()
    if (file) body.append('file', file)
    else body.append('resume_text', resumeText)
    if (jobDescription.trim()) body.append('job_description', jobDescription)
    setLoading(true)
    try {
      const response = await fetch('/api/ats-scan', { method: 'POST', body })
      const payload = await response.json() as { success?: boolean; score?: ScanResult; error?: string; limit?: { message?: string } }
      if (!response.ok) throw new Error(response.status === 429 ? payload.limit?.message ?? payload.error ?? 'Daily scan limit reached.' : payload.error ?? 'Could not analyze this resume.')
      if (!payload.score) throw new Error('The scan returned no results. Please try again.')
      setResult(payload.score)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not analyze this resume.')
    } finally {
      setLoading(false)
    }
  }

  return <main className="min-h-dvh bg-marble text-midnight"><header className="border-b border-line bg-marble/95"><div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-2.5"><span className="font-serif flex h-9 w-9 items-center justify-center rounded-lg bg-midnight text-lg text-gold-light">G</span><span className="font-bold tracking-wide">GCC MENTOR</span></Link><Link href="/login" className="text-sm font-semibold text-ink-muted hover:text-midnight">Log in</Link></div></header>
    <div className="mx-auto max-w-[1100px] px-5 py-14 sm:px-8 lg:py-20"><div className="mx-auto max-w-3xl text-center"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Free Gulf readiness check</p><h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">How ready is your CV for a Gulf opportunity?</h1><p className="mt-5 text-lg leading-relaxed text-ink-body">Upload your resume or paste its text. Get a free, grounded review of structure, clarity and Gulf-readiness — no login required.</p></div>
      <form onSubmit={submit} className="mx-auto mt-12 max-w-3xl rounded-3xl border border-line bg-fill-warm p-5 shadow-elev-1 sm:p-8">
        <div className="flex flex-col gap-5"><div className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${dragging ? 'border-gold bg-gold/10' : 'border-line-strong bg-white'}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={onDrop}><input ref={fileInput} type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={onFileChange} /><p className="text-3xl text-gold">↑</p><h2 className="mt-3 font-serif text-2xl">{file ? file.name : 'Drop your resume here'}</h2><p className="mt-2 text-sm text-ink-body">PDF up to 5MB · Word up to 2MB</p><button type="button" onClick={() => fileInput.current?.click()} className="mt-5 min-h-11 rounded-lg border border-line-strong bg-white px-5 py-3 text-sm font-bold hover:border-gold">Choose a file</button></div><button type="button" onClick={() => { setPasteMode(v => !v); setFile(null) }} className="self-center text-sm font-bold text-emerald underline underline-offset-4">{pasteMode ? 'Use file upload instead' : 'Paste text instead'}</button>{pasteMode ? <label className="text-sm font-semibold">Resume text<textarea value={resumeText} onChange={event => setResumeText(event.target.value)} maxLength={MAX_TEXT_LENGTH} rows={10} placeholder="Paste your resume text here (50–20,000 characters)" className="mt-2 w-full rounded-lg border border-line bg-white p-4 font-sans text-sm font-normal outline-none focus:border-gold focus:ring-2 focus:ring-gold/25" /><span className="mt-1 block text-right text-xs font-normal text-ink-muted">{resumeText.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()}</span></label> : null}<label className="text-sm font-semibold">Job description <span className="font-normal text-ink-muted">(optional)</span><textarea value={jobDescription} onChange={event => setJobDescription(event.target.value)} maxLength={MAX_JD_LENGTH} rows={5} placeholder="Paste a job description to see keyword alignment" className="mt-2 w-full rounded-lg border border-line bg-white p-4 font-sans text-sm font-normal outline-none focus:border-gold focus:ring-2 focus:ring-gold/25" /><span className="mt-1 block text-right text-xs font-normal text-ink-muted">{jobDescription.length.toLocaleString()} / {MAX_JD_LENGTH.toLocaleString()}</span></label>{error ? <p role="alert" className="rounded-lg border border-terracotta/40 bg-state-terra-bg p-3 text-sm font-semibold text-state-terra-text">{error}</p> : null}<button type="submit" disabled={loading || (!file && !pasteMode)} className="min-h-11 rounded-lg bg-midnight px-6 py-3 text-sm font-bold text-marble disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Analyzing your resume…' : 'Scan my CV for free'}</button><p className="text-center text-xs text-ink-muted">Your scan is stateless. We do not save your resume.</p></div>
      </form>
      {result ? <section className="mx-auto mt-16 max-w-5xl"><div className="rounded-3xl border border-gold/50 bg-white p-6 shadow-glow-gold sm:p-10"><div className="flex flex-col items-center justify-between gap-6 text-center sm:flex-row sm:text-left"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Your free scan</p><h2 className="mt-3 font-serif text-4xl">Gulf readiness overview</h2><p className="mt-3 max-w-2xl text-ink-body">{result.summary}</p></div><Score value={result.overall_score} large /></div><div className="mt-10 grid gap-3 sm:grid-cols-3">{[['Structure', result.category_scores.structure], ['Clarity & impact', result.category_scores.clarity_and_impact], ['Gulf-readiness', result.category_scores.gulf_readiness]].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-fill-warm p-4"><p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{label}</p><div className="mt-2"><Score value={value as number} /></div></div>)}</div></div><div className="mt-5 grid gap-4 md:grid-cols-2"><ListBlock title="Strengths" items={result.strengths} /><ListBlock title="Improvements" items={result.improvements} /><ListBlock title="Gulf format notes" items={result.gulf_format_notes} />{result.job_match ? <section className="rounded-2xl border border-line bg-white p-5"><div className="flex items-center justify-between"><h3 className="font-serif text-2xl">Job match</h3><Score value={result.job_match.match_score} /></div><p className="mt-4 text-xs font-bold uppercase tracking-wider text-emerald">Present keywords</p><p className="mt-2 text-sm text-ink-body">{result.job_match.present_keywords.join(' · ') || 'None identified'}</p><p className="mt-4 text-xs font-bold uppercase tracking-wider text-terracotta">Missing keywords</p><p className="mt-2 text-sm text-ink-body">{result.job_match.missing_keywords.join(' · ') || 'None identified'}</p></section> : null}</div><div className="mt-8 rounded-2xl bg-midnight p-7 text-center text-marble"><h2 className="font-serif text-3xl">Ready to build the full picture?</h2><p className="mx-auto mt-2 max-w-xl text-sm text-marble/70">Turn this free scan into a complete Career Profile and a CV built for your next target role.</p><Link href="/onboarding" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-gold px-6 py-3 text-sm font-bold text-midnight">Build your full Career Profile</Link></div></section> : null}
    </div></main>
}

export const maxDuration = 60
