'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Score = { overall_score: number; category_scores: { structure: number; clarity_and_impact: number; gulf_readiness: number }; strengths: string[]; improvements: string[]; gulf_format_notes: string[]; summary: string }

type JobMatchCategory = { score: number; applicable: boolean; explanation: string }
type JobMatch = {
  overall_score: number
  categories: Record<string, JobMatchCategory>
  diagnosis: string
}

const CATEGORY_LABELS: Record<string, string> = {
  summary_match: 'Summary Match',
  career_relevance: 'Career Relevance',
  required_skills: 'Required Skills',
  industry_match: 'Industry Match',
  experience_level: 'Experience Level',
  gcc_experience: 'GCC Experience',
  education: 'Education',
  certifications: 'Certifications',
  driving_license: 'Driving License',
}

function ScoreCard({ label, value, tone }: { label: string; value: number; tone: 'green' | 'gold' | 'terra' }) {
  const ring = tone === 'green' ? 'border-forest bg-forest-tint' : tone === 'gold' ? 'border-redesign-gold bg-redesign-gold-tint' : 'border-terra bg-terra-tint'
  return <div className={`rounded-radius-xl border-2 ${ring} p-5`}><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-500">{label}</p><div className="mt-2 flex items-end gap-1"><span className="font-mono text-4xl font-bold text-ink-900">{value}</span><span className="mb-1 text-sm text-ink-500">/100</span></div></div>
}

function List({ title, items, icon }: { title: string; items: string[]; icon: string }) {
  return <section className="rounded-radius-xl border border-line-light bg-surface-light p-6"><h2 className="font-serif text-2xl">{title}</h2><div className="mt-4 space-y-3">{items.map((item, i) => <div key={`${item}-${i}`} className="flex gap-3 rounded-radius-md bg-surface-2-light p-3 text-sm leading-relaxed"><span className="shrink-0 text-gold-text">{icon}</span><span>{item}</span></div>)}</div></section>
}

export default function GulfReadinessPage() {
  const [score, setScore] = useState<Score | null>(null)
  const [jobMatch, setJobMatch] = useState<JobMatch | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
      // First try sessionStorage (set by /ats-scan after successful scan)
      const stored = sessionStorage.getItem('gcc_scan_result')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          sessionStorage.removeItem('gcc_scan_result') // clean up
          setScore(parsed.score)
          if (parsed.jobMatch) setJobMatch(parsed.jobMatch)
          return
        } catch { /* corrupted, fall through */ }
      }
      // Fallback: try session cookie (for direct /gulf-readiness visits)
      fetch('/api/ats-scan/session', { cache: 'no-store' })
        .then(async response => {
          const data = await response.json()
          if (!response.ok) throw new Error(data.error ?? 'Your scan could not be found.')
          setScore(data.score)
          if (data.jobMatch) setJobMatch(data.jobMatch)
        })
        .catch(err => setError(err instanceof Error ? err.message : 'Your scan could not be found.'))
    }, [])

  if (error) return <main className="min-h-dvh bg-bg px-5 py-20 text-center"><h1 className="font-serif text-4xl">Your scan is unavailable</h1><p className="mx-auto mt-4 max-w-lg text-ink-700">{error}</p><Link href="/ats-scan" className="mt-8 inline-flex rounded-radius-md bg-forest-deep px-6 py-3 font-bold text-ink-900-dark">Scan my CV again</Link></main>
  if (!score) return <main className="flex min-h-dvh items-center justify-center bg-bg"><p className="font-mono text-sm text-ink-500">Preparing your Gulf readiness report…</p></main>

  const overallTone = score.overall_score >= 75 ? 'green' : score.overall_score >= 55 ? 'gold' : 'terra'
  return <main className="min-h-dvh bg-bg text-ink-900"><header className="border-b border-line-light bg-bg/95"><div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-2.5"><span className="font-serif flex h-9 w-9 items-center justify-center rounded-radius-md bg-forest-deep text-lg text-gold-text-dark">G</span><span className="font-bold tracking-wide">GCC MENTOR</span></Link><Link href="/login" className="text-sm font-semibold text-ink-400">Log in</Link></div></header>
    <div className="mx-auto max-w-[1100px] px-5 py-12 sm:px-8 lg:py-16"><div className="mx-auto max-w-4xl text-center"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Your free Gulf readiness report</p><h1 className="mt-4 font-serif text-5xl leading-tight sm:text-6xl">Here is what is holding your CV back.</h1><p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-ink-700">{score.summary}</p></div>
      <section className={`mx-auto mt-10 max-w-4xl rounded-radius-xl border-2 ${overallTone === 'green' ? 'border-forest bg-forest-tint' : overallTone === 'gold' ? 'border-redesign-gold bg-redesign-gold-tint' : 'border-terra bg-terra-tint'} p-7 sm:p-10`}><div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left"><div className="flex size-32 shrink-0 flex-col items-center justify-center rounded-full border-8 border-white/70 bg-surface-light shadow-sm"><span className="font-mono text-5xl font-bold">{score.overall_score}</span><span className="text-xs text-ink-500">out of 100</span></div><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-500">Overall GCC readiness</p><h2 className="mt-2 font-serif text-3xl">{score.overall_score >= 75 ? 'Strong foundation' : score.overall_score >= 55 ? 'Good foundation, but needs work' : 'Needs attention before you apply'}</h2><p className="mt-2 text-sm leading-relaxed text-ink-700">This score is based only on what your submitted resume actually contains. It is a diagnostic, not a promise of employment.</p></div></div></section>
      <section className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-3"><ScoreCard label="Structure" value={score.category_scores.structure} tone="green" /><ScoreCard label="Clarity & impact" value={score.category_scores.clarity_and_impact} tone="gold" /><ScoreCard label="Gulf readiness" value={score.category_scores.gulf_readiness} tone="terra" /></section>
      <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2"><List title="What is already working" items={score.strengths} icon="✓" /><List title="What you should fix" items={score.improvements} icon="!" /><div className="md:col-span-2"><List title="Gulf-specific observations" items={score.gulf_format_notes} icon="→" /></div></div>

      {/* Job Match section — only shown when a JD was provided */}
      {jobMatch ? <section className="mx-auto mt-8 max-w-4xl rounded-radius-xl border border-redesign-gold/50 bg-surface-light p-6 sm:p-8"><div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:text-left"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Job match</p><h2 className="mt-2 font-serif text-3xl">How you fit this role</h2></div><div className="flex size-28 shrink-0 flex-col items-center justify-center rounded-full border-6 border-redesign-gold/40 bg-surface-2-light shadow-sm"><span className="font-mono text-4xl font-bold">{jobMatch.overall_score}</span><span className="text-xs text-ink-500">/100</span></div></div><p className="mt-5 border-l-4 border-redesign-gold bg-surface-2-light p-4 text-sm leading-relaxed text-ink-700">{jobMatch.diagnosis}</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{Object.entries(jobMatch.categories).filter(([, c]) => c.applicable).map(([key, c]) => <div key={key} className="rounded-radius-md border border-line-light bg-surface-2-light p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">{CATEGORY_LABELS[key] ?? key}</p><span className="font-mono text-lg font-bold text-forest">{c.score}<span className="text-xs text-ink-400">/100</span></span></div><p className="mt-2 text-[12.5px] leading-relaxed text-ink-700">{c.explanation}</p></div>)}</div></section> : null}

      <section className="mx-auto mt-10 max-w-4xl rounded-radius-xl bg-forest-deep p-8 text-center text-ink-900-dark shadow-redesign-cta-glow sm:p-10"><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text-dark">Your data is saved</p><h2 className="mt-3 font-serif text-4xl">Save these results — create your free account.</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-900-dark/75">We already extracted your resume information and saved your score. Create your account and we&rsquo;ll carry everything into your Career Profile — no second upload, no re-scanning.</p><div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"><Link href="/onboarding" className="inline-flex min-h-12 items-center rounded-radius-md bg-redesign-gold px-7 py-3 text-sm font-bold text-ink-900">Save my results &amp; build profile</Link><Link href="/login" className="inline-flex min-h-12 items-center rounded-radius-md border border-ink-900-dark/20 px-7 py-3 text-sm font-bold text-ink-900-dark/80">I already have an account</Link></div><p className="mt-4 text-xs text-ink-900-dark/55">Your scan is saved for 7 days. Create an account to keep it permanently.</p></section>
    </div></main>
}