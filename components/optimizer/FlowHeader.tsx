import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import { CheckIcon } from '@heroicons/react/24/solid'
import { cn } from '@/lib/utils'

/**
 * The Resume Optimizer's header, shared by its steps (2026-09-23).
 *
 * The target and level screens each drew their own back arrow, bar and
 * "Step N of 3" in mono — the same thing twice, slightly differently. One
 * header now names all three steps, so a user sees where they are AND what is
 * still to come ("Target job → Level → Optimized CV"), which a bare progress
 * bar never said.
 *
 * Presentation only. `onBack` is the screen's own back behaviour, unchanged.
 */
const STEPS = ['Target job', 'Level', 'Optimized CV'] as const

export function FlowHeader({
  step,
  title,
  subtitle,
  onBack,
  backLabel = 'Go back',
}: {
  /** 1-based index into the three steps. */
  step: 1 | 2 | 3
  title: string
  subtitle?: React.ReactNode
  onBack?: () => void
  backLabel?: string
}) {
  return (
    <header className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        {onBack ? (
          <button
            type="button"
            aria-label={backLabel}
            onClick={onBack}
            className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-ctl text-ink hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <ArrowLeftIcon className="size-5" aria-hidden="true" />
          </button>
        ) : null}
        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-teal">Step 2 of 3 · Resume Optimizer</span>
      </div>

      <ol aria-label={`Step ${step} of ${STEPS.length}`} className="grid grid-cols-3 gap-2">
        {STEPS.map((label, i) => {
          const n = i + 1
          const state = n < step ? 'done' : n === step ? 'current' : 'todo'
          return (
            <li key={label} aria-current={state === 'current' ? 'step' : undefined} className="flex min-w-0 flex-col gap-1.5">
              <span
                className={cn(
                  'h-1.5 rounded-full',
                  state === 'done' && 'bg-ok',
                  state === 'current' && 'bg-teal',
                  state === 'todo' && 'bg-line',
                )}
              />
              <span
                className={cn(
                  'flex items-center gap-1 text-[12px] font-semibold leading-tight',
                  state === 'todo' ? 'text-ink-muted' : state === 'done' ? 'text-ok' : 'text-teal',
                )}
              >
                {state === 'done' ? <CheckIcon className="size-3.5 shrink-0" aria-hidden="true" /> : <span className="font-mono">{n}.</span>}
                <span className="truncate">{label}</span>
              </span>
            </li>
          )
        })}
      </ol>

      <div>
        <h1 className="font-display text-[26px] leading-tight text-ink sm:text-[30px]">{title}</h1>
        {subtitle ? <div className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-ink-soft">{subtitle}</div> : null}
      </div>
    </header>
  )
}
