'use client'

import { useState } from 'react'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { cn } from '@/lib/utils'
import type { ReadinessResult } from '@/lib/readiness'
import type { GulfReadinessResult } from '@/lib/gulfReadiness/types'

/**
 * "Improve your profile" — both scores, and what raises each, on the Career
 * Profile itself.
 *
 * Founder decision 2026-09-11: Career Profile and Profile Strength are one
 * page. Of the options put to him he chose this COMPACT panel over the full
 * Gulf report on the profile page — the page is already an import panel plus
 * nine sections, and the full report above them would push the form a screen
 * down on a phone. The full report is still one tap away, inline.
 *
 * BOTH NUMBERS ARE LIVE. The parent computes them from the editor state, so
 * they move as the user types — which the separate page never could, because
 * it read only the saved profile.
 *
 * The tab bar IS the summary: each tab carries its score, so switching tabs
 * never hides a number — only the detail behind it. Real tabs for assistive
 * tech (tablist / tab / tabpanel, roving tabindex, arrow keys).
 */

export type ImproveTab = 'strength' | 'gulf'

const TAB_ORDER: readonly ImproveTab[] = ['strength', 'gulf']
/** How many missing fields show before "Show all". */
const STRENGTH_PREVIEW = 4
/** How many ranked Gulf fixes show before "Show the full report". */
const GULF_PREVIEW = 3

function ToggleLink({
  expanded,
  onClick,
  children,
}: {
  expanded: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      // 44px tall — the same thumb-sized rule as every other text link.
      className="-mx-1 inline-flex min-h-11 items-center self-start px-1 text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
    >
      {children}
    </button>
  )
}

export function ImprovePanel({
  strengthScore,
  missing,
  gulf,
  initialTab = 'strength',
  onFix,
}: {
  strengthScore: number
  missing: ReadinessResult['missing']
  /** Null for the moment before it is computed — shown as "—", never as 0. */
  gulf: GulfReadinessResult | null
  initialTab?: ImproveTab
  /** Open the section that owns this readiness field and focus it. */
  onFix: (field: string) => void
}) {
  const [tab, setTab] = useState<ImproveTab>(initialTab)
  const [allMissing, setAllMissing] = useState(false)
  const [fullGulf, setFullGulf] = useState(false)

  // A score not yet computed is "—". It rendered as "0/100" for the first
  // moment after load — a real-looking, false number (found 2026-09-11).
  const tabs: ReadonlyArray<{ key: ImproveTab; label: string; score: number | null }> = [
    { key: 'strength', label: 'Profile Strength', score: strengthScore },
    { key: 'gulf', label: 'Gulf Readiness', score: gulf ? gulf.finalScore : null },
  ]

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = TAB_ORDER[(TAB_ORDER.indexOf(tab) + 1) % TAB_ORDER.length]
    setTab(next)
    document.getElementById(`improve-tab-${next}`)?.focus()
  }

  const shownMissing = allMissing ? missing : missing.slice(0, STRENGTH_PREVIEW)
  const recs = gulf?.recommendations ?? []

  return (
    <section
      id="improve"
      aria-labelledby="improve-heading"
      className="mx-5 mt-4 flex scroll-mt-24 flex-col gap-3 rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5"
    >
      <h2 id="improve-heading" className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        Improve your profile
      </h2>

      <div role="tablist" aria-label="Your two scores" className="grid grid-cols-2 gap-1.5 rounded-ctl bg-canvas p-1.5">
        {tabs.map((t) => {
          const selected = tab === t.key
          return (
            <button
              key={t.key}
              id={`improve-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`improve-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.key)}
              onKeyDown={onKeyDown}
              className={cn(
                'flex min-h-[60px] flex-col items-start justify-center gap-1 rounded-ctl px-3 py-2 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
                selected ? 'bg-teal shadow-m-1' : 'hover:bg-white',
              )}
            >
              <span className={cn('text-[13px] font-semibold leading-tight', selected ? 'text-teal-soft' : 'text-ink-muted')}>
                {t.label}
              </span>
              <span className={cn('font-mono text-[20px] leading-none', selected ? 'text-white' : 'text-ink')}>
                {t.score === null ? (
                  '—'
                ) : (
                  <>
                    {t.score}
                    <span className={cn('text-[12px]', selected ? 'text-teal-soft' : 'text-ink-muted')}>/100</span>
                  </>
                )}
              </span>
            </button>
          )
        })}
      </div>

      {tab === 'strength' ? (
        <div id="improve-panel-strength" role="tabpanel" aria-labelledby="improve-tab-strength" className="flex flex-col gap-2">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">How complete your profile is.</span> Every CV is built from it —
            tap an item to fill it in.
          </p>
          {missing.length === 0 ? (
            <p className="rounded-ctl border border-dashed border-line bg-canvas/50 px-3.5 py-3 text-[13px] text-ink-soft">
              Every scored section is complete.
            </p>
          ) : (
            <>
              {shownMissing.map((m) => (
                <button
                  key={m.field}
                  type="button"
                  onClick={() => onFix(m.field)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-ctl border border-line/70 bg-canvas/50 px-3.5 py-2.5 text-left transition-colors hover:border-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-semibold text-ink">{m.label}</span>
                    <span className="text-[12px] text-ink-muted">+{m.points} points</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-semibold text-teal">Fill in →</span>
                </button>
              ))}
              {missing.length > STRENGTH_PREVIEW ? (
                <ToggleLink expanded={allMissing} onClick={() => setAllMissing((v) => !v)}>
                  {allMissing ? 'Show fewer' : `Show all ${missing.length}`}
                </ToggleLink>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div id="improve-panel-gulf" role="tabpanel" aria-labelledby="improve-tab-gulf" className="flex flex-col gap-2">
          <p className="text-[12.5px] leading-relaxed text-ink-soft">
            <span className="font-semibold text-ink">How ready you are for the Gulf job market</span>, read from what
            your profile says{gulf ? <> — <span className="font-semibold text-ink">{gulf.band.label}</span></> : null}.
          </p>
          {!gulf ? null : fullGulf ? (
            <ScorecardResult result={gulf} locked={false} source="profile" />
          ) : recs.length === 0 ? (
            <p className="rounded-ctl border border-dashed border-line bg-canvas/50 px-3.5 py-3 text-[13px] text-ink-soft">
              No ranked fixes right now. The full report shows what is already working in your favour.
            </p>
          ) : (
            recs.slice(0, GULF_PREVIEW).map((r, i) => (
              <div key={i} className="rounded-ctl border border-line/70 bg-canvas/50 px-3.5 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="font-mono text-[12px] text-ink-muted">#{i + 1}</span>
                  <span className="text-[13px] font-semibold text-ink">{r.title}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{r.why}</p>
                <span className="mt-1.5 inline-block text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                  {r.impact} impact · {r.difficulty} effort
                </span>
              </div>
            ))
          )}
          {gulf ? (
            <ToggleLink expanded={fullGulf} onClick={() => setFullGulf((v) => !v)}>
              {fullGulf ? 'Show less' : 'Show the full report'}
            </ToggleLink>
          ) : null}
        </div>
      )}
    </section>
  )
}
