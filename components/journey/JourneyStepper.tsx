import Link from 'next/link'
import { CheckIcon, LockClosedIcon } from '@heroicons/react/24/solid'
import { ArrowRightIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { STAGES, type StageId, type StageState } from './stages'

/**
 * The three-step rail (2026-09-25). One line of three dots, joined, that says
 * where the user is and what comes after — the map a new user was missing.
 *
 * Done and ready steps link to their page; the current step is gold; a step
 * whose previous step was never done shows a lock and what unlocks it
 * ("After step 1"), so nothing looks broken or hidden.
 */
export function StageRail({ states, className }: { states: Record<StageId, StageState>; className?: string }) {
  return (
    <ol aria-label="Your three steps" className={cn('grid grid-cols-3', className)}>
      {STAGES.map((s, i) => {
        const state = states[s.id]
        const prevDone = i > 0 && states[STAGES[i - 1].id] === 'done'
        const body = (
          <>
            <span className="relative flex w-full items-center justify-center">
              {/* connector to the left, green once the previous step is done */}
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn('absolute right-1/2 top-1/2 h-[3px] w-full -translate-y-1/2', prevDone ? 'bg-ok' : 'bg-line')}
                />
              ) : null}
              <span
                aria-hidden="true"
                className={cn(
                  'relative z-10 flex size-9 items-center justify-center rounded-full text-[15px] font-bold ring-4 ring-canvas sm:size-10',
                  state === 'done' && 'bg-ok text-white',
                  state === 'current' && 'bg-gold text-ink shadow-m-2',
                  state === 'open' && 'border-2 border-teal/40 bg-white text-teal',
                  state === 'locked' && 'border-2 border-line bg-white text-ink-muted',
                )}
              >
                {state === 'done' ? <CheckIcon className="size-5" /> : s.n}
              </span>
            </span>
            <span className={cn('mt-2 text-center text-[13px] font-semibold leading-tight sm:text-[14px]', state === 'locked' ? 'text-ink-muted' : 'text-ink')}>
              {s.name}
            </span>
            <span
              className={cn(
                'mt-1 inline-flex items-center gap-1 text-center text-[12px] leading-tight',
                state === 'done' && 'text-ok',
                state === 'current' && 'font-semibold text-gold-ink',
                state === 'open' && 'text-teal',
                state === 'locked' && 'text-ink-muted',
              )}
            >
              {state === 'locked' ? <LockClosedIcon className="size-3" aria-hidden="true" /> : null}
              {state === 'done' ? 'Done' : state === 'current' ? 'You are here' : state === 'open' ? 'Ready' : `After step ${s.n - 1}`}
            </span>
          </>
        )
        return (
          <li key={s.id} aria-current={state === 'current' ? 'step' : undefined} className="flex min-w-0 flex-col items-center px-1">
            {state === 'done' || state === 'open' ? (
              <Link
                href={s.href}
                className="flex w-full flex-col items-center rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
              >
                {body}
              </Link>
            ) : (
              body
            )}
          </li>
        )
      })}
    </ol>
  )
}

/**
 * "What each step gives you" — shown to a user who has not finished step 1.
 * Each card says what it produces and what it is built from, so the product
 * explains itself without a paragraph.
 */
export function StageExplainer({ states }: { states: Record<StageId, StageState> }) {
  return (
    <section aria-labelledby="how-h" className="flex flex-col gap-3">
      <h2 id="how-h" className="font-display text-[19px] font-semibold text-ink">
        How it works
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {STAGES.map((s, i) => {
          const Icon = s.icon
          const state = states[s.id]
          return (
            <li
              key={s.id}
              className={cn(
                'relative flex flex-col gap-2 rounded-card border bg-white p-5 shadow-m-1',
                state === 'current' ? 'border-gold/60' : 'border-line',
              )}
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-ctl',
                    state === 'current' ? 'bg-gold-soft text-gold-ink' : state === 'done' ? 'bg-ok-soft text-ok' : 'bg-teal-soft text-teal',
                  )}
                >
                  <Icon className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">Step {s.n}</span>
                  <span className="text-[15px] font-semibold leading-tight text-ink">{s.name}</span>
                </span>
              </span>
              <p className="text-[13.5px] leading-relaxed text-ink-soft">{s.outcome}</p>
              <p className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[12.5px] font-medium text-teal">
                {i === 0 ? 'You give:' : ''} {s.from}
              </p>
              {i < STAGES.length - 1 ? (
                // The arrow between cards, desktop only: "this feeds the next".
                <span aria-hidden="true" className="absolute -right-[14px] top-1/2 z-10 hidden size-6 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-canvas text-ink-muted md:flex">
                  <ArrowRightIcon className="size-3.5" />
                </span>
              ) : null}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
