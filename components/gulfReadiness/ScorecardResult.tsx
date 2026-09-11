'use client'

import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import type { GulfReadinessResult } from '@/lib/gulfReadiness/types'

/**
 * The Gulf Readiness result, rendered from a computed result object.
 *
 * ONE COMPONENT, TWO AUDIENCES. Anonymous visitors see everything above the lock:
 * the score, the scenario, the band message, the dimension bars, their top
 * strengths and gaps, and the first recommendation. The detailed breakdown and the
 * full ranked plan sit behind an honest, clearly-labelled signup gate — never a
 * blurred fake, and never the basic score itself. After signup the same object is
 * rendered with `locked={false}`.
 *
 * Numbers and narrative come from the SAME result object, so the words can never
 * contradict the score.
 */

function bandColour(key: string): { ring: string; text: string; tint: string } {
  if (key === 'ready') return { ring: 'text-teal', text: 'text-teal', tint: 'bg-teal-soft' }
  if (key === 'mid') return { ring: 'text-teal', text: 'text-teal', tint: 'bg-gold-tint' }
  return { ring: 'text-alert', text: 'text-alert', tint: 'bg-alert-soft' }
}

function ScoreRing({ score, colour }: { score: number; colour: string }) {
  const r = 52
  const c = 2 * Math.PI * r
  const dash = (score / 100) * c
  return (
    <svg viewBox="0 0 120 120" className="h-36 w-36 -rotate-90">
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-line" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        className={`${colour} transition-[stroke-dasharray] duration-1000 ease-out`}
      />
    </svg>
  )
}

export function ScorecardResult({
  result,
  locked,
  source = 'resume',
}: {
  result: GulfReadinessResult
  locked: boolean
  /**
   * What was scored. Only the thin-input note depends on it: "upload a cleaner
   * export" is true advice after a resume scan, and false in the Career
   * Profile's Improve panel, where the score is read from the profile and there
   * is no upload to redo.
   */
  source?: 'resume' | 'profile'
}) {
  const colour = bandColour(result.band.key)

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <section className="rounded-card border border-line bg-white p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative flex items-center justify-center">
            <ScoreRing score={result.finalScore} colour={colour.ring} />
            <div className="absolute flex flex-col items-center">
              <span className="font-mono text-4xl font-bold text-ink">{result.finalScore}</span>
              <span className="text-[12px] text-ink-muted">/ 100</span>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-center gap-2 text-center sm:items-start sm:text-left">
            <span className={`rounded-full px-3 py-1 text-[12px] font-bold uppercase tracking-wider ${colour.tint} ${colour.text}`}>
              {result.scenarioLabel}
            </span>
            <h2 className="font-display text-2xl text-ink">{result.band.label}</h2>
            <p className="text-[14px] leading-relaxed text-ink-soft">{result.band.message}</p>
          </div>
        </div>

        {result.lowResumeSignal ? (
          <p className="mt-5 rounded-ctl border border-line bg-canvas/60 px-3.5 py-2.5 text-[12px] text-ink-muted">
            {source === 'profile'
              ? 'Your Career Profile is still thin, so parts of this score are a rough estimate. It gets more accurate as you add your work history, skills and education.'
              : 'Some of your resume could not be read clearly, so parts of this score are a rough estimate. Pasting your resume text or uploading a cleaner export gives a more accurate result.'}
          </p>
        ) : null}
      </section>

      {/* Dimension bars */}
      <section className="rounded-card border border-line bg-white p-6 sm:p-8">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-muted">Your profile at a glance</h3>
        <div className="mt-4 flex flex-col gap-3.5">
          {result.dimensions.map((d) => {
            const pct = d.max === 0 ? 0 : Math.round((d.score / d.max) * 100)
            return (
              <div key={d.key} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-ink">
                    {d.label}
                    {d.confidence === 'low' ? (
                      <span className="ml-2 text-[12px] font-normal uppercase tracking-wide text-ink-muted">low confidence</span>
                    ) : null}
                  </span>
                  <span className="font-mono text-ink-muted">
                    {d.score}/{d.max}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-canvas">
                  <div
                    className={`h-2 rounded-full ${pct >= 70 ? 'bg-teal' : pct >= 40 ? 'bg-teal' : 'bg-alert'} transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Strengths + gaps */}
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-card border border-line bg-white p-6">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-teal">Working in your favour</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {result.strengths.length ? (
              result.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-ink-soft">
                  <span className="text-teal">✓</span>
                  {s}
                </li>
              ))
            ) : (
              <li className="text-[13px] text-ink-muted">We could not detect clear strengths yet — the recommendations below are where to start.</li>
            )}
          </ul>
        </section>

        <section className="rounded-card border border-line bg-white p-6">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-alert">Holding your score back</h3>
          <ul className="mt-3 flex flex-col gap-2.5">
            {result.weaknesses.length ? (
              result.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-ink-soft">
                  <span className="text-alert">!</span>
                  {w}
                </li>
              ))
            ) : (
              <li className="text-[13px] text-ink-muted">No major gaps stood out — a tailored, optimised resume is your next step.</li>
            )}
          </ul>
        </section>
      </div>

      {/* Recommendations — first one always visible; the ranked rest gated */}
      <section className="rounded-card border border-line bg-white p-6 sm:p-8">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-muted">If you fix one thing, start here</h3>
        <div className="mt-4 flex flex-col gap-3">
          {(locked ? result.recommendations.slice(0, 1) : result.recommendations).map((r, i) => (
            <div key={i} className="rounded-card border border-line bg-canvas/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12px] text-ink-muted">#{i + 1}</span>
                <span className="text-[14px] font-semibold text-ink">{r.title}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[12px] font-bold uppercase tracking-wide text-ink-muted">
                  {r.impact} impact · {r.difficulty} effort
                </span>
              </div>
              <p className="mt-1.5 text-[13px] text-ink-soft">{r.why}</p>
            </div>
          ))}
          {locked && result.recommendations.length > 1 ? (
            <p className="text-[12px] text-ink-muted">
              {result.recommendations.length - 1} more ranked {result.recommendations.length - 1 === 1 ? 'improvement is' : 'improvements are'} in your full report.
            </p>
          ) : null}
        </div>
      </section>

      {/* The honest signup gate — shown only in the anonymous (locked) view */}
      {locked ? (
        <section className="rounded-card border border-teal/40 bg-gold-tint/40 p-6 text-center sm:p-8">
          <h3 className="font-display text-2xl text-ink">See your complete Gulf Readiness report</h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-soft">
            Create a free account to unlock the full breakdown — every dimension explained, your complete ranked
            action plan, and what to fix first. Your result is already saved in this browser and comes with you.
          </p>
          <div className="mt-5 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className={buttonVariants({ variant: 'purchase' })}>
              Create my free account &amp; unlock the full report
            </Link>
          </div>
          <p className="mt-3 text-[12px] text-ink-muted">
            Free account. We don&rsquo;t create a saved profile from this check unless you sign up.
          </p>
        </section>
      ) : null}
    </div>
  )
}
