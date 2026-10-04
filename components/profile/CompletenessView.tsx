'use client'

import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { ScoreRing } from '@/components/profile/ScoreRing'
import { QuietNote, StatusChip, type SectionStatus, type SectionSummary } from '@/components/profile/ProfileOverview'
import type { ReadinessResult } from '@/lib/readiness'

/**
 * PROFILE COMPLETENESS — the screen behind the overview's "Profile complete"
 * card (founder brief 2026-10-04).
 *
 * One question answered in three blocks: how complete is it (the ring and a
 * bar of the nine parts), which part to do next, and exactly what is still
 * missing. Every row opens the field or section it is about, in the full
 * profile. The number is lib/readiness.ts for this user's category — the same
 * one the header ring and the dashboard show.
 */

/** A section of the Career Profile form, as these screens name it. */
export interface SectionTag {
  id: string
  label: string
  /** The section's identity colour, as literal Tailwind classes (SECTION_ACCENT). */
  chip: string
}

export type MissingItem = ReadinessResult['missing'][number] & { section: SectionTag | null }

export interface SectionBlock extends SectionSummary {
  step: number
  earned: number
  total: number
  accent: { text: string; chip: string; rule: string } | undefined
}

/** Bar segment colour per status — the status tokens, so the bar reads like the chips. */
const SEGMENT: Record<SectionStatus, string> = {
  complete: 'bg-ok',
  attention: 'bg-gold',
  missing: 'bg-alert/70',
  optional: 'bg-line-strong',
}

export function SectionChip({ tag }: { tag: SectionTag | null }) {
  if (!tag) return null
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold leading-tight', tag.chip)}>{tag.label}</span>
}

export function CompletenessView({
  score,
  categoryCopy,
  sections,
  missing,
  onOpenSection,
  onFix,
}: {
  score: number
  /** "Profiles like yours — <highlight> — <rest>" for this user's category. */
  categoryCopy: { highlight: string; rest: string }
  sections: readonly SectionBlock[]
  missing: readonly MissingItem[]
  onOpenSection: (sectionId: string) => void
  onFix: (field: string) => void
}) {
  const counted = sections.filter((s) => s.status !== 'optional')
  const done = counted.filter((s) => s.status === 'complete').length
  const next = sections.find((s) => s.status === 'missing') ?? sections.find((s) => s.status === 'attention') ?? null

  return (
    <div className="flex flex-col gap-5 px-5 py-4">
      {/* 1 · HOW COMPLETE */}
      <section
        aria-labelledby="completeness-h"
        className="flex flex-col gap-4 rounded-card-lg border border-teal/20 bg-gradient-to-br from-teal-soft via-white to-white p-4 shadow-m-1 sm:flex-row sm:items-center sm:gap-6 sm:p-6"
      >
        <ScoreRing value={score} size={132} label="Profile complete" className="self-center" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 id="completeness-h" className="font-display text-[21px] font-semibold leading-snug text-ink">
            {score >= 100 ? 'Your profile is complete' : `Your profile is ${score}% complete`}
          </h2>
          <p className="text-[13.5px] leading-relaxed text-ink-soft">
            {missing.length === 0
              ? 'Nothing is missing. Keep it up to date as your career moves.'
              : `${missing.length} item${missing.length === 1 ? '' : 's'} left. Each one makes every CV built from this profile stronger.`}{' '}
            Profiles like yours — <span className="font-semibold text-teal">{categoryCopy.highlight}</span> — {categoryCopy.rest}
          </p>
          {/* The nine parts as one bar: a graph of where the profile stands. */}
          <div className="mt-1 flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-2 text-[12px]">
              <span className="font-semibold text-ink">
                {done} of {counted.length} key sections done
              </span>
              <span className="text-ink-muted">Optional parts in grey</span>
            </div>
            <div className="flex gap-1" aria-hidden="true">
              {sections.map((s) => (
                <span key={s.id} title={`${s.label}: ${s.status}`} className={cn('h-2.5 flex-1 rounded-full', SEGMENT[s.status])} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {next ? (
        <button
          type="button"
          onClick={() => onOpenSection(next.id)}
          className="flex w-full items-center gap-3 rounded-card bg-teal px-4 py-3.5 text-left text-white shadow-m-2 transition-colors hover:bg-teal-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-teal-soft">Do this next · {next.label}</span>
            <span className="text-[14.5px] font-semibold leading-snug">{next.hint}</span>
          </span>
          <ArrowRightIcon className="size-5 shrink-0" aria-hidden="true" />
        </button>
      ) : null}

      {/* 2 · PART BY PART */}
      <section aria-labelledby="parts-h" className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 id="parts-h" className="text-[15px] font-bold text-ink">
            Your profile, part by part
          </h2>
          <p className="text-[12.5px] text-ink-muted">Tap a part to open it.</p>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((s) => {
            const left = s.total - s.earned
            return (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onOpenSection(s.id)}
                  className={cn(
                    'group flex h-full w-full flex-col gap-2 rounded-card border border-l-4 border-line bg-white p-3.5 text-left shadow-m-1 transition-all hover:-translate-y-0.5 hover:shadow-m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal motion-reduce:transform-none',
                    s.accent?.rule ?? 'border-l-line',
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span
                      aria-hidden="true"
                      className={cn('flex size-7 items-center justify-center rounded-full text-[12px] font-bold tabular-nums', s.accent?.chip ?? 'bg-canvas text-ink-muted')}
                    >
                      {s.status === 'complete' ? '✓' : s.step}
                    </span>
                    <StatusChip status={s.status} />
                  </span>
                  <span className={cn('text-[15px] font-bold leading-snug', s.accent?.text ?? 'text-ink')}>{s.label}</span>
                  <span className="text-[12.5px] leading-snug text-ink-soft">{s.hint}</span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-1">
                    <span className={cn('text-[12px] font-semibold', s.total === 0 ? 'text-ink-muted' : left > 0 ? 'text-gold-ink' : 'text-ok')}>
                      {s.total === 0 ? 'Not scored' : left > 0 ? `+${left} pts available` : 'All points earned'}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[12.5px] font-bold text-teal">
                      Open
                      <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      {/* 3 · STILL MISSING */}
      <section aria-labelledby="missing-h" className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h2 id="missing-h" className="text-[15px] font-bold text-ink">
            Still missing
          </h2>
          <p className="text-[12.5px] text-ink-muted">Each one opens the exact box to fill in.</p>
        </div>
        {missing.length === 0 ? (
          <QuietNote>Nothing is missing from your score. Optional parts can still make your CV richer.</QuietNote>
        ) : (
          <ul className="flex flex-col gap-2">
            {missing.map((m) => (
              <li key={m.field}>
                <button
                  type="button"
                  onClick={() => onFix(m.field)}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-ctl border border-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-teal/50 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[13.5px] font-semibold leading-snug text-ink">{m.label}</span>
                    <SectionChip tag={m.section} />
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    {m.points > 0 ? <span className="font-mono text-[12px] font-semibold text-gold-ink">+{m.points} pts</span> : null}
                    <span className="text-[12.5px] font-bold text-teal">Fill in →</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
