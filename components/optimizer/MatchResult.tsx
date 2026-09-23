'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { MatchReport } from '@/lib/optimizer/types'
import { BandPill, KeywordChips, PartBars, ScoreRing } from './MatchScore'
import { CTA, NAMES } from '@/lib/serviceLabels'

/**
 * Before -> after match result on the package screen (2026-09-17).
 * docs/17_OPTIMIZER_ENGINE.md §5. Every number is deterministic.
 */

export function readMatchReport(raw: unknown): MatchReport | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Partial<MatchReport>
  if (r.report_version !== 1 || !r.before || typeof r.before.total !== 'number') return null
  return r as MatchReport
}

export function MatchResult({
  report,
  packageId,
  roleNames,
  compact = false,
}: {
  report: MatchReport
  packageId: string
  /** profile_work_experience id -> "Role at Company" */
  roleNames: Record<string, string>
  compact?: boolean
}) {
  const after = report.after
  if (!after) return null
  const gain = after.total - report.before.total
  const estimate = report.mode === 'target_title_only'
  const place = (w: string) => (w === 'summary' ? 'your summary' : roleNames[w] ? roleNames[w] : 'your experience')
  const kept = (report.kept_original ?? []).filter((k, i, all) => all.findIndex((x) => x.block === k.block) === i)

  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">
            {estimate ? `${NAMES.atsScore} · estimate (no job description)` : `${NAMES.atsScore} for this target job`}
          </p>
          <h2 className="font-display text-[18px] leading-tight text-ink">
            {gain > 0 ? `Your ATS score went from ${report.before.total} to ${after.total}` : 'Your CV, sharpened for this job'}
          </h2>
        </div>
        {report.after_edited ? (
          <span className="rounded-full border border-line bg-canvas px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">
            Updated after your edits
          </span>
        ) : null}
      </div>

      <div className={cn('flex flex-col gap-5', !compact && 'lg:flex-row lg:items-center')}>
        <div className="flex items-center gap-3">
          <ScoreRing value={report.before.total} size={76} label="Before" muted />
          <span aria-hidden="true" className="text-[22px] text-ink-muted">→</span>
          <ScoreRing value={after.total} size={112} label="After" />
          <div className="ml-1 flex flex-col items-start gap-1.5">
            <BandPill value={after.total} />
            {gain > 0 ? <span className="font-mono text-[13px] font-semibold text-teal">+{gain} points</span> : null}
            <span className="text-[12px] leading-snug text-ink-muted">
              Honest max for your profile: <strong className="text-ink">{Math.max(report.max_total, after.total)}</strong>
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <PartBars score={after} compare={report.before} />
        </div>
      </div>

      {report.why_fits && report.why_fits.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12.5px] font-semibold text-ink">Why this CV fits {report.target.job_title}</p>
          <ul className="flex flex-col gap-1">
            {report.why_fits.map((w) => (
              <li key={w.term} className="text-[12.5px] leading-relaxed text-ink-soft">
                <span className="font-semibold text-teal">✓ {w.term}</span>
                {w.where.length > 0 ? <> — shown in {w.where.slice(0, 2).map(place).join(' and ')}</> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Two different reasons, said separately (2026-09-23): a rewrite that
          failed the proof checks, and a part the writing service never
          answered for. The second used to be explained as the first. */}
      {kept.some((k) => k.reason !== 'no_output') ? (
        <p className="rounded-ctl border border-line bg-canvas px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
          <strong className="text-ink">Kept your own wording:</strong>{' '}
          {kept
            .filter((k) => k.reason !== 'no_output')
            .map((k) => (k.block === 'summary' ? 'summary' : roleNames[k.block] ?? 'one role'))
            .join(', ')}
          . A rewrite is only used when every claim in it can be proven from your profile.
        </p>
      ) : null}
      {kept.some((k) => k.reason === 'no_output') ? (
        <p className="rounded-ctl border border-gold/50 bg-gold-soft px-3 py-2 text-[12px] leading-relaxed text-gold-ink">
          <strong>Not rewritten this time:</strong>{' '}
          {kept
            .filter((k) => k.reason === 'no_output')
            .map((k) => (k.block === 'summary' ? 'summary' : roleNames[k.block] ?? 'one role'))
            .join(', ')}
          . The writing service was too slow for these parts, so they show your original wording. You can edit them, or
          optimize this job again.
        </p>
      ) : null}

      {report.gaps && report.gaps.length > 0 ? (
        <details className="group rounded-ctl border border-gold/40 bg-gold-soft/40 p-3">
          <summary className="cursor-pointer list-none text-[12.5px] font-semibold text-ink">
            Want a higher score? {report.gaps.length} {estimate ? 'common requirement' : 'job requirement'}
            {report.gaps.length === 1 ? '' : 's'} aren&apos;t in your profile yet{' '}
            <span className="text-teal group-open:hidden">Show</span>
          </summary>
          <div className="mt-2 flex flex-col gap-1.5">
            <KeywordChips items={report.gaps.slice(0, 12)} tone="gap" />
            <p className="text-[12px] leading-relaxed text-ink-soft">
              If you have genuinely done any of these, add them to your{' '}
              <Link href="/profile" className="font-semibold text-teal underline-offset-2 hover:underline">
                Career Profile
              </Link>{' '}
              and optimize again. Your score rises with each one.
            </p>
          </div>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11.5px] text-ink-muted">Measures match to these requirements — not a prediction of being hired.</p>
        <Link
          href={`/optimize/preview/${encodeURIComponent(packageId)}`}
          className="text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline"
        >
          {CTA.seeChanges} →
        </Link>
      </div>
    </section>
  )
}
