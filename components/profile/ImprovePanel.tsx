'use client'

import { useState } from 'react'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { cn } from '@/lib/utils'
import type { ReadinessResult } from '@/lib/readiness'
import type { DimensionKey, GulfReadinessResult } from '@/lib/gulfReadiness/types'

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
 * WHICH PART BELONGS TO WHICH (founder request, same day). Each tab's content
 * opens by naming the score it raises, and every item carries a chip with the
 * section of the profile it belongs to, in that section's own identity colour
 * — the colour the section wears in the form below — so an item and the place
 * it is fixed read as the same thing.
 *
 * The tab bar IS the summary: each tab carries its score, so switching tabs
 * never hides a number — only the detail behind it. Real tabs for assistive
 * tech (tablist / tab / tabpanel, roving tabindex, arrow keys).
 */

export type ImproveTab = 'strength' | 'gulf'

/** A section of the Career Profile form, as the panel names it. */
export interface SectionTag {
  id: string
  label: string
  /** The section's identity colour, as literal Tailwind classes (SECTION_ACCENT). */
  chip: string
}

export type MissingItem = ReadinessResult['missing'][number] & { section: SectionTag | null }

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

/** The part of the profile an item belongs to, in that section's colour. */
function SectionChip({ tag }: { tag: SectionTag | null }) {
  if (!tag) return null
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold leading-tight', tag.chip)}>
      {tag.label}
    </span>
  )
}

/** Opens each tab's content by naming the score it raises. */
function PanelLead({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h3 className="text-[14px] font-bold leading-snug text-ink">{title}</h3>
      <p className="text-[12.5px] leading-relaxed text-ink-soft">{children}</p>
    </div>
  )
}

const ROW = 'w-full rounded-ctl border border-line/70 bg-canvas/50 px-3.5 text-left transition-colors hover:border-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal'

export function ImprovePanel({
  strengthScore,
  missing,
  gulf,
  gulfSectionFor,
  initialTab = 'strength',
  onFix,
  onOpenSection,
}: {
  strengthScore: number
  missing: MissingItem[]
  /** Null for the moment before it is computed — shown as "—", never as 0. */
  gulf: GulfReadinessResult | null
  /** The profile section a Gulf dimension is about, if there is one. */
  gulfSectionFor: (dimension: DimensionKey) => SectionTag | null
  initialTab?: ImproveTab
  /** Open the section that owns this readiness field and focus it. */
  onFix: (field: string) => void
  /** Open a section of the form and bring it into view. */
  onOpenSection: (sectionId: string) => void
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
          <PanelLead title="What raises your Profile Strength">
            How complete your profile is — every CV is built from it. Each item shows the part of your profile it is in.
          </PanelLead>
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
                  className={cn(ROW, 'flex min-h-11 items-center justify-between gap-3 py-2.5')}
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[13px] font-semibold leading-snug text-ink">{m.label}</span>
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <SectionChip tag={m.section} />
                      <span className="text-[12px] text-ink-muted">
                        +{m.points} point{m.points === 1 ? '' : 's'}
                      </span>
                    </span>
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
          <PanelLead title="What raises your Gulf Readiness">
            How ready you are for the Gulf job market, read from what your profile says
            {gulf ? <> — <span className="font-semibold text-ink">{gulf.band.label}</span></> : null}. Each fix shows
            the part of your profile it is about.
          </PanelLead>
          {!gulf ? null : fullGulf ? (
            <ScorecardResult result={gulf} locked={false} source="profile" />
          ) : recs.length === 0 ? (
            <p className="rounded-ctl border border-dashed border-line bg-canvas/50 px-3.5 py-3 text-[13px] text-ink-soft">
              No ranked fixes right now. The full report shows what is already working in your favour.
            </p>
          ) : (
            recs.slice(0, GULF_PREVIEW).map((r, i) => {
              const tag = gulfSectionFor(r.dimension)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!tag}
                  onClick={() => tag && onOpenSection(tag.id)}
                  className={cn(ROW, 'flex flex-col gap-1 py-3 disabled:cursor-default disabled:hover:border-line/70')}
                >
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-mono text-[12px] text-ink-muted">#{i + 1}</span>
                    <span className="text-[13px] font-semibold leading-snug text-ink">{r.title}</span>
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-ink-soft">{r.why}</span>
                  <span className="mt-0.5 flex w-full flex-wrap items-center gap-x-2 gap-y-1">
                    <SectionChip tag={tag} />
                    <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
                      {r.impact} impact · {r.difficulty} effort
                    </span>
                    {tag ? <span className="ml-auto text-[12px] font-semibold text-teal">Open →</span> : null}
                  </span>
                </button>
              )
            })
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
