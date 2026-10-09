'use client'

import { useEffect, useState } from 'react'
import {
  AdjustmentsHorizontalIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentMagnifyingGlassIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  FlagIcon,
  GlobeAltIcon,
  IdentificationIcon,
  MapPinIcon,
  MinusCircleIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { ScoreRing, type RingTone } from '@/components/profile/ScoreRing'
import type { GulfReadinessResult } from '@/lib/gulfReadiness/types'
import type { VisibilityGroupSummary } from '@/components/profile/CvVisibilitySettings'

/**
 * THE CAREER PROFILE OVERVIEW (founder brief 2026-10-04).
 *
 * "The profile page looks very messy — segregate it." The page used to stack
 * an explainer, a facts grid, a section list, the whole Gulf Readiness plan and
 * a nine-section form on one screen. Now the overview is a set of cards, each
 * one thing, and each opens its own screen:
 *
 *   header            photo + Profile complete ring (unchanged)
 *   ProfileExplainer  what this page is, in plain words
 *   ScoreCards        Profile complete · Gulf Readiness — ring, number, one line
 *   SettingsCard      what appears on the CV, group by group
 *   CareerSnapshot    current role, years, GCC years, location, target, visa · notice
 *
 * Every figure is computed from what the user entered — nothing is inferred or
 * invented — and every card says where tapping it goes.
 */

export type SectionStatus = 'complete' | 'attention' | 'missing' | 'optional'

export interface SectionSummary {
  id: string
  label: string
  status: SectionStatus
  /** One plain sentence: what is missing, or what this part is for. */
  hint: string
}

const STATUS_META: Record<SectionStatus, { label: string; chip: string; icon: React.ComponentType<{ className?: string }> }> = {
  // ok on ok-soft 5.18 · gold-ink on gold-soft 4.83 · alert on alert-soft 5.62
  complete: { label: 'Complete', chip: 'bg-ok-soft text-ok', icon: CheckCircleIcon },
  attention: { label: 'Needs attention', chip: 'bg-gold-soft text-gold-ink', icon: ExclamationTriangleIcon },
  missing: { label: 'Missing', chip: 'bg-alert-soft text-alert', icon: MinusCircleIcon },
  optional: { label: 'Optional', chip: 'border border-line-strong bg-white text-ink-muted', icon: MinusCircleIcon },
}

export function StatusChip({ status, className }: { status: SectionStatus; className?: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-bold',
        meta.chip,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

/**
 * The Gulf verdict as a status colour. Status tokens, not the brand: "ready" is
 * `ok`, "almost" is gold, "not ready yet" is `alert`.
 */
export const VERDICT_TONE: Record<GulfReadinessResult['verdict']['key'], { ring: RingTone; chip: string; text: string; card: string }> = {
  ready: { ring: 'ok', chip: 'bg-ok-soft text-ok', text: 'text-ok', card: 'from-ok-soft' },
  almost: { ring: 'gold', chip: 'bg-gold-soft text-gold-ink', text: 'text-gold-ink', card: 'from-gold-soft' },
  not_ready: { ring: 'alert', chip: 'bg-alert-soft text-alert', text: 'text-alert', card: 'from-alert-soft' },
}

// ---------------------------------------------------------------------------
// The explainer
// ---------------------------------------------------------------------------

const HOW_IT_WORKS = [
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'We read your CV',
    body: 'Your jobs, skills and education are filled in for you.',
    badge: 'bg-blue-soft text-blue',
  },
  {
    icon: PencilSquareIcon,
    title: 'You check it',
    body: 'Fix anything we read wrong, and add what a CV cannot show — visa, notice period, licence.',
    badge: 'bg-gold-soft text-gold-ink',
  },
  {
    icon: SparklesIcon,
    title: 'We write from it',
    body: 'Every CV, cover letter and interview answer is written from these facts.',
    badge: 'bg-ok-soft text-ok',
  },
] as const

const USED_BY = ['Resume Optimizer', 'Job match', 'Cover letter', 'Interview Q&A', 'Mock interview'] as const

/**
 * "This is the source GCC Mentor writes from" — said in plain words, on the
 * one coloured panel of the page so it is read first. The promise is the one
 * the product actually keeps (docs/12_DESIGN_SYSTEM.md "Truth rules"): written
 * from the profile; anything new is shown first and kept only if confirmed.
 */
const EXPLAINER_SEEN_KEY = 'gcc.profile.explainerSeen'

/** Per-browser memory only — a convenience. Blocked storage reads as "not seen". */
function explainerSeen(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(EXPLAINER_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * SHOWN IN FULL ONCE (founder 2026-10-04, D3). The full card is about a phone
 * screen tall; on every later visit it folds to one line that opens it again,
 * so a returning user lands on their scores, not on the explanation they have
 * already read.
 */
export function ProfileExplainer() {
  const [seenBefore] = useState(explainerSeen)
  const [open, setOpen] = useState(!seenBefore)
  useEffect(() => {
    try {
      window.localStorage.setItem(EXPLAINER_SEEN_KEY, '1')
    } catch {
      /* storage blocked: the card simply shows in full next time too */
    }
  }, [])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={false}
        aria-controls="profile-explainer"
        className="mx-3 sm:mx-5 mt-4 flex min-h-12 items-center gap-3 rounded-card bg-gradient-to-r from-teal to-teal-bright px-4 py-2.5 text-left text-white shadow-m-1 transition-shadow hover:shadow-m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        <ShieldCheckIcon className="size-5 shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-[13.5px] font-semibold leading-snug">Your profile is the base for everything we make</span>
        <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-white/90">
          How it works
          <ChevronDownIcon className="size-4" aria-hidden="true" />
        </span>
      </button>
    )
  }

  return (
    <section
      id="profile-explainer"
      aria-labelledby="profile-explainer-h"
      className="relative mx-3 sm:mx-5 mt-4 overflow-hidden rounded-card-lg bg-gradient-to-br from-teal via-teal to-teal-bright p-4 text-white shadow-m-2 sm:p-6"
    >
      {seenBefore ? (
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-expanded={true}
          className="absolute right-2 top-2 z-10 inline-flex min-h-11 items-center rounded-ctl px-3 text-[12.5px] font-bold text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          Hide
        </button>
      ) : null}
      {/* One soft pool of light, top right — the panel's only decoration. */}
      <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-gold/25 blur-3xl" />
      <div className="relative flex flex-col gap-4">
        <div className={cn('flex items-start gap-3', seenBefore && 'pr-14')}>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-ctl bg-white/15">
            <ShieldCheckIcon className="size-6 text-white" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="profile-explainer-h" className="font-display text-[19px] font-semibold leading-snug sm:text-[21px]">
              Your profile is the base for everything we make
            </h2>
            <p className="text-[13.5px] leading-relaxed text-white/85">
              Keep it correct once, and every document comes out right. We use only what is written here.
            </p>
          </div>
        </div>

        <ol className="grid gap-2.5 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s, i) => {
            const Icon = s.icon
            return (
              <li key={s.title} className="flex gap-3 rounded-ctl bg-white p-3 text-ink shadow-m-1">
                <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', s.badge)}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-[13.5px] font-bold leading-snug">
                    <span className="text-ink-muted">{i + 1}.</span> {s.title}
                  </span>
                  <span className="text-[12.5px] leading-snug text-ink-soft">{s.body}</span>
                </span>
              </li>
            )
          })}
        </ol>

        <p className="flex items-start gap-2 rounded-ctl bg-white/10 px-3 py-2.5 text-[12.5px] leading-relaxed text-white/90">
          <CheckCircleIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>If we ever suggest something new, you see it first. It is kept only if you confirm it is true.</span>
        </p>

        <p className="flex flex-wrap items-center gap-1.5 text-[12px]">
          <span className="font-semibold text-white/80">Used by:</span>
          {USED_BY.map((u) => (
            <span key={u} className="rounded-full bg-white/15 px-2 py-0.5 font-semibold text-white">
              {u}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// The two score cards
// ---------------------------------------------------------------------------

const CARD_BUTTON =
  'group flex h-full w-full flex-col items-center gap-2 rounded-card border bg-gradient-to-b to-white p-3 text-center shadow-m-1 transition-all hover:-translate-y-0.5 hover:shadow-m-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas motion-reduce:transform-none motion-reduce:transition-none sm:p-5'

function CardLink({ children }: { children: React.ReactNode }) {
  return (
    <span className="mt-auto inline-flex min-h-8 max-w-full items-center gap-1 pt-1 text-[12.5px] font-bold text-teal">
      <span className="min-w-0 break-words">{children}</span>
      <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
    </span>
  )
}

export function ScoreCards({
  completeness,
  gulf,
  onOpenCompleteness,
  onOpenReadiness,
  className,
}: {
  /** `detail` is the line under the count, e.g. "5 of 8 key sections done". */
  completeness: { score: number; itemsLeft: number; detail: string }
  /** Null for the moment before it is computed — shown as "—", never as 0. */
  gulf: GulfReadinessResult | null
  onOpenCompleteness: () => void
  onOpenReadiness: () => void
  /** Replaces the outer spacing (the dashboard sets its own). */
  className?: string
}) {
  const tone = gulf ? VERDICT_TONE[gulf.verdict.key] : null
  const paperworkLeft = gulf ? gulf.mustHaves.filter((m) => m.status !== 'ok').length : 0
  const profileFixes = gulf ? gulf.recommendations.filter((r) => (r.stage ?? 'profile') === 'profile').length : 0

  return (
    <section aria-label="Your two scores" className={cn('grid grid-cols-2 gap-3 sm:gap-4', className ?? 'mx-3 sm:mx-5 mt-4')}>
      <button type="button" onClick={onOpenCompleteness} className={cn(CARD_BUTTON, 'border-teal/20 from-teal-soft')}>
        <span className="max-w-full break-words text-[12px] font-bold uppercase tracking-[0.1em] text-teal">Profile complete</span>
        <ScoreRing value={completeness.score} size={92} label="Profile complete" />
        <span className="text-[14px] font-bold leading-snug text-ink">
          {completeness.itemsLeft === 0
            ? 'Nothing left to add'
            : `${completeness.itemsLeft} item${completeness.itemsLeft === 1 ? '' : 's'} left`}
        </span>
        <span className="text-[12px] leading-snug text-ink-soft">{completeness.detail}</span>
        <CardLink>{completeness.itemsLeft === 0 ? 'See my sections' : "See what's missing"}</CardLink>
      </button>

      <button
        type="button"
        onClick={onOpenReadiness}
        className={cn(CARD_BUTTON, tone ? tone.card : 'from-canvas', 'border-line')}
      >
        <span className="max-w-full break-words text-[12px] font-bold uppercase tracking-[0.1em] text-teal">Gulf Readiness</span>
        <ScoreRing value={gulf ? gulf.finalScore : null} size={92} tone={tone?.ring ?? 'teal'} suffix="/100" label="Gulf Readiness" />
        <span className={cn('rounded-full px-2.5 py-0.5 text-[13px] font-bold leading-snug', tone?.chip ?? 'bg-canvas text-ink-muted')}>
          {/* The verdict alone ("Almost ready"). Its full label adds the reason
              ("— 2 paperwork steps to check"), which the line below already
              counts — shown twice, the chip wrapped to three lines on a phone
              (audit 2026-10-04, D5). The Gulf Readiness screen keeps the full label. */}
          {gulf ? gulf.verdict.label.split(' — ')[0] : 'Working it out…'}
        </span>
        <span className="text-[12px] leading-snug text-ink-soft">
          {!gulf
            ? 'How ready you are for GCC jobs'
            : paperworkLeft + profileFixes === 0
              ? 'Nothing left to fix'
              : [
                  paperworkLeft ? `${paperworkLeft} paperwork step${paperworkLeft === 1 ? '' : 's'}` : null,
                  profileFixes ? `${profileFixes} profile fix${profileFixes === 1 ? '' : 'es'}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
        </span>
        <CardLink>Improve my readiness</CardLink>
      </button>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Career snapshot
// ---------------------------------------------------------------------------

export interface ProfileFacts {
  currentTitle: string | null
  years: number | null
  gcc: { years: number; countries: string[]; roles: number }
  location: string | null
  target: string | null
  availability: string | null
}

/** Where a fact is edited — a field to focus, or a section to open. */
export interface FactTarget {
  field?: string
  sectionId?: string
}

function FactTile({
  icon: Icon,
  badge,
  label,
  value,
  note,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  /** The colour of the profile section this fact lives in (SECTION_ACCENT). */
  badge: string
  label: string
  value: string | null
  note?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[64px] w-full items-start gap-2.5 rounded-ctl border border-line bg-white p-3 text-left transition-colors hover:border-teal/50 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
    >
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', badge)}>
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</span>
        <span className={cn('break-words text-[14px] font-semibold leading-snug', value ? 'text-ink' : 'text-ink-muted')}>
          {value ?? 'Not added yet'}
        </span>
        {note ? <span className="text-[12px] leading-snug text-ink-muted">{note}</span> : null}
      </span>
    </button>
  )
}

const EXPERIENCE_BADGE = 'bg-sec-experience/10 text-sec-experience'
const IDENTITY_BADGE = 'bg-sec-identity/10 text-sec-identity'
const STATUS_BADGE = 'bg-sec-status/10 text-sec-status'

/**
 * "Your career at a glance" — the six facts a Gulf recruiter asks first. Each
 * tile opens the field or section it comes from; the header opens the whole
 * profile (everything read from the CV).
 */
export function CareerSnapshot({
  facts,
  onOpen,
  onOpenAll,
}: {
  facts: ProfileFacts
  onOpen: (target: FactTarget) => void
  onOpenAll: () => void
}) {
  return (
    <section aria-labelledby="snapshot-h" className="mx-3 sm:mx-5 mt-4 rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-col">
          <h2 id="snapshot-h" className="font-display text-[18px] font-semibold text-ink">
            Your career at a glance
          </h2>
          <p className="text-[12.5px] text-ink-muted">Tap any box to change it.</p>
        </div>
        <button
          type="button"
          onClick={onOpenAll}
          className="-mr-1 inline-flex min-h-11 items-center gap-1 rounded-ctl px-1 text-[13px] font-bold text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          Full profile
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <FactTile
          icon={BriefcaseIcon}
          badge={EXPERIENCE_BADGE}
          label="Current role"
          value={facts.currentTitle}
          onClick={() => onOpen({ sectionId: 'sec_work_experience' })}
        />
        <FactTile
          icon={ClockIcon}
          badge={EXPERIENCE_BADGE}
          label="Experience"
          value={facts.years !== null ? `${facts.years} year${facts.years === 1 ? '' : 's'}` : null}
          note="Counted from your job dates"
          onClick={() => onOpen({ sectionId: 'sec_work_experience' })}
        />
        <FactTile
          icon={GlobeAltIcon}
          badge={EXPERIENCE_BADGE}
          label="Gulf experience"
          value={facts.gcc.roles > 0 ? `${facts.gcc.years} year${facts.gcc.years === 1 ? '' : 's'}` : null}
          note={facts.gcc.roles > 0 ? facts.gcc.countries.join(', ') : 'No Gulf-based job found yet'}
          onClick={() => onOpen({ sectionId: 'sec_work_experience' })}
        />
        <FactTile
          icon={MapPinIcon}
          badge={IDENTITY_BADGE}
          label="Location"
          value={facts.location}
          onClick={() => onOpen({ field: 'current_location' })}
        />
        <FactTile
          icon={FlagIcon}
          badge={STATUS_BADGE}
          label="Target role"
          value={facts.target}
          onClick={() => onOpen({ field: 'target_job_title' })}
        />
        <FactTile
          icon={IdentificationIcon}
          badge={IDENTITY_BADGE}
          label="Visa · notice"
          value={facts.availability}
          onClick={() => onOpen({ field: 'visa_status' })}
        />
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Profile settings (what appears on the CV)
// ---------------------------------------------------------------------------

/**
 * PROFILE SETTINGS on the overview (founder request 2026-10-04: above "Your
 * career at a glance", in a proper card). Four tiles — the same four groups as
 * the settings screen — each saying how many of its details are on the CV and
 * naming what is hidden, so the card answers "what does my CV show?" before
 * it is opened. The whole card opens the settings screen.
 */
export function SettingsCard({
  shown,
  total,
  groups,
  onOpen,
}: {
  shown: number
  total: number
  groups: readonly VisibilityGroupSummary[]
  onOpen: () => void
}) {
  return (
    <section
      aria-labelledby="settings-card-h"
      className="group relative mx-3 sm:mx-5 mt-4 overflow-hidden rounded-card border border-sec-summary/20 bg-white shadow-m-1 transition-all focus-within:ring-2 focus-within:ring-teal hover:-translate-y-0.5 hover:shadow-m-2 motion-reduce:transform-none"
    >
      <div className="flex items-center gap-3 bg-gradient-to-r from-sec-summary/10 via-sec-summary/[0.04] to-white px-4 py-3.5 sm:px-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-ctl bg-white text-sec-summary shadow-m-1">
          <AdjustmentsHorizontalIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id="settings-card-h" className="text-[15.5px] font-bold text-ink">
            Profile settings
          </h2>
          <p className="text-[12.5px] leading-snug text-ink-soft">
            What your CV shows — <span className="font-semibold text-ink">{shown} of {total} details on</span>
          </p>
        </div>
        {/* The whole card is the target; this is its one focusable control. */}
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-ctl bg-white px-3 text-[13px] font-bold text-teal shadow-m-1 after:absolute after:inset-0 after:rounded-card focus-visible:outline-none"
        >
          <span aria-hidden="true">Manage</span>
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
          <span className="sr-only">Open profile settings</span>
        </button>
      </div>

      <ul className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:p-4">
        {groups.map((g) => {
          const Icon = g.icon
          const all = g.shown === g.total
          return (
            <li key={g.id} className="flex min-w-0 flex-col gap-1.5 rounded-ctl border border-line bg-canvas/60 p-2.5">
              <span className="flex items-center gap-2">
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', g.badge)}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 text-[12.5px] font-bold leading-tight text-ink">{g.title}</span>
              </span>
              <span className={cn('inline-flex items-center gap-1 text-[12px] font-semibold', all ? 'text-ok' : 'text-ink-soft')}>
                {all ? <EyeIcon className="size-3.5" aria-hidden="true" /> : <EyeSlashIcon className="size-3.5" aria-hidden="true" />}
                {all ? `All ${g.total} on CV` : `${g.shown} of ${g.total} on CV`}
              </span>
              {g.hidden.length > 0 ? (
                <span className="text-[12px] leading-snug text-ink-muted">Hidden: {g.hidden.join(', ')}</span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Header of a detail screen
// ---------------------------------------------------------------------------

/**
 * The top of every screen the overview opens: a way back, where you are, what
 * this screen is for, and (when there is one) its action — Save.
 */
export function ViewHeader({
  eyebrow,
  title,
  description,
  onBack,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  onBack: () => void
  action?: React.ReactNode
}) {
  return (
    <header className="flex flex-col gap-2 bg-white px-3 sm:px-5 pb-5 pt-2">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex min-h-11 items-center gap-1.5 self-start rounded-ctl px-1 text-[13px] font-bold text-teal hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
      >
        <ArrowLeftIcon className="size-4" aria-hidden="true" />
        Profile overview
      </button>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">Career Profile · {eyebrow}</span>
          <h1 className="type-title text-ink">{title}</h1>
          <p className="text-[13px] leading-relaxed text-ink-soft">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  )
}

/** A quiet, dashed note — the empty state of a block on a detail screen. */
export function QuietNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-ctl border border-dashed border-line-strong bg-canvas/60 px-3.5 py-3 text-[13px] leading-relaxed text-ink-soft">
      <ChatBubbleLeftRightIcon className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

/**
 * The save bar (2026-09-23): always says whether the profile is saved.
 *
 * It replaces a Save that only lived at the top, sent the user to the
 * dashboard, and reported failures at the very bottom of a nine-section form
 * where nobody saw them. Sticky at the foot of the screen, above the phone's
 * bottom navigation.
 */
export function SaveBar({
  state,
  message,
  onSave,
  onFinish,
  finishLabel = 'Done — go to dashboard',
}: {
  state: 'saved' | 'dirty' | 'saving' | 'error'
  message?: string | null
  onSave: () => void
  onFinish: () => void
  /**
   * What the button does once everything is saved. On the overview it leaves
   * for the dashboard; on a screen the overview opened (Gulf Readiness,
   * completeness, full profile, settings) it goes back to the profile —
   * founder request 2026-10-04: after fixing a score, people want to see
   * their profile, not leave it.
   */
  finishLabel?: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      // Sticky only while there is something to do. Saved, it sits at the end
      // of the form: pinned, it covered a sixth of a phone screen for nothing.
      className={cn(
        'z-20 mx-3 sm:mx-5 mt-4 flex flex-col gap-2 rounded-card border bg-white/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between',
        state === 'saved' ? 'border-line shadow-m-1' : 'sticky bottom-[76px] border-gold/50 shadow-m-3 md:bottom-4',
      )}
    >
      <p
        className={cn(
          'flex min-w-0 items-center gap-2 text-[13.5px] font-semibold',
          state === 'saved' && 'text-ok',
          state === 'dirty' && 'text-gold-ink',
          state === 'saving' && 'text-ink-soft',
          state === 'error' && 'text-alert',
        )}
      >
        {state === 'saving' ? (
          <span aria-hidden="true" className="size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
        ) : state === 'saved' ? (
          <CheckCircleIcon className="size-5 shrink-0" aria-hidden="true" />
        ) : (
          <ExclamationTriangleIcon className="size-5 shrink-0" aria-hidden="true" />
        )}
        <span className="min-w-0">
          {state === 'saved'
            ? 'All changes saved'
            : state === 'saving'
              ? 'Saving…'
              : state === 'error'
                ? `Needs correction: ${message ?? 'saving failed'}`
                : 'You have unsaved changes'}
        </span>
      </p>
      <div className="flex shrink-0 gap-2">
        {state === 'saved' ? (
          <button
            type="button"
            onClick={onFinish}
            className="min-h-11 flex-1 rounded-ctl border border-line-strong bg-white px-4 text-[13px] font-semibold text-ink hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:flex-none"
          >
            {finishLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={state === 'saving'}
            className="min-h-11 flex-1 rounded-ctl bg-gold px-3 sm:px-5 text-[14px] font-bold text-ink hover:bg-gold-ink hover:text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:flex-none"
          >
            {state === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>
    </div>
  )
}
