'use client'
import { ProcessingInline } from '@/components/ui/Processing'
import { RESCORE_NOTES } from '@/lib/processingNotes'
import { TargetJobOverview } from '@/components/package/TargetJobOverview'
import { AtsFileCheck } from '@/components/package/AtsFileCheck'

import Link from 'next/link'
import { InterviewProgress } from '@/components/mock-interview/InterviewProgress'
import { interviewProgress } from '@/lib/interviewProgress'
import { FileText, PenLine, TrendingUp, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { buttonVariants } from '@/components/ui/Button'
import { readMatchReport } from '@/components/optimizer/MatchResult'
import { cn } from '@/lib/utils'
import { CTA, NAMES } from '@/lib/serviceLabels'
import type { MatchReport } from '@/lib/optimizer/types'
import type { ResumeDocument } from '@/lib/resumeDocument'
import type { Package } from '@/types/package'

/**
 * THE RESULTS WORKSPACE (founder request 2026-09-17): after optimizing, every
 * result for this job on one screen, as coloured cards that each answer one
 * question.
 *
 *   teal    Target job      what was this CV written for?
 *   green   ATS score       how much better does it match? (before → after)
 *   purple  Summary         what does the top of my CV say now?
 *   gold    What changed    which parts were rewritten?
 * Service counts and links are rendered by the parent workspace.
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
  // "Rewritten" only when the text really differs from the profile (launch
  // audit 2026-10-02: saving the review page stored the UNCHANGED summary as
  // edited, and this said "Summary rewritten" beside the original text).
  const summaryNow = (pkg.optimized_content?.summary?.user_edited ?? pkg.optimized_content?.summary?.generated ?? '').trim()
  const summarySource = (pkg.optimized_content?.summary?.source_profile_summary ?? '').trim()
  const summaryWritten = summaryNow !== '' && summaryNow.replace(/\s+/g, ' ') !== summarySource.replace(/\s+/g, ' ')
  // Claimed only when the build recorded a real re-rank (older rows make no claim).
  const skillsOrdered = pkg.optimized_content?.skills_reordered === true ? 1 : 0
  const confirmed = (report?.suggestions ?? []).filter((s) => s.status === 'confirmed').length
  const pending = (report?.suggestions ?? []).filter((s) => s.status === 'pending').length
  const practiceProgress = interviewProgress(pkg.mock_interview_runs ?? [])

  return (
    <section aria-label="Your results" className="flex flex-col gap-3">
      <div className="grid gap-3 md:grid-cols-2">
        <TargetJobOverview pkg={pkg} />

        {/* ATS SCORE — green */}
        <article className="flex flex-col gap-2 rounded-card border border-ok/40 bg-ok-soft p-4">
          <CardLabel tone="text-ok" icon={TrendingUp}>
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
              <p className="type-helper text-ink-soft">
                {pending > 0
                  ? `Up to ${report.projected_with_suggestions ?? report.after.total} if you confirm the ${pending} suggested line${pending === 1 ? '' : 's'} below.`
                  : `Estimated match potential with your current profile: ${Math.max(report.max_total, report.after.total)}.`}
              </p>
              {/* Optimizer v3: say plainly when the job is outside the user's field. */}
              {report.field_match && report.field_match.match !== 'same' ? (
                <p className="type-helper leading-snug text-ink-soft">
                  {report.field_match.match === 'different'
                    ? `This job (${report.field_match.job_field}) is outside your field (${report.field_match.candidate_field}), so the score stays low. Jobs in your field score much higher.`
                    : `This job is partly your field: requirements outside ${report.field_match.candidate_field} stay unmet.`}
                </p>
              ) : null}
              {/* Certificates are never added for the user — offered instead. */}
              {report.ask_certifications?.length ? (
                <p className="type-helper leading-snug text-ink-soft">
                  The job also asks for{' '}
                  <strong className="text-ink">{report.ask_certifications.slice(0, 3).map((c) => c.term).join(', ')}</strong>.
                  {' '}If you hold one,{' '}
                  <Link href="/profile?open=sec_certifications" className="font-semibold text-teal underline-offset-2 hover:underline">
                    add it to your profile
                  </Link>{' '}
                  and optimize again for a higher score.
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-[14px] font-semibold text-ink type-helper">Not calculated yet for this resume</p>
              <p className="type-helper leading-relaxed text-ink-soft">
                Reading the job took too long when this resume was built. Calculate it now: we read the job again and score
                your resume before and after. Your resume text stays the same{summary ? '' : ', except that an empty summary is filled from your profile facts'}.
              </p>
              <button
                type="button"
                onClick={() => void calculate()}
                disabled={scoring}
                className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'self-start')}
              >
                {scoring ? 'Reading the job and scoring…' : 'Calculate ATS score'}
              </button>
              {scoring ? <ProcessingInline steps={['Reading the job description', 'Scoring your resume before', 'Scoring your optimized resume']} stepMs={3500} notes={RESCORE_NOTES} /> : null}
              {scoreError ? <p className="type-helper text-alert">{scoreError}</p> : null}
            </>
          )}
        </article>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* SUMMARY — purple */}
        <article className="flex flex-col gap-2 rounded-card border border-sec-summary/30 bg-teal-soft p-4">
          <div className="flex items-center justify-between gap-2">
            <CardLabel tone="text-sec-summary" icon={FileText}>Professional summary</CardLabel>
            <Link href={`/package/${id}/edit`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-sec-summary underline-offset-2 hover:underline">
              {CTA.editCv}
            </Link>
          </div>
          {summary ? (
            <p className="text-[14px] leading-relaxed text-ink type-helper">{summary}</p>
          ) : (
            <p className="type-helper leading-relaxed text-ink-soft">
              This resume has no summary yet. Use <strong>Calculate ATS score</strong> above to fill it from your profile
              facts, or write your own with {CTA.editCv}.
            </p>
          )}
        </article>

        {/* WHAT CHANGED — gold */}
        <article className="flex flex-col gap-2 rounded-card border border-gold/40 bg-gold-soft/60 p-4">
          <CardLabel tone="text-gold-ink" icon={PenLine}>What changed</CardLabel>
          <ul className="flex flex-col gap-1.5 text-[13px] text-ink">
            <Change ok={summaryWritten}>{summaryWritten ? 'Summary rewritten for this job' : summarySource ? 'Summary kept as in your profile' : 'Summary written from your profile facts'}</Change>
            <Change ok={rewritten > 0}>
              {rewritten} of {blocks.length} role{blocks.length === 1 ? '' : 's'} rewritten
            </Change>
            <Change ok={skillsOrdered > 0}>Skills ordered by relevance</Change>
            {confirmed > 0 && !report?.auto_applied ? <Change ok>{confirmed} suggested line{confirmed === 1 ? '' : 's'} you confirmed</Change> : null}
            <Change ok>Employers, titles, dates and education unchanged</Change>
          </ul>
          {/* Lines added straight into the CV (after the one-time agreement) are
              never silent: say how many and link to where they can be removed. */}
          {confirmed > 0 && report?.auto_applied ? (
            <div className="flex flex-col gap-1 rounded-ctl border border-gold/50 bg-white p-3">
              <p className="type-helper font-semibold text-ink">{confirmed} line{confirmed === 1 ? '' : 's'} added for this job, typical of your field</p>
              <p className="type-helper text-ink-soft">Keep only what is true for you, you may be asked about any line in an interview.</p>
              <Link href={`/optimize/preview/${id}`} className="inline-flex min-h-11 items-center self-start text-[13px] font-semibold text-gold-ink underline-offset-2 hover:underline">See and remove →</Link>
            </div>
          ) : null}
          <Link href={`/optimize/preview/${id}`} className="inline-flex min-h-11 items-center self-start text-[13px] font-semibold text-gold-ink underline-offset-2 hover:underline">
            {CTA.seeChanges} →
          </Link>
        </article>
      </div>

      {/* ATS FILE CHECK — the downloaded PDF read back like an ATS (2026-10-02) */}
      <AtsFileCheck packageId={pkg.id} />

      {practiceProgress && <InterviewProgress progress={practiceProgress} packageId={pkg.id} compact />}
    </section>
  )
}

function CardLabel({ children, tone, icon: Icon }: { children: React.ReactNode; tone: string; icon: LucideIcon }) {
  return (
    <p className={cn('flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.12em]', tone)}>
      <Icon className="size-4 shrink-0" strokeWidth={2.2} aria-hidden="true" />
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
