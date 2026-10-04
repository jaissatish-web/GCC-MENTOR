'use client'

import { useState } from 'react'
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { ScoreRing } from '@/components/profile/ScoreRing'
import { QuietNote, VERDICT_TONE } from '@/components/profile/ProfileOverview'
import { SectionChip, type SectionTag } from '@/components/profile/CompletenessView'
import type { DimensionKey, GulfReadinessResult, MustHave, Recommendation } from '@/lib/gulfReadiness/types'

/**
 * GULF READINESS — the screen behind the overview's Gulf Readiness card
 * (founder brief 2026-10-04: "a separate window in which he can optimize what
 * is required, in a very good, block format").
 *
 * It replaces the Improve panel that sat in the middle of the profile page. The
 * content is the same result object (lib/gulfReadiness, computed live from the
 * editor), laid out as blocks in the order a person actually works through it:
 *
 *   the answer      verdict, score ring, a three-stage strip
 *   by area         the six dimensions as bars — where the points are
 *   1 · paperwork   the must-haves that decide whether anyone can hire you
 *   2 · profile     each fix, with the points it adds
 *   3 · apply       one tailored CV per job
 *   strengths / what holds it back
 *
 * Every "fix" opens the exact field or section in the full profile.
 */

const PROFILE_PREVIEW = 4

const MUST_HAVE_META: Record<MustHave['status'], { text: string; chip: string; rule: string }> = {
  ok: { text: 'Done', chip: 'bg-ok-soft text-ok', rule: 'border-l-ok' },
  missing: { text: 'To do', chip: 'bg-alert-soft text-alert', rule: 'border-l-alert' },
  in_progress: { text: 'In progress', chip: 'bg-gold-soft text-gold-ink', rule: 'border-l-gold' },
  unknown: { text: 'Not checked yet', chip: 'bg-canvas text-ink-muted', rule: 'border-l-line-strong' },
}

const LEVEL: Record<Recommendation['impact'], string> = { high: 'High', medium: 'Medium', low: 'Low' }

function barTone(pct: number): string {
  return pct >= 70 ? 'bg-ok' : pct >= 40 ? 'bg-gold' : 'bg-alert'
}

function StageTitle({
  n,
  icon: Icon,
  title,
  sub,
  done,
}: {
  n: number
  icon: React.ComponentType<{ className?: string }>
  title: string
  sub: string
  done: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
          done ? 'bg-ok text-white' : 'bg-teal text-white',
        )}
        aria-hidden="true"
      >
        {done ? '✓' : n}
      </span>
      <div className="flex min-w-0 flex-col">
        <h2 className="flex items-center gap-1.5 text-[16px] font-bold text-ink">
          <Icon className="size-4 text-teal" aria-hidden="true" />
          {title}
        </h2>
        <p className="text-[12.5px] leading-snug text-ink-muted">{sub}</p>
      </div>
    </div>
  )
}

export function GulfReadinessView({
  gulf,
  gulfSectionFor,
  onFix,
  onOpenSection,
  onApply,
  applyBusy,
}: {
  /** Null for the moment before it is computed. */
  gulf: GulfReadinessResult | null
  /** The profile section a Gulf dimension is about, if there is one. */
  gulfSectionFor: (dimension: DimensionKey, field?: string) => SectionTag | null
  /** Open the field in the full profile and focus it. */
  onFix: (field: string) => void
  /** Open a section of the full profile. */
  onOpenSection: (sectionId: string) => void
  /** Save, then go and build a CV for a job. */
  onApply: () => void
  applyBusy?: boolean
}) {
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({})
  const [allProfile, setAllProfile] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  if (!gulf) {
    return (
      <div className="px-5 py-6">
        <QuietNote>Working out your Gulf Readiness…</QuietNote>
      </div>
    )
  }

  const tone = VERDICT_TONE[gulf.verdict.key]
  const recs = gulf.recommendations
  const profileRecs = recs.filter((r) => (r.stage ?? 'profile') === 'profile')
  const applyRecs = recs.filter((r) => r.stage === 'apply')
  const mustHaves = gulf.mustHaves
  const paperworkLeft = mustHaves.filter((m) => m.status !== 'ok').length
  const paperworkDone = mustHaves.length > 0 && paperworkLeft === 0
  const doneMustHaves = mustHaves.filter((m) => m.status === 'ok')
  const openMustHaves = mustHaves.filter((m) => m.status !== 'ok')
  const gainOnOffer = profileRecs.reduce((n, r) => n + (r.gain ?? 0), 0)

  const go = (r: Pick<Recommendation, 'field' | 'dimension'>) => {
    if (r.field) return onFix(r.field)
    const tag = gulfSectionFor(r.dimension, r.field)
    if (tag) onOpenSection(tag.id)
  }

  const stages = [
    { label: 'Paperwork', state: mustHaves.length === 0 ? 'Nothing to check' : paperworkDone ? 'Done' : `${paperworkLeft} to do`, done: paperworkDone || mustHaves.length === 0 },
    { label: 'Profile', state: profileRecs.length === 0 ? 'Done' : `${profileRecs.length} fix${profileRecs.length === 1 ? '' : 'es'}`, done: profileRecs.length === 0 },
    { label: 'Apply', state: 'One CV per job', done: false },
  ]

  return (
    <div className="flex flex-col gap-6 px-5 py-4">
      {/* THE ANSWER */}
      <section
        aria-labelledby="verdict-h"
        className={cn('flex flex-col gap-4 rounded-card-lg border border-line bg-gradient-to-br via-white to-white p-4 shadow-m-1 sm:p-6', tone.card)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <ScoreRing value={gulf.finalScore} size={132} tone={tone.ring} suffix="/100" label="Gulf Readiness" className="self-center" />
          <div className="flex min-w-0 flex-1 flex-col gap-2" role="status" aria-live="polite">
            <span className="self-start rounded-full bg-white px-2.5 py-0.5 text-[12px] font-bold uppercase tracking-wide text-ink-soft shadow-m-1">
              {gulf.scenarioLabel}
            </span>
            <h2 id="verdict-h" className={cn('font-display text-[23px] font-semibold leading-tight', tone.text)}>
              {gulf.verdict.label}
            </h2>
            <p className="text-[13.5px] leading-relaxed text-ink-soft">{gulf.verdict.message}</p>
            <p className="text-[12px] leading-snug text-ink-muted">
              How ready you are for GCC jobs — different from how complete your profile is.
            </p>
          </div>
        </div>
        {/* Where the user is on the path: three joined stages. */}
        <ol className="grid grid-cols-3 gap-1.5" aria-label="Your path">
          {stages.map((s, i) => (
            <li
              key={s.label}
              className={cn('flex flex-col gap-0.5 rounded-ctl px-2.5 py-2', s.done ? 'bg-ok-soft' : 'bg-white shadow-m-1')}
            >
              <span className={cn('text-[12px] font-bold uppercase tracking-wide', s.done ? 'text-ok' : 'text-teal')}>
                {i + 1} · {s.label}
              </span>
              <span className="text-[12.5px] font-semibold leading-snug text-ink">{s.state}</span>
            </li>
          ))}
        </ol>
        {gulf.lowResumeSignal ? (
          <p className="rounded-ctl border border-line bg-white/70 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-muted">
            Your Career Profile is still thin, so parts of this score are a rough estimate. It gets more accurate as you add your work history, skills and education.
          </p>
        ) : null}
      </section>

      {/* 1 · PAPERWORK */}
      <section className="flex flex-col gap-3">
        <StageTitle
          n={1}
          icon={ClipboardDocumentCheckIcon}
          title="Paperwork"
          sub="What an employer needs before they can hire you. It decides the verdict above."
          done={paperworkDone}
        />
        {mustHaves.length === 0 ? (
          <QuietNote>No paperwork applies to you here.</QuietNote>
        ) : null}
        {/* Finished items fold into one line (D4): a full card each for
            "Sorted — nothing to do here" pushed the open items down. */}
        {doneMustHaves.length > 0 ? (
          <p className="flex items-start gap-2 rounded-ctl border border-ok/25 bg-ok-soft/60 px-3.5 py-2.5 text-[13px] leading-snug text-ink-soft">
            <CheckCircleIcon className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />
            <span>
              <span className="font-bold text-ok">Done:</span> {doneMustHaves.map((m) => m.label).join(' · ')}
            </span>
          </p>
        ) : null}
        {openMustHaves.length > 0 ? (
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {openMustHaves.map((m) => {
              const meta = MUST_HAVE_META[m.status]
              const open = !!openSteps[m.key]
              return (
                <li key={m.key} className={cn('flex flex-col gap-2 rounded-card border border-l-4 border-line bg-white p-3.5 shadow-m-1', meta.rule)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-bold text-ink">{m.label}</span>
                    <span className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-bold', meta.chip)}>{meta.text}</span>
                  </div>
                  <p className="text-[12.5px] leading-relaxed text-ink-soft">{m.why}</p>
                  {open ? (
                    <ol className="ml-5 list-decimal space-y-1 text-[12.5px] leading-relaxed text-ink-soft">
                      {m.steps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ol>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center gap-x-4">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenSteps((s) => ({ ...s, [m.key]: !open }))}
                      className="-mx-1 inline-flex min-h-11 items-center px-1 text-[12.5px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                    >
                      {open ? 'Hide the steps' : 'How to do it'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onFix(m.field)}
                      className="-mx-1 inline-flex min-h-11 items-center px-1 text-[12.5px] font-bold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                    >
                      {m.status === 'unknown' ? 'Answer in your profile →' : 'Update your status →'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : null}
      </section>

      {/* 2 · PROFILE */}
      <section className="flex flex-col gap-3">
        <StageTitle
          n={2}
          icon={UserCircleIcon}
          title="Profile"
          sub="What raises your score, most useful first. Each one opens the place to fix it."
          done={profileRecs.length === 0}
        />
        {profileRecs.length === 0 ? (
          <QuietNote>Nothing left to fix in your profile.</QuietNote>
        ) : (
          <>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {(allProfile ? profileRecs : profileRecs.slice(0, PROFILE_PREVIEW)).map((r, i) => {
                const tag = gulfSectionFor(r.dimension, r.field)
                return (
                  <li key={`${r.dimension}-${i}`}>
                    <button
                      type="button"
                      onClick={() => go(r)}
                      className="group flex h-full w-full flex-col gap-2 rounded-card border border-line bg-white p-3.5 text-left shadow-m-1 transition-all hover:-translate-y-0.5 hover:border-teal/40 hover:shadow-m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal motion-reduce:transform-none"
                    >
                      <span className="flex w-full items-start justify-between gap-2">
                        <span className="text-[14px] font-bold leading-snug text-ink">{r.title}</span>
                        {r.gain ? (
                          <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 font-mono text-[12px] font-bold text-gold-ink">+{r.gain} pts</span>
                        ) : null}
                      </span>
                      <span className="text-[12.5px] leading-relaxed text-ink-soft">{r.why}</span>
                      <span className="mt-auto flex w-full flex-wrap items-center gap-1.5 pt-1">
                        <span className="rounded-full bg-canvas px-2 py-0.5 text-[12px] font-semibold text-ink-soft">
                          {LEVEL[r.impact]} impact · {LEVEL[r.difficulty]} effort
                        </span>
                        <SectionChip tag={tag} />
                        <span className="ml-auto inline-flex items-center gap-1 text-[12.5px] font-bold text-teal">
                          Fix it
                          <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {profileRecs.length > PROFILE_PREVIEW ? (
              <button
                type="button"
                aria-expanded={allProfile}
                onClick={() => setAllProfile((v) => !v)}
                className="-mx-1 inline-flex min-h-11 items-center self-start px-1 text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {allProfile ? 'Show fewer' : `Show all ${profileRecs.length}`}
              </button>
            ) : null}
          </>
        )}
      </section>

      {/* 3 · APPLY */}
      <section className="flex flex-col gap-3">
        <StageTitle n={3} icon={PaperAirplaneIcon} title="Apply" sub="One tailored CV per job — built only from your profile." done={false} />
        <div className="flex flex-col gap-3 rounded-card border border-teal/25 bg-teal-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            {applyRecs[0]?.why ?? 'Tell us the role and we tailor your CV to it — using only what is in this profile.'}
          </p>
          <Button variant="progress" size="sm" className="shrink-0" busy={applyBusy} busyLabel="Saving…" onClick={onApply}>
            Build a CV for a job
          </Button>
        </div>
      </section>

      {/* THE DETAIL — score by area and strengths (founder 2026-10-04, D4).
          The screen was about five phone screens; the verdict and the steps
          come first, and on a phone this part opens on a tap. On larger
          screens it is always shown. */}
      <button
        type="button"
        onClick={() => setShowDetail((v) => !v)}
        aria-expanded={showDetail}
        aria-controls="readiness-detail"
        className="flex min-h-12 w-full items-center justify-between gap-3 rounded-card border border-line bg-white px-4 py-3 text-left text-[14px] font-bold text-ink shadow-m-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:hidden"
      >
        {showDetail ? 'Hide the score breakdown' : 'See your score by area and strengths'}
        <ChevronDownIcon className={cn('size-5 shrink-0 text-teal transition-transform motion-reduce:transition-none', showDetail && 'rotate-180')} aria-hidden="true" />
      </button>
      <div id="readiness-detail" className={cn('flex-col gap-6', showDetail ? 'flex' : 'hidden', 'sm:flex')}>
        {/* BY AREA — the six dimensions as a bar chart */}
        <section aria-labelledby="areas-h" className="rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="areas-h" className="text-[15px] font-bold text-ink">
              Your score by area
            </h2>
            {gainOnOffer > 0 ? (
              <span className="text-[12px] font-semibold text-gold-ink">About +{gainOnOffer} pts on offer below</span>
            ) : null}
          </div>
          <ul className="mt-4 flex flex-col gap-3.5">
            {gulf.dimensions.map((d) => {
              const pct = d.max === 0 ? 0 : Math.round((d.score / d.max) * 100)
              return (
                <li key={d.key} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="font-semibold text-ink">
                      {d.label}
                      {d.confidence === 'low' ? (
                        <span className="ml-2 text-[12px] font-normal text-ink-muted">rough estimate</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-mono text-ink-soft">
                      {d.score}/{d.max}
                    </span>
                  </div>
                  <div
                    className="h-2.5 overflow-hidden rounded-full bg-canvas"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={d.max}
                    aria-valuenow={d.score}
                    aria-label={d.label}
                  >
                    <div className={cn('h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none', barTone(pct))} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* STRENGTHS / WHAT HOLDS IT BACK */}
        <div className="grid gap-3 sm:grid-cols-2">
          <section aria-labelledby="strengths-h" className="rounded-card border border-ok/25 bg-white p-4 shadow-m-1">
            <h2 id="strengths-h" className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-ok">
              <CheckCircleIcon className="size-4" aria-hidden="true" />
              Working in your favour
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {gulf.strengths.length ? (
                gulf.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-soft">
                    <span aria-hidden="true" className="text-ok">
                      ✓
                    </span>
                    {s}
                  </li>
                ))
              ) : (
                <li className="text-[13px] text-ink-muted">Nothing clear yet — the fixes above are where to start.</li>
              )}
            </ul>
          </section>
          <section aria-labelledby="weak-h" className="rounded-card border border-alert/20 bg-white p-4 shadow-m-1">
            <h2 id="weak-h" className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-alert">
              <ExclamationTriangleIcon className="size-4" aria-hidden="true" />
              Holding your score back
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {gulf.weaknesses.length ? (
                gulf.weaknesses.map((w, i) => (
                  <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-soft">
                    <span aria-hidden="true" className="text-alert">
                      !
                    </span>
                    {w}
                  </li>
                ))
              ) : (
                <li className="text-[13px] text-ink-muted">No major gaps stood out.</li>
              )}
            </ul>
          </section>
        </div>
      </div>

      <p className="flex items-start gap-2 text-[12px] leading-relaxed text-ink-muted">
        <DocumentTextIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        Worked out from your profile with fixed rules — no AI guess, the same answer every time. It moves as you edit.
      </p>
    </div>
  )
}
