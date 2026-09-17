'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AnalysisView } from '@/lib/optimizer/view'
import { BandPill, groupKeywords, KeywordChips, PartBars, ScoreRing } from './MatchScore'

/**
 * The match report on /optimize/setup (2026-09-17) — shown BEFORE anything is
 * generated, so the user sees where they stand, what the build can honestly
 * reach with their real experience, and what it will never add.
 */

const SHOW = 8

function More({ items, tone }: { items: Array<{ term: string }>; tone: 'matched' | 'supported' | 'gap' }) {
  const [open, setOpen] = useState(false)
  const shown = open ? items : items.slice(0, SHOW)
  return (
    <div className="flex flex-col gap-1.5">
      <KeywordChips items={shown} tone={tone} />
      {items.length > SHOW ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="self-start px-0.5 text-[12px] font-semibold text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          {open ? 'Show fewer' : `+${items.length - SHOW} more`}
        </button>
      ) : null}
    </div>
  )
}

export function MatchPanelLoading({ title, hasJobDescription }: { title: string; hasJobDescription: boolean }) {
  return (
    <section aria-live="polite" className="mt-5 rounded-card border border-line bg-white p-5">
      <div className="flex items-center gap-4">
        <div className="size-[88px] shrink-0 animate-pulse rounded-full border-[10px] border-line" />
        <div className="flex flex-col gap-1.5">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Checking your match</p>
          <p className="text-[14px] font-semibold text-ink">{title}</p>
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            {hasJobDescription
              ? 'Reading the job advert and finding where your profile already proves each requirement…'
              : 'Working out what this role usually asks for and where your profile proves it…'}
          </p>
        </div>
      </div>
    </section>
  )
}

export function MatchPanel({
  analysis,
  projectedMax,
  onRecheck,
  rechecking,
}: {
  analysis: AnalysisView
  /** Honest maximum for the CURRENT selection of blocks. */
  projectedMax: number
  onRecheck: () => void
  rechecking: boolean
}) {
  const { matched, improvable, gaps } = groupKeywords(analysis.keywords)
  const estimate = analysis.mode === 'target_title_only'
  const gain = Math.max(0, projectedMax - analysis.before.total)

  return (
    <section className="mt-5 flex flex-col gap-4 rounded-card border border-line bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {estimate ? 'Role alignment · estimate' : 'Job match score'}
        </p>
        <span
          className={cn(
            'rounded-full border px-2 py-0.5 text-[11.5px] font-semibold',
            estimate ? 'border-gold/50 bg-gold-soft text-gold-ink' : 'border-teal/40 bg-teal-soft text-teal',
          )}
        >
          {estimate ? 'Against the role in general' : 'Against this job advert'}
        </span>
      </div>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <ScoreRing value={analysis.before.total} label="Now" />
          <div className="flex flex-col items-start gap-1.5">
            <BandPill value={analysis.before.total} />
            {gain > 0 ? (
              <p className="text-[13px] leading-snug text-ink">
                Can reach <strong className="font-display text-[20px] text-teal">{projectedMax}</strong>
                <br />
                <span className="text-[12px] text-ink-soft">using only your real experience</span>
              </p>
            ) : (
              <p className="text-[12.5px] leading-snug text-ink-soft">
                Your CV already says what your profile can prove for this job. The build sharpens the wording.
              </p>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <PartBars score={analysis.before} />
        </div>
      </div>

      {matched.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12.5px] font-semibold text-ink">Already on your CV ({matched.length})</p>
          <More items={matched} tone="matched" />
        </div>
      ) : null}

      {improvable.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12.5px] font-semibold text-ink">
            In your profile, not yet said where it counts ({improvable.length})
          </p>
          <p className="text-[12px] leading-relaxed text-ink-muted">
            The build puts these in the employer&apos;s words, in the role that proves them.
          </p>
          <More items={improvable} tone="supported" />
        </div>
      ) : null}

      {gaps.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-ctl border border-line bg-canvas p-3">
          <p className="text-[12.5px] font-semibold text-ink">
            {estimate ? 'Often asked for, not in your profile' : 'The job asks for, not in your profile'} ({gaps.length})
          </p>
          <p className="text-[12px] leading-relaxed text-ink-muted">
            We never add these to your CV. If you genuinely have any of them, add them to your Career Profile and re-check.
          </p>
          <More items={gaps} tone="gap" />
          <div className="mt-1 flex flex-wrap gap-2">
            <Link
              href="/profile"
              target="_blank"
              className="min-h-9 rounded-ctl border border-line-strong bg-white px-3 py-2 text-[12px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Open Career Profile ↗
            </Link>
            <button
              type="button"
              onClick={onRecheck}
              disabled={rechecking}
              className="min-h-9 rounded-ctl border border-teal/50 bg-teal-soft px-3 py-2 text-[12px] font-semibold text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60"
            >
              {rechecking ? 'Re-checking…' : 'Re-check match'}
            </button>
          </div>
        </div>
      ) : null}

      <p className="text-[11.5px] leading-relaxed text-ink-muted">
        {estimate
          ? 'Estimated from what adverts for this title usually ask for. Paste the job advert for an exact match. '
          : ''}
        Measures how closely your CV matches these requirements — not a prediction of being hired.
      </p>
    </section>
  )
}
