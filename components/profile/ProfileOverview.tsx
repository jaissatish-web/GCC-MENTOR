'use client'

import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MinusCircleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

/**
 * THE TOP OF THE CAREER PROFILE (2026-09-23).
 *
 * A first-time user must see, before any input: what this page is, what the
 * product already knows about them, which parts are done, and the one thing to
 * fill next. Every figure here is computed from what they entered — nothing is
 * inferred or invented — and says where it comes from.
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

export interface ProfileFacts {
  currentTitle: string | null
  years: number | null
  gcc: { years: number; countries: string[]; roles: number }
  location: string | null
  target: string | null
  availability: string | null
}

function Fact({ label, value, note }: { label: string; value: string | null; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">{label}</dt>
      <dd className={cn('break-words text-[14px] font-semibold leading-snug', value ? 'text-ink' : 'text-ink-muted')}>
        {value ?? 'Not added yet'}
      </dd>
      {note ? <dd className="text-[12px] leading-snug text-ink-muted">{note}</dd> : null}
    </div>
  )
}

const USED_BY = ['Resume Optimizer', 'Job match', 'Cover letter', 'Interview Q&A', 'Mock interview'] as const

export function ProfileOverview({
  facts,
  sections,
  onOpenSection,
}: {
  facts: ProfileFacts
  sections: readonly SectionSummary[]
  onOpenSection: (id: string) => void
}) {
  const complete = sections.filter((s) => s.status === 'complete').length
  const counted = sections.filter((s) => s.status !== 'optional').length
  const next = sections.find((s) => s.status === 'missing') ?? sections.find((s) => s.status === 'attention') ?? null

  return (
    <section aria-label="Profile overview" className="mx-3 mt-4 flex flex-col gap-4 sm:mx-5">
      {/* What this page is, in two sentences. */}
      <div className="flex gap-3 rounded-card border border-teal/25 bg-teal-soft/60 p-4">
        <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[14px] font-semibold leading-snug text-ink">
            This is the source GCC Mentor writes from.
          </p>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Your CVs, cover letters and interview answers are written only from what is here. Anything new is shown to
            you first and kept only if you confirm it is true.
          </p>
          <p className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[12px] text-ink-muted">
            <span className="font-semibold text-ink-soft">Used by:</span>
            {USED_BY.map((u) => (
              <span key={u} className="rounded-full border border-line bg-white px-2 py-0.5 font-semibold text-ink-soft">
                {u}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* What we know, computed from the user's own entries. */}
      <div className="rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 lg:grid-cols-3">
          <Fact label="Current role" value={facts.currentTitle} />
          <Fact label="Experience" value={facts.years !== null ? `${facts.years} year${facts.years === 1 ? '' : 's'}` : null} note="From your job dates" />
          <Fact
            label="GCC experience"
            value={facts.gcc.roles > 0 ? `${facts.gcc.years} year${facts.gcc.years === 1 ? '' : 's'}` : null}
            note={facts.gcc.roles > 0 ? facts.gcc.countries.join(', ') : 'No Gulf-based role found yet'}
          />
          <Fact label="Location" value={facts.location} />
          <Fact label="Target role" value={facts.target} />
          <Fact label="Visa · notice" value={facts.availability} />
        </dl>
      </div>

      {/* Every section at a glance, and the one to do next. */}
      <div className="rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-[18px] font-semibold text-ink">Profile sections</h2>
          <span className="text-[12.5px] font-semibold text-ink-muted">
            {complete} of {counted} complete
          </span>
        </div>
        {next ? (
          <button
            type="button"
            onClick={() => onOpenSection(next.id)}
            className="mt-3 flex w-full items-center gap-3 rounded-ctl bg-teal px-4 py-3 text-left text-white transition-colors hover:bg-teal-bright focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-teal-soft">Fill next · {next.label}</span>
              <span className="text-[14px] font-semibold leading-snug">{next.hint}</span>
            </span>
            <ArrowRightIcon className="size-5 shrink-0" aria-hidden="true" />
          </button>
        ) : (
          <p className="mt-3 rounded-ctl bg-ok-soft px-4 py-3 text-[13.5px] font-semibold text-ok">
            Every section is complete. Keep it up to date as your career moves.
          </p>
        )}
        <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {sections.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onOpenSection(s.id)}
                className="flex min-h-12 w-full items-center justify-between gap-2 rounded-ctl border border-line px-3 py-2 text-left transition-colors hover:border-teal/50 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                <span className="min-w-0 text-[13.5px] font-semibold text-ink">{s.label}</span>
                <StatusChip status={s.status} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
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
}: {
  state: 'saved' | 'dirty' | 'saving' | 'error'
  message?: string | null
  onSave: () => void
  onFinish: () => void
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      // Sticky only while there is something to do. Saved, it sits at the end
      // of the form: pinned, it covered a sixth of a phone screen for nothing.
      className={cn(
        'z-20 mx-3 mt-4 flex flex-col gap-2 rounded-card border bg-white/95 p-3 backdrop-blur sm:mx-5 sm:flex-row sm:items-center sm:justify-between',
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
            Done — go to dashboard
          </button>
        ) : (
          <button
            type="button"
            onClick={onSave}
            disabled={state === 'saving'}
            className="min-h-11 flex-1 rounded-ctl bg-gold px-5 text-[14px] font-bold text-ink hover:bg-gold-ink hover:text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:flex-none"
          >
            {state === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
        )}
      </div>
    </div>
  )
}
