'use client'

import Link from 'next/link'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/Button'
import { readMatchReport } from '@/components/optimizer/MatchResult'
import { cn, PERSONA_INDUSTRIES } from '@/lib/utils'
import { CTA, NAMES, USES } from '@/lib/serviceLabels'
import type { MatchReport } from '@/lib/optimizer/types'
import type { ResumeDocument } from '@/lib/resumeDocument'
import type { Package, PackageServiceEventType } from '@/types/package'

/**
 * THE RESULTS WORKSPACE (founder request 2026-09-17): after optimizing, every
 * result for this job on one screen, as coloured cards that each answer one
 * question.
 *
 *   teal    Target job      what was this CV written for?
 *   green   ATS score       how much better does it match? (before → after)
 *   purple  Summary         what does the top of my CV say now?
 *   gold    What changed    which parts were rewritten?
 *   tiles   Next steps      cover letter · interview Q&A · mock interview
 *
 * A CV saved without a score (its job analysis failed) gets a "Calculate ATS
 * score" button here (POST /api/packages/[id]/ats-score), which also fills an
 * empty summary from profile facts.
 */
export function ResultsOverview({
  pkg,
  document,
  onScored,
}: {
  pkg: Package
  document: ResumeDocument | null
  onScored: (body: { match_report: MatchReport; document_snapshot: ResumeDocument }) => void
}) {
  const id = encodeURIComponent(pkg.id)
  const report = readMatchReport(pkg.match_report)
  const [scoring, setScoring] = useState(false)
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [showJd, setShowJd] = useState(false)

  const calculate = async () => {
    setScoring(true)
    setScoreError(null)
    try {
      const res = await fetch(`/api/packages/${id}/ats-score`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.match_report) {
        setScoreError((body?.error as string) ?? 'Could not calculate the ATS score. Please try again.')
        return
      }
      onScored(body)
    } catch {
      setScoreError('Network error. Please check your connection and try again.')
    } finally {
      setScoring(false)
    }
  }

  const summary = (document?.summary ?? '').trim()
  const blocks = pkg.optimized_content?.experience_blocks ?? []
  const rewritten = blocks.filter((b) => b.was_optimized).length
  const summaryWritten = Boolean(pkg.optimized_content?.summary?.generated?.trim() || pkg.optimized_content?.summary?.user_edited?.trim())
  const skillsOrdered = (pkg.skills_order ?? []).length
  const confirmed = (report?.suggestions ?? []).filter((s) => s.status === 'confirmed').length
  const pending = (report?.suggestions ?? []).filter((s) => s.status === 'pending').length
  const level = pkg.optimization_level.charAt(0).toUpperCase() + pkg.optimization_level.slice(1)
  const industry = PERSONA_INDUSTRIES.find((i) => i.value === pkg.target_industry)?.label ?? null
  const description = (pkg.job_description ?? '').trim()

  const letterReady = Array.isArray(pkg.cover_letters) && pkg.cover_letters.length > 0
  const qaReady = Boolean(pkg.interview_questions?.questions?.length)
  const mockReady = Boolean(pkg.mock_interview_runs?.some((r) => r.status === 'completed'))

  // HOW OFTEN EACH SERVICE WAS USED FOR THIS CV (founder request 2026-09-17).
  // Counted from the package's own service history (migration 048/050), which
  // records one event per generation — so a regenerated Q&A set counts twice
  // even though only the newest set is stored.
  const used = (type: PackageServiceEventType) => {
    const rows = (pkg.service_events ?? []).filter((e) => e.type === type)
    return { count: rows.length, last: rows.map((e) => e.at).sort().at(-1) ?? null }
  }
  const letterUse = used('cover_letter_generated')
  const qaUse = used('qa_generated')
  const mockUse = used('mock_interview_started')
  const mockDone = used('mock_interview_completed')

  return (
    <section aria-label="Your results" className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        {/* TARGET JOB — teal */}
        <article className="flex flex-col gap-2 rounded-card border border-teal/40 bg-teal-soft p-4">
          <CardLabel tone="text-teal" icon="🎯">{NAMES.targetJob}</CardLabel>
          <p className="break-words font-display text-[20px] leading-tight text-ink">{pkg.target_job_title}</p>
          <p className="text-[12.5px] text-ink-soft">
            {[pkg.target_company, industry, `${level} optimization`].filter(Boolean).join(' · ')}
          </p>
          {description ? (
            <>
              <button
                type="button"
                aria-expanded={showJd}
                onClick={() => setShowJd((v) => !v)}
                className="min-h-11 self-start text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {showJd ? 'Hide job description' : 'Show job description'}
              </button>
              {showJd ? (
                <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-ctl border border-teal/20 bg-white p-3 text-[13px] leading-relaxed text-ink-soft">
                  {description}
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-[12.5px] text-ink-muted">No job description saved — based on the job title.</p>
          )}
        </article>

        {/* ATS SCORE — green */}
        <article className="flex flex-col gap-2 rounded-card border border-ok/40 bg-ok-soft p-4">
          <CardLabel tone="text-ok" icon="📈">
            {NAMES.atsScore}
            {report?.mode === 'target_title_only' ? ' · estimate' : ''}
          </CardLabel>
          {report?.after ? (
            <>
              <div className="flex items-end gap-4">
                <ScoreNumber label="Before" value={report.before.total} muted />
                <span aria-hidden="true" className="pb-6 text-[22px] text-ink-muted">→</span>
                <ScoreNumber label="After" value={report.after.total} />
                {report.after.total - report.before.total > 0 ? (
                  <span className="mb-6 rounded-full bg-ok px-2.5 py-1 font-mono text-[13px] font-bold text-white">
                    +{report.after.total - report.before.total}
                  </span>
                ) : null}
              </div>
              <ScoreBar before={report.before.total} after={report.after.total} />
              <p className="text-[12.5px] text-ink-soft">
                {pending > 0
                  ? `Up to ${report.projected_with_suggestions ?? report.after.total} if you confirm the ${pending} suggested line${pending === 1 ? '' : 's'} below.`
                  : `Highest possible with your current profile: ${Math.max(report.max_total, report.after.total)}.`}
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-ink">Not calculated yet for this CV</p>
              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                Reading the job took too long when this CV was built. Calculate it now: we read the job again and score
                your CV before and after. Your CV text stays the same{summary ? '' : ', except that an empty summary is filled from your profile facts'}.
              </p>
              <button
                type="button"
                onClick={() => void calculate()}
                disabled={scoring}
                className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'self-start')}
              >
                {scoring ? 'Reading the job and scoring…' : 'Calculate ATS score'}
              </button>
              {scoreError ? <p className="text-[12.5px] text-alert">{scoreError}</p> : null}
            </>
          )}
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* SUMMARY — purple */}
        <article className="flex flex-col gap-2 rounded-card border border-sec-summary/30 bg-[#F2EEF9] p-4">
          <div className="flex items-center justify-between gap-2">
            <CardLabel tone="text-sec-summary" icon="📝">Professional summary</CardLabel>
            <Link href={`/package/${id}/edit`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-sec-summary underline-offset-2 hover:underline">
              {CTA.editCv}
            </Link>
          </div>
          {summary ? (
            <p className="text-[14px] leading-relaxed text-ink">{summary}</p>
          ) : (
            <p className="text-[13px] leading-relaxed text-ink-soft">
              This CV has no summary yet. Use <strong>Calculate ATS score</strong> above to fill it from your profile
              facts, or write your own with {CTA.editCv}.
            </p>
          )}
        </article>

        {/* WHAT CHANGED — gold */}
        <article className="flex flex-col gap-2 rounded-card border border-gold/40 bg-gold-soft/60 p-4">
          <CardLabel tone="text-gold-ink" icon="✏️">What changed</CardLabel>
          <ul className="flex flex-col gap-1.5 text-[13px] text-ink">
            <Change ok={summaryWritten}>{summaryWritten ? 'Summary rewritten for this job' : 'Summary written from your profile facts'}</Change>
            <Change ok={rewritten > 0}>
              {rewritten} of {blocks.length} role{blocks.length === 1 ? '' : 's'} rewritten
            </Change>
            <Change ok={skillsOrdered > 0}>Skills ordered by relevance</Change>
            {confirmed > 0 ? <Change ok>{confirmed} suggested line{confirmed === 1 ? '' : 's'} you confirmed</Change> : null}
            <Change ok>Employers, titles, dates and education unchanged</Change>
          </ul>
          <Link href={`/optimize/preview/${id}`} className="inline-flex min-h-11 items-center self-start text-[13px] font-semibold text-gold-ink underline-offset-2 hover:underline">
            {CTA.seeChanges} →
          </Link>
        </article>
      </div>

      {/* NEXT STEPS — one coloured tile per service */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ServiceTile
          icon="✉️"
          title={NAMES.coverLetter}
          body={USES.coverLetter}
          done={letterReady}
          used={Math.max(letterUse.count, Array.isArray(pkg.cover_letters) ? pkg.cover_letters.length : 0)}
          lastAt={letterUse.last}
          href={`/cover-letter?package=${id}`}
          cta={CTA.writeCoverLetter}
          tone="border-sec-summary/30 bg-white"
          accent="text-sec-summary"
        />
        <ServiceTile
          icon="💬"
          title={NAMES.interviewQa}
          body={USES.interviewQa}
          done={qaReady}
          used={qaUse.count}
          lastAt={qaUse.last}
          href={`/interview-qa?package=${id}`}
          cta={CTA.prepareInterviewQa}
          tone="border-sec-status/30 bg-white"
          accent="text-sec-status"
        />
        <ServiceTile
          icon="🎤"
          title={NAMES.mockInterview}
          body={USES.mockInterview}
          done={mockReady}
          used={Math.max(mockUse.count, pkg.mock_interview_runs?.length ?? 0)}
          lastAt={mockUse.last ?? mockDone.last}
          extra={mockDone.count > 0 ? `${mockDone.count} report${mockDone.count === 1 ? '' : 's'} saved` : null}
          href={`/mock-interview?package=${id}`}
          cta={CTA.startMockInterview}
          tone="border-sec-experience/30 bg-white"
          accent="text-sec-experience"
        />
      </div>
    </section>
  )
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS[d.getMonth()] ?? ''}`
}

function CardLabel({ children, tone, icon }: { children: React.ReactNode; tone: string; icon: string }) {
  return (
    <p className={cn('flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em]', tone)}>
      <span aria-hidden="true">{icon}</span>
      {children}
    </p>
  )
}

function ScoreNumber({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className={cn('font-mono font-bold leading-none', muted ? 'text-[30px] text-ink-muted' : 'text-[44px] text-ok')}>{value}</span>
      <span className="text-[12px] font-semibold text-ink-muted">{label}</span>
    </div>
  )
}

function ScoreBar({ before, after }: { before: number; after: number }) {
  const b = Math.max(0, Math.min(100, before))
  const a = Math.max(0, Math.min(100, after))
  return (
    <div className="relative h-3 overflow-hidden rounded-full bg-white" role="img" aria-label={`ATS score ${b} before, ${a} after, out of 100`}>
      <span className="absolute inset-y-0 left-0 bg-ok" style={{ width: `${a}%` }} />
      <span className="absolute inset-y-0 left-0 bg-ink-muted/50" style={{ width: `${Math.min(b, a)}%` }} />
    </div>
  )
}

function Change({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span aria-hidden="true" className={cn('mt-0.5 font-bold', ok ? 'text-ok' : 'text-ink-muted')}>
        {ok ? '✓' : '•'}
      </span>
      <span>{children}</span>
    </li>
  )
}

function ServiceTile({
  icon,
  title,
  body,
  done,
  used,
  lastAt,
  extra,
  href,
  cta,
  tone,
  accent,
}: {
  icon: string
  title: string
  body: string
  done: boolean
  /** How many times this service ran for THIS CV. */
  used: number
  lastAt: string | null
  extra?: string | null
  href: string
  cta: string
  tone: string
  accent: string
}) {
  return (
    <article className={cn('flex flex-col gap-2 rounded-card border p-4 shadow-m-1', tone)}>
      <div className="flex items-center justify-between gap-2">
        <p className={cn('flex items-center gap-1.5 text-[14px] font-bold', accent)}>
          <span aria-hidden="true">{icon}</span>
          {title}
        </p>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[11.5px] font-semibold',
            done ? 'bg-ok-soft text-ok' : 'border border-dashed border-line-strong text-ink-muted',
          )}
        >
          {done ? 'Ready' : 'To do'}
        </span>
      </div>
      <p className="flex-1 text-[12.5px] leading-relaxed text-ink-soft">{body}</p>
      <p className="rounded-ctl bg-canvas px-2.5 py-1.5 text-[12px] text-ink-soft">
        {used > 0 ? (
          <>
            <strong className="text-ink">
              Used {used} time{used === 1 ? '' : 's'}
            </strong>
            {extra ? <> · {extra}</> : null}
            {lastAt ? <> · last {formatDay(lastAt)}</> : null}
          </>
        ) : (
          'Not used yet for this CV'
        )}
      </p>
      <Link href={href} className={cn(buttonVariants({ variant: done ? 'secondary' : 'primary', size: 'sm' }), 'self-start')}>
        {done ? `Open ${title}` : cta}
      </Link>
    </article>
  )
}
