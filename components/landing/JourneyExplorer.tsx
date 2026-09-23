'use client'

import { useState } from 'react'
import { ArrowRightIcon, CheckBadgeIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { JOURNEY_STEPS, type JourneyStepId } from '@/components/journey/journeySteps'
import {
  LetterVisual,
  MatchVisual,
  MockVisual,
  OptimizerVisual,
  ProfileVisual,
  QaVisual,
  ReadinessVisual,
} from './Stations'

const VISUALS: Record<JourneyStepId, () => React.JSX.Element> = {
  profile: ProfileVisual,
  readiness: ReadinessVisual,
  match: MatchVisual,
  optimize: OptimizerVisual,
  letter: LetterVisual,
  qa: QaVisual,
  mock: MockVisual,
}

/**
 * The complete career workflow, as one interactive path (landing page).
 *
 * A row of seven steps; choosing one shows what you give, what you get, why it
 * matters and a drawn preview of that screen. It is a tab list rather than an
 * auto-playing carousel: nothing moves unless the visitor asks, which is kinder
 * on a phone, on a slow network and to anyone using a screen reader.
 *
 * On a phone the step row scrolls sideways inside itself (never the page) and
 * the chosen step's panel sits below it.
 */
export function JourneyExplorer() {
  const [active, setActive] = useState<JourneyStepId>('profile')
  const index = JOURNEY_STEPS.findIndex((s) => s.id === active)
  const step = JOURNEY_STEPS[index]
  const Visual = VISUALS[step.id]
  const StepIcon = step.icon

  return (
    <div className="mt-10 min-w-0">
      <div
        role="tablist"
        aria-label="The GCC Mentor career journey"
        // Arrow keys move between steps, as in any tab list.
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
          e.preventDefault()
          const next = JOURNEY_STEPS[(index + (e.key === 'ArrowRight' ? 1 : -1) + JOURNEY_STEPS.length) % JOURNEY_STEPS.length]
          setActive(next.id)
          document.getElementById(`journey-tab-${next.id}`)?.focus()
        }}
        className="-mx-3 flex snap-x gap-2 overflow-x-auto px-3 pb-2 [scrollbar-width:thin] sm:mx-0 sm:px-0 lg:grid lg:grid-cols-8 lg:overflow-visible"
      >
        {JOURNEY_STEPS.map((s, i) => {
          const selected = s.id === active
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              id={`journey-tab-${s.id}`}
              aria-selected={selected}
              aria-controls="journey-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(s.id)}
              className={cn(
                'flex min-h-[92px] w-[132px] shrink-0 snap-start flex-col items-start gap-2 rounded-card border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 lg:w-auto',
                selected ? 'border-teal bg-teal text-white shadow-m-2' : 'border-line bg-white text-ink hover:border-teal/50',
              )}
            >
              <span className="flex w-full items-center justify-between">
                <Icon className={cn('size-5', selected ? 'text-gold' : 'text-teal')} aria-hidden="true" />
                <span className={cn('font-mono text-[12px]', selected ? 'text-teal-soft' : 'text-ink-muted')}>
                  {String(i + 1).padStart(2, '0')}
                </span>
              </span>
              <span className="text-[13.5px] font-semibold leading-snug">{s.name}</span>
            </button>
          )
        })}
        {/* The end of the path is the application itself — not a service. */}
        <div className="flex min-h-[92px] w-[132px] shrink-0 snap-start flex-col items-start gap-2 rounded-card border border-dashed border-gold bg-gold-soft p-3 lg:w-auto">
          <CheckBadgeIcon className="size-5 text-gold-ink" aria-hidden="true" />
          <span className="text-[13.5px] font-semibold leading-snug text-ink">Apply with confidence</span>
        </div>
      </div>

      <div
        id="journey-panel"
        role="tabpanel"
        aria-labelledby={`journey-tab-${step.id}`}
        className="mt-5 grid min-w-0 gap-6 rounded-card-lg border border-line bg-white p-5 shadow-m-2 sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:p-9"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-ctl bg-teal-soft text-teal">
              <StepIcon className="size-6" aria-hidden="true" />
            </span>
            <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-teal">
              Step {index + 1} of {JOURNEY_STEPS.length}
            </span>
          </div>
          <h3 className="mt-4 font-display text-[26px] font-semibold leading-tight tracking-[-0.01em] text-ink sm:text-[30px]">
            {step.action}
          </h3>
          <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-ink-soft">{step.why}</p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-canvas p-4">
              <dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">You give</dt>
              <dd className="mt-1.5 text-[14px] font-medium leading-snug text-ink">{step.give}</dd>
            </div>
            <div className="rounded-card border border-teal/25 bg-teal-soft/60 p-4">
              <dt className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">You get</dt>
              <dd className="mt-1.5 text-[14px] font-medium leading-snug text-ink">{step.get}</dd>
            </div>
          </dl>
          {index < JOURNEY_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setActive(JOURNEY_STEPS[index + 1].id)}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-ctl px-1 text-[14px] font-semibold text-teal underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              Next: {JOURNEY_STEPS[index + 1].name}
              <ArrowRightIcon className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <p className="mt-6 text-[14px] font-semibold text-gold-ink">Then apply — with a CV, letter and answers that agree.</p>
          )}
        </div>
        <div className="min-w-0">
          <Visual />
        </div>
      </div>
    </div>
  )
}
