import Link from 'next/link'
import { CheckIcon } from '@heroicons/react/24/solid'
import { cn } from '@/lib/utils'
import { JOURNEY_STEPS, journeyProgress, type JourneyFacts } from './journeySteps'

/**
 * The career journey with the user's own progress on it (dashboard).
 *
 * Seven steps, each done / next / to do. On a phone it is a vertical list —
 * seven columns do not fit 375px, and a list is faster to scan with a thumb.
 * From `lg` it becomes one row with a connecting rail, so the whole path reads
 * left to right at a glance.
 *
 * Every step links to its real route; "next" is the only one that carries the
 * brand colour, so the eye lands on it first. When the facts are still loading
 * the caller passes `facts={null}` and the steps render neutral.
 */
export function JourneyTracker({
  facts,
  jobLabel,
  packageId,
  className,
}: {
  facts: JourneyFacts | null
  /** The job steps 3–7 describe. Null before the first target job exists. */
  jobLabel?: string | null
  /** That job's id: its letter, Q&A and mock steps open with it chosen. */
  packageId?: string | null
  className?: string
}) {
  const state = facts ? journeyProgress(facts) : null
  const doneCount = state ? Object.values(state).filter((s) => s === 'done').length : 0

  return (
    <section aria-labelledby="journey-heading" className={cn('rounded-card border border-line bg-white p-4 shadow-m-1 sm:p-5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="journey-heading" className="font-display text-[18px] font-semibold text-ink">
          Your career journey
        </h2>
        <span className="text-[12.5px] font-semibold text-ink-muted">
          {state ? `${doneCount} of ${JOURNEY_STEPS.length} steps done` : 'Checking your progress…'}
        </span>
      </div>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
        {jobLabel ? (
          <>
            Steps 3–7 are for <span className="font-semibold text-ink">{jobLabel}</span>. Each target job keeps its CV,
            letter and interview preparation together.
          </>
        ) : (
          'One profile feeds every step. Each target job keeps its CV, letter and interview preparation together.'
        )}
      </p>

      <ol className="relative mt-4 flex flex-col gap-1 lg:grid lg:grid-cols-7 lg:gap-2">
        {/* The rail: vertical on a phone, horizontal from lg. Decorative. */}
        <span aria-hidden="true" className="absolute bottom-5 left-[19px] top-5 w-px bg-line lg:hidden" />
        <span aria-hidden="true" className="absolute left-[7%] right-[7%] top-[19px] hidden h-px bg-line lg:block" />
        {JOURNEY_STEPS.map((step, index) => {
          const s = state?.[step.id] ?? 'todo'
          const Icon = step.icon
          return (
            <li key={step.id} className="relative min-w-0">
              <Link
                href={
                  packageId && (step.id === 'letter' || step.id === 'qa' || step.id === 'mock')
                    ? `${step.href}?package=${encodeURIComponent(packageId)}`
                    : step.id === 'optimize' && packageId && s === 'done'
                      ? `/package/${encodeURIComponent(packageId)}`
                      : step.href
                }
                aria-current={s === 'next' ? 'step' : undefined}
                className={cn(
                  'group flex min-h-12 items-center gap-3 rounded-ctl px-0.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal lg:flex-col lg:items-center lg:gap-2 lg:px-1 lg:py-0 lg:text-center',
                )}
              >
                <span
                  className={cn(
                    'relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    s === 'done' && 'border-ok bg-ok text-white',
                    s === 'next' && 'border-teal bg-teal text-white shadow-m-2',
                    s === 'todo' && 'border-line-strong bg-white text-ink-muted group-hover:border-teal/60',
                  )}
                >
                  {s === 'done' ? <CheckIcon className="size-5" aria-hidden="true" /> : <Icon className="size-5" aria-hidden="true" />}
                </span>
                <span className="flex min-w-0 flex-col lg:items-center">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Step {index + 1}</span>
                  <span className={cn('text-[14px] font-semibold leading-snug lg:text-[13px]', s === 'next' ? 'text-teal' : 'text-ink')}>
                    {step.name}
                  </span>
                  <span
                    className={cn(
                      'text-[12px] font-medium',
                      s === 'done' ? 'text-ok' : s === 'next' ? 'text-teal' : 'text-ink-muted',
                    )}
                  >
                    {s === 'done' ? 'Done' : s === 'next' ? 'Do this next' : 'To do'}
                  </span>
                </span>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
