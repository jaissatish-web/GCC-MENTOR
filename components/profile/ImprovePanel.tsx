'use client'

import { useState } from 'react'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { cn } from '@/lib/utils'
import type { ReadinessResult } from '@/lib/readiness'
import type { DimensionKey, GulfReadinessResult, MustHave, Recommendation } from '@/lib/gulfReadiness/types'

/**
 * Gulf Readiness on the Career Profile — one answer, then the way there.
 *
 * Founder decision 2026-10-01 (Gulf Readiness v2): ONE verdict instead of two
 * competing numbers. The headline is "Ready to apply / Almost ready / Not ready
 * yet" with the Gulf Readiness score beside it; profile completeness (the old
 * "Profile Strength") is a secondary line that opens the list of empty fields.
 *
 * Under it, the guided path in three stages, in the order a person actually has
 * to do them: 1 paperwork (the must-haves that decide whether anyone can hire
 * you), 2 profile (each fix with the points it adds), 3 apply. Paperwork items
 * open to the real process, step by step.
 *
 * BOTH NUMBERS ARE LIVE: the parent computes them from the editor state.
 * Earlier history (two tabs, 2026-09-11) is in git; the props are unchanged so
 * the page did not have to change shape.
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

const PROFILE_PREVIEW = 4
const MISSING_PREVIEW = 4

const VERDICT_TONE: Record<GulfReadinessResult['verdict']['key'], { box: string; label: string; dot: string }> = {
  ready: { box: 'border-teal/40 bg-teal-soft/60', label: 'text-teal', dot: 'bg-teal' },
  almost: { box: 'border-gold-line bg-gold-bg', label: 'text-gold-text', dot: 'bg-gold-text' },
  not_ready: { box: 'border-alert/30 bg-alert-soft', label: 'text-alert', dot: 'bg-alert' },
}

const STATUS_CHIP: Record<MustHave['status'], { text: string; cls: string }> = {
  ok: { text: 'Done', cls: 'bg-teal-soft text-teal' },
  missing: { text: 'To do', cls: 'bg-alert-soft text-alert' },
  in_progress: { text: 'In progress', cls: 'bg-gold-bg text-gold-text' },
  unknown: { text: 'Not checked yet', cls: 'bg-canvas text-ink-muted' },
}

const LINK = '-mx-1 inline-flex min-h-11 items-center self-start px-1 text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal'
const ROW = 'w-full rounded-ctl border border-line/70 bg-canvas/50 px-3.5 text-left'

function SectionChip({ tag }: { tag: SectionTag | null }) {
  if (!tag) return null
  return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold leading-tight', tag.chip)}>{tag.label}</span>
}

function StageHeading({ n, title, done }: { n: number; title: string; done?: boolean }) {
  return (
    <h3 className="mt-1 flex items-center gap-2 text-[13px] font-bold text-ink">
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[12px]', done ? 'bg-teal text-white' : 'bg-canvas text-ink-muted')}>
        {done ? '✓' : n}
      </span>
      {title}
    </h3>
  )
}

export function ImprovePanel({
  strengthScore,
  missing,
  gulf,
  gulfSectionFor,
  initialTab = 'gulf',
  onFix,
  onOpenSection,
}: {
  strengthScore: number
  missing: MissingItem[]
  /** Null for the moment before it is computed — shown as "—", never as 0. */
  gulf: GulfReadinessResult | null
  /** The profile section a Gulf dimension is about, if there is one. */
  gulfSectionFor: (dimension: DimensionKey, field?: string) => SectionTag | null
  /** 'strength' opens the list of empty fields. */
  initialTab?: ImproveTab
  /** Open the section that owns this field and focus it. */
  onFix: (field: string) => void
  /** Open a section of the form and bring it into view. */
  onOpenSection: (sectionId: string) => void
}) {
  const [showMissing, setShowMissing] = useState(initialTab === 'strength')
  const [allMissing, setAllMissing] = useState(false)
  const [allProfile, setAllProfile] = useState(false)
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({})
  const [fullReport, setFullReport] = useState(false)

  const recs = gulf?.recommendations ?? []
  const profileRecs = recs.filter((r) => (r.stage ?? 'profile') === 'profile')
  const applyRecs = recs.filter((r) => r.stage === 'apply')
  const mustHaves = gulf?.mustHaves ?? []
  const paperworkDone = mustHaves.length > 0 && mustHaves.every((m) => m.status === 'ok')
  const tone = gulf ? VERDICT_TONE[gulf.verdict.key] : null

  const go = (r: Pick<Recommendation, 'field' | 'dimension'>) => {
    if (r.field) return onFix(r.field)
    const tag = gulfSectionFor(r.dimension, r.field)
    if (tag) onOpenSection(tag.id)
  }

  return (
    <section
      id="improve"
      aria-labelledby="improve-heading"
      className="mx-5 mt-4 flex scroll-mt-24 flex-col gap-3 rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5"
    >
      <h2 id="improve-heading" className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
        Your Gulf Readiness
      </h2>

      {/* THE ANSWER */}
      <div className={cn('flex flex-col gap-2 rounded-ctl border px-4 py-3.5', tone?.box ?? 'border-line bg-canvas/50')} role="status" aria-live="polite">
        <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
          <p className={cn('flex items-center gap-2 text-[17px] font-bold leading-tight', tone?.label ?? 'text-ink')}>
            {tone ? <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', tone.dot)} aria-hidden /> : null}
            {gulf ? gulf.verdict.label : 'Working it out…'}
          </p>
          <p className="font-mono text-[22px] leading-none text-ink">
            {gulf ? gulf.finalScore : '—'}
            <span className="text-[12px] text-ink-muted">/100</span>
          </p>
        </div>
        {gulf ? <p className="text-[13px] leading-relaxed text-ink-soft">{gulf.verdict.message}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-muted">
          {/* The band label ("Gulf-Ready") is left out here: next to the verdict it
              could contradict it (a strong CV with paperwork unchecked). */}
          {gulf ? <span>{gulf.scenarioLabel}</span> : null}
          <span aria-hidden>·</span>
          <button type="button" onClick={() => setShowMissing((v) => !v)} aria-expanded={showMissing} className="font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            Profile {strengthScore}% complete{missing.length ? ` — ${showMissing ? 'hide' : 'see'} what is missing` : ''}
          </button>
        </div>
      </div>

      {showMissing && missing.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {(allMissing ? missing : missing.slice(0, MISSING_PREVIEW)).map((m) => (
            <button key={m.field} type="button" onClick={() => onFix(m.field)} className={cn(ROW, 'flex min-h-11 items-center justify-between gap-3 py-2.5 transition-colors hover:border-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal')}>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[13px] font-semibold leading-snug text-ink">{m.label}</span>
                <SectionChip tag={m.section} />
              </span>
              <span className="shrink-0 text-[12px] font-semibold text-teal">Fill in →</span>
            </button>
          ))}
          {missing.length > MISSING_PREVIEW ? (
            <button type="button" className={LINK} onClick={() => setAllMissing((v) => !v)} aria-expanded={allMissing}>
              {allMissing ? 'Show fewer' : `Show all ${missing.length}`}
            </button>
          ) : null}
        </div>
      ) : null}

      {gulf && !fullReport ? (
        <>
          {/* 1 · PAPERWORK */}
          <StageHeading n={1} title="Paperwork — what an employer needs before hiring you" done={paperworkDone} />
          <div className="flex flex-col gap-1.5">
            {mustHaves.map((m) => {
              const chip = STATUS_CHIP[m.status]
              const open = !!openSteps[m.key]
              return (
                <div key={m.key} className={cn(ROW, 'flex flex-col gap-1.5 py-3')}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-ink">{m.label}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[12px] font-semibold', chip.cls)}>{chip.text}</span>
                  </div>
                  {m.status !== 'ok' ? <p className="text-[12.5px] leading-relaxed text-ink-soft">{m.why}</p> : null}
                  {m.status !== 'ok' ? (
                    <div className="flex flex-wrap items-center gap-x-4">
                      <button type="button" className={LINK} aria-expanded={open} onClick={() => setOpenSteps((s) => ({ ...s, [m.key]: !open }))}>
                        {open ? 'Hide the steps' : 'How to do it'}
                      </button>
                      <button type="button" className={LINK} onClick={() => onFix(m.field)}>
                        {m.status === 'unknown' ? 'Answer in your profile →' : 'Update your status →'}
                      </button>
                    </div>
                  ) : null}
                  {open ? (
                    <ol className="ml-5 list-decimal space-y-1 text-[12.5px] leading-relaxed text-ink-soft">
                      {m.steps.map((s, i) => <li key={i}>{s}</li>)}
                    </ol>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* 2 · PROFILE */}
          <StageHeading n={2} title="Profile — what raises your score" done={profileRecs.length === 0} />
          <div className="flex flex-col gap-1.5">
            {profileRecs.length === 0 ? (
              <p className="rounded-ctl border border-dashed border-line bg-canvas/50 px-3.5 py-3 text-[13px] text-ink-soft">Nothing left to fix here.</p>
            ) : (
              (allProfile ? profileRecs : profileRecs.slice(0, PROFILE_PREVIEW)).map((r, i) => {
                const tag = gulfSectionFor(r.dimension, r.field)
                return (
                  <button key={i} type="button" onClick={() => go(r)} className={cn(ROW, 'flex flex-col gap-1 py-3 transition-colors hover:border-teal/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal')}>
                    <span className="flex w-full flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                      <span className="text-[13px] font-semibold leading-snug text-ink">{r.title}</span>
                      {r.gain ? <span className="font-mono text-[12px] font-semibold text-teal">+{r.gain} pts</span> : null}
                    </span>
                    <span className="text-[12.5px] leading-relaxed text-ink-soft">{r.why}</span>
                    <span className="mt-0.5 flex w-full flex-wrap items-center gap-x-2 gap-y-1">
                      <SectionChip tag={tag} />
                      <span className="ml-auto text-[12px] font-semibold text-teal">Open →</span>
                    </span>
                  </button>
                )
              })
            )}
            {profileRecs.length > PROFILE_PREVIEW ? (
              <button type="button" className={LINK} onClick={() => setAllProfile((v) => !v)} aria-expanded={allProfile}>
                {allProfile ? 'Show fewer' : `Show all ${profileRecs.length}`}
              </button>
            ) : null}
          </div>

          {/* 3 · APPLY */}
          <StageHeading n={3} title="Apply — one tailored CV per job" />
          {applyRecs.slice(0, 1).map((r, i) => (
            <p key={i} className="rounded-ctl border border-line/70 bg-canvas/50 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">{r.why}</p>
          ))}
        </>
      ) : null}

      {gulf && fullReport ? <ScorecardResult result={gulf} locked={false} source="profile" /> : null}
      {gulf ? (
        <button type="button" className={LINK} onClick={() => setFullReport((v) => !v)} aria-expanded={fullReport}>
          {fullReport ? 'Back to the steps' : 'Show the full score breakdown'}
        </button>
      ) : null}
    </section>
  )
}
