'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { MatchReport } from '@/lib/optimizer/types'
import { BandPill, KeywordChips, PartBars, ScoreRing } from './MatchScore'

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
            {estimate ? 'Role alignment · estimate' : 'Job match score'}
          </p>
          <h2 className="font-display text-[18px] leading-tight text-ink">
            {gain > 0 ? `Your CV now matches ${gain} points better` : 'Your CV, sharpened for this job'}
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

      {kept.length > 0 ? (
        <p className="rounded-ctl border border-line bg-canvas px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
          <strong className="text-ink">Kept your own wording:</strong>{' '}
          {kept.map((k) => (k.block === 'summary' ? 'summary' : roleNames[k.block] ?? 'one role')).join(', ')}. A rewrite
          is only used when every claim in it can be proven from your profile.
        </p>
      ) : null}

      {report.gaps && report.gaps.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12.5px] font-semibold text-ink">
            {estimate ? 'Often asked for, not in your profile' : 'Still missing for this job'} ({report.gaps.length})
          </p>
          <KeywordChips items={report.gaps.slice(0, 10)} tone="gap" />
          <p className="text-[12px] leading-relaxed text-ink-muted">
            Never added to your CV. If you have any of these, add them to your{' '}
            <Link href="/profile" className="font-semibold text-teal underline-offset-2 hover:underline">
              Career Profile
            </Link>{' '}
            and build again.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11.5px] text-ink-muted">Measures match to these requirements — not a prediction of being hired.</p>
        <Link
          href={`/optimize/preview/${encodeURIComponent(packageId)}`}
          className="text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline"
        >
          Review every change →
        </Link>
      </div>
    </section>
  )
}
