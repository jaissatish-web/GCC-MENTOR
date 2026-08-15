'use client'

import Link from 'next/link'
import { Suspense, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'
import { Button, buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { JobMatchResult, JobMatchCategoryKey } from '@/types/jobMatch'

/**
 * Job Match — new route (TASK-092, PAGE_SPECS §C / Stage 1 item 5).
 *
 * The standalone authenticated Job Match report. A pasted JD is POSTed to
 * /api/job-match, which reuses the EXACT /api/ats-scan computation against
 * the caller's saved Career Profile (via the TASK-073 profile adapter), so
 * the returned `JobMatchResult` is shape-identical to what /ats-scan and
 * /optimize already consume. This page is a new *display* of an existing
 * *computation*, not a new computation.
 *
 * Layout per §C: JD-paste form at top (900px cap); results below as the Job
 * Match breakdown — full-width diagnosis paragraph, then a category grid
 * (2-up tablet / 3-up desktop), with a grounding notice.
 */

// Display order matches /ats-scan's CATEGORY_LABELS (semantic "why" first,
// then deterministic evidence) so the two pages render as siblings.
const CATEGORY_LABELS: Array<[string, JobMatchCategoryKey]> = [
  ['Summary Match', 'summary_match'],
  ['Career Relevance', 'career_relevance'],
  ['Required Skills', 'required_skills'],
  ['Industry Match', 'industry_match'],
  ['Experience Level', 'experience_level'],
  ['GCC Experience', 'gcc_experience'],
  ['Education', 'education'],
  ['Certifications', 'certifications'],
  ['Driving License', 'driving_license'],
]

function Score({ value, large = false }: { value: number; large?: boolean }) {
  return (
    <span className={`font-mono font-bold text-forest ${large ? 'text-6xl' : 'text-3xl'}`}>
      {value}
      <span className={large ? 'text-2xl' : 'text-base'}>/100</span>
    </span>
  )
}

function JobMatchScreen() {
  const [jobDescription, setJobDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobMatch, setJobMatch] = useState<JobMatchResult | null>(null)
  const [ran, setRan] = useState(false)

  async function analyze(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setJobMatch(null)
    setRan(true)
    setLoading(true)
    try {
      const res = await fetch('/api/job-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jobDescription }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(
          res.status === 401
            ? 'Please log in to check a job match.'
            : res.status === 404
              ? 'Build your Career Profile first — a job match needs a profile to compare against.'
              : (payload?.error as string | undefined) ?? 'Could not analyze this job. Please try again.'
        )
      }
      setJobMatch((payload?.jobMatch as JobMatchResult | null) ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not analyze this job. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-[900px] px-5 py-8 sm:px-8 lg:px-10 font-redesign-sans">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[28px] leading-tight text-ink-900 sm:text-[32px]">Job Match</h1>
        <p className="text-[13px] text-ink-400">
          Paste a Gulf job description and see how your saved Career Profile aligns.
        </p>
      </div>

      {/* JD paste form */}
      <Card tone="light" className="mt-6 p-6">
        <form onSubmit={analyze} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-ink-900">
            Job description
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={7}
              placeholder="Paste a job description to see keyword alignment and overall fit…"
              className="w-full rounded-radius-md border border-line-light/70 bg-surface-2-light/50 p-4 font-sans text-[14px] font-normal text-ink-900 outline-none placeholder:text-ink-400 focus:border-redesign-gold focus:ring-2 focus:ring-redesign-gold/25"
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] text-ink-400">
              {jobDescription.length.toLocaleString()} characters
            </p>
            <Button type="submit" variant="primary" disabled={loading || jobDescription.trim().length === 0}>
              {loading ? 'Analyzing…' : 'Analyze match'}
            </Button>
          </div>
        </form>
      </Card>

      {error ? (
        <div className="mt-4 rounded-radius-lg border border-terra/40 bg-terra-tint px-3.5 py-3 text-[12.5px] text-terra">
          {error}
        </div>
      ) : null}

      {/* Results */}
      {ran && !loading && !error ? (
        jobMatch ? (
          <section className="mt-8 flex flex-col gap-6">
            {/* Full-width diagnosis */}
            <Card tone="light" className="flex flex-col gap-4 p-6">
              <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:text-left">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">
                    Your job match
                  </p>
                  <h2 className="mt-2 font-serif text-3xl text-ink-900">Overall fit</h2>
                </div>
                <Score value={jobMatch.overall_score} large />
              </div>
              <p className="rounded-radius-lg border-l-4 border-redesign-gold bg-surface-2-light/50 p-4 text-[14px] leading-relaxed text-ink-700">
                {jobMatch.diagnosis}
              </p>
            </Card>

            {/* Category grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {CATEGORY_LABELS.filter(([, key]) => jobMatch.categories[key]?.applicable).map(([label, key]) => {
                const c = jobMatch.categories[key]
                return (
                  <Card key={key} tone="light" className="flex flex-col justify-between gap-3 p-4">
                    <p className="text-[12px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
                    {c.explanation ? (
                      <p className="text-[12.5px] leading-relaxed text-ink-700">{c.explanation}</p>
                    ) : (
                      <p className="text-[12.5px] text-ink-400">No breakdown.</p>
                    )}
                    <span className="font-mono text-lg font-bold text-forest">
                      {c.score}
                      <span className="text-sm">/100</span>
                    </span>
                  </Card>
                )
              })}
            </div>

            {/* Grounding notice + optimize CTA */}
            <div className="rounded-radius-lg border border-line-light bg-surface-2-light/40 px-4 py-3 text-[12px] text-ink-400">
              Based strictly on your saved Career Profile and this job description — nothing invented. Your profile and
              packages are never altered here.
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
              <p className="text-[12.5px] text-ink-400">Ready to tailor your resume for a specific role?</p>
              <Link
                href="/optimize/target"
                className={cn(buttonVariants({ variant: 'purchase' }), 'w-full sm:w-auto text-[13.5px]')}
              >
                Optimize your resume →
              </Link>
            </div>
          </section>
        ) : (
          <Card tone="light" className="mt-8 p-8 text-center">
            <p className="text-[13px] font-semibold text-ink-900/85">No match could be computed</p>
            <p className="mt-1 text-[12.5px] text-ink-400">
              Paste the full job description and try again.
            </p>
          </Card>
        )
      ) : null}
    </main>
  )
}

export default function JobMatchPage() {
  return (
    <AppShell>
      <Suspense>
        <JobMatchScreen />
      </Suspense>
    </AppShell>
  )
}