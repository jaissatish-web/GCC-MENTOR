'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { useEffect, useState } from 'react'

type Signal = { id: string; label: string; present: boolean; weight: number; fix: string; credit: string; impact?: number }

type Score = {
  overall_score: number
  category_scores: { structure: number; clarity_and_impact: number; gulf_readiness: number }
  strengths: string[]
  improvements: string[]
  gulf_format_notes: string[]
  summary: string
  /** Present since the scan became deterministic; absent on older cached results. */
  signals?: { structure: Signal[]; clarity: Signal[]; gulf: Signal[] }
  potential_score?: number
  quick_wins?: Signal[]
}

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

/**
 * The full pass/fail checklist behind the score.
 *
 * This is the payoff of computing the report in code rather than asking a
 * model for a verdict: every check can be shown with its result and its exact
 * remedy, so the number stops being an opinion the user has to trust and
 * becomes a list they can work through. A model-written summary could never be
 * displayed this way, because there would be nothing underneath it to show.
 */
function Checklist({ title, signals }: { title: string; signals: Signal[] }) {
  const done = signals.filter((x) => x.present).length
  return (
    <section className="rounded-radius-xl border border-line-light bg-surface-light p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl">{title}</h2>
        <span className="font-mono text-sm text-ink-500">
          {done}/{signals.length} passed
        </span>
      </div>
      <ul className="mt-4 space-y-2.5">
        {signals.map((sig) => (
          <li
            key={sig.id}
            className={`flex gap-3 rounded-radius-md border p-3 ${
              sig.present
                ? 'border-forest/30 bg-forest-tint/50'
                : 'border-redesign-gold/40 bg-redesign-gold-tint/60'
            }`}
          >
            <span
              aria-hidden="true"
              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                sig.present ? 'bg-forest text-white' : 'bg-redesign-gold text-forest-deep'
              }`}
            >
              {sig.present ? '✓' : '!'}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink-900">
                {sig.label}
                <span className="sr-only">{sig.present ? ' — passed' : ' — needs attention'}</span>
              </span>
              <span className="mt-0.5 block text-[13px] leading-relaxed text-ink-700">
                {sig.present ? sig.credit : sig.fix}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * The post-scan call to action.
 *
 * Deliberately two different messages, because a visitor scoring 88 and one
 * scoring 52 are in completely different situations and a single generic
 * "create your account" speaks to neither.
 *
 *  >= 75  the CV clears the Gulf basics, so the next real step is tailoring it
 *         to a specific role — that is the paid optimizer, and the account is
 *         the thing standing between them and it.
 *  <  75  something concrete is missing, and we know exactly what and exactly
 *         what it is worth. Naming the gap and the number it unlocks is a far
 *         stronger reason to sign up than "save your results".
 *
 * The projected score is real arithmetic, not a marketing figure: scoring is
 * deterministic, so "fix these and you reach 91" is a fact we can stand behind.
 * That is only possible because the report is computed rather than written by a
 * model.
 *
 * What this copy deliberately does NOT do is promise interviews, employer calls
 * or jobs. The honest motivator is that Gulf recruiters filter on these exact
 * fields — which is true, checkable, and does not need embellishing.
 */
function NextStep({ score }: { score: Score }) {
  const ready = score.overall_score >= 75
  const wins = (score.quick_wins ?? []).filter((w) => (w.impact ?? 0) > 0)
  const potential = score.potential_score ?? 100
  const gain = Math.max(0, potential - score.overall_score)

  return (
    <section className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-radius-xl bg-forest-deep text-ink-900-dark shadow-redesign-cta-glow">
      <div className="p-8 sm:p-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text-dark">
          {ready ? 'You are ready to apply' : 'You are close'}
        </p>

        <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
          {ready
            ? 'Your CV clears the Gulf basics. Now aim it at a specific role.'
            : gain > 0
              ? `${gain} points are sitting on the table.`
              : 'Create your free account to keep this report.'}
        </h2>

        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-ink-900-dark/80">
          {ready
            ? 'A strong general CV still loses to a targeted one. Create your free account to build your Career Profile once, then generate a version tuned to each Gulf role you apply for.'
            : 'Gulf recruiters filter on the exact fields below before a human ever reads your CV. Create your free account and we will walk you through fixing each one.'}
        </p>

        {/* The specific, checkable promise — what fixing the gaps is worth. */}
        {!ready && wins.length > 0 ? (
          <div className="mx-auto mt-6 max-w-xl rounded-radius-lg border border-ink-900-dark/15 bg-ink-900-dark/[0.06] p-5 text-left">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-semibold uppercase tracking-wider text-gold-text-dark">
                Your quickest wins
              </span>
              <span className="font-mono text-sm text-ink-900-dark/70">
                {score.overall_score} → <span className="font-bold text-gold-text-dark">{potential}</span>
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {wins.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-ink-900-dark/85">{w.label}</span>
                  <span className="shrink-0 font-mono text-[13px] font-bold text-gold-text-dark">
                    +{w.impact}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className={buttonVariants({ variant: 'purchase' }) + ' w-full sm:w-auto'}
          >
            {ready ? 'Create my account & optimize' : 'Create my free account & fix these'}
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ variant: 'ghost' }) + ' w-full border-ink-900-dark/25 text-ink-900-dark hover:bg-ink-900-dark/10 sm:w-auto'}
          >
            I already have an account
          </Link>
        </div>

        {/*
          Says only what is actually built. The previous line promised an
          account "keeps it permanently and tracks your score as you improve
          it" — there is no score history anywhere in this product, and the
          claimed scan is shown once on the profile screen, not stored. What
          signing up genuinely does is carry this scan over so the CV does not
          have to be uploaded again.
        */}
        <p className="mt-4 text-center text-xs text-ink-400-dark">
          Free to create. This scan is kept for 7 days — sign up within that time and we carry it
          straight into your profile, so you never upload your CV twice.
        </p>
      </div>
    </section>
  )
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
      {score.signals ? (
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <Checklist title="Gulf requirements" signals={score.signals.gulf} />
          </div>
          <Checklist title="Structure & contact" signals={score.signals.structure} />
          <Checklist title="Achievements & wording" signals={score.signals.clarity} />
        </div>
      ) : (
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 md:grid-cols-2"><List title="What is already working" items={score.strengths} icon="✓" /><List title="What you should fix" items={score.improvements} icon="!" /><div className="md:col-span-2"><List title="Gulf-specific observations" items={score.gulf_format_notes} icon="→" /></div></div>
      )}

      {/* Job Match section — only shown when a JD was provided */}
      {jobMatch ? <section className="mx-auto mt-8 max-w-4xl rounded-radius-xl border border-redesign-gold/50 bg-surface-light p-6 sm:p-8"><div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:text-left"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Job match</p><h2 className="mt-2 font-serif text-3xl">How you fit this role</h2></div><div className="flex size-28 shrink-0 flex-col items-center justify-center rounded-full border-6 border-redesign-gold/40 bg-surface-2-light shadow-sm"><span className="font-mono text-4xl font-bold">{jobMatch.overall_score}</span><span className="text-xs text-ink-500">/100</span></div></div><p className="mt-5 border-l-4 border-redesign-gold bg-surface-2-light p-4 text-sm leading-relaxed text-ink-700">{jobMatch.diagnosis}</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{Object.entries(jobMatch.categories).filter(([, c]) => c.applicable).map(([key, c]) => <div key={key} className="rounded-radius-md border border-line-light bg-surface-2-light p-4"><div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-[0.12em] text-ink-500">{CATEGORY_LABELS[key] ?? key}</p><span className="font-mono text-lg font-bold text-forest">{c.score}<span className="text-xs text-ink-400">/100</span></span></div><p className="mt-2 text-[12.5px] leading-relaxed text-ink-700">{c.explanation}</p></div>)}</div></section> : null}

      <NextStep score={score} />
    </div></main>
}