import Link from 'next/link'
import { StageRail } from '@/components/journey/JourneyStepper'
import type { Stage, StageId, StageState } from '@/components/journey/stages'
import { jobLabel, type NextAction } from '@/lib/nextAction'
import type { PackageListItem } from '@/lib/packageSummary'

/** The first dashboard card: one next task with its application context. */
export function DashboardNextStep({ ready, loadError, draftWaiting, firstRun, currentStage, states, focusedJob, nextAction }: {
  ready: boolean
  loadError: boolean
  draftWaiting: boolean
  firstRun: boolean
  currentStage: Stage | null
  states: Record<StageId, StageState>
  focusedJob: PackageListItem | null
  nextAction: NextAction
}) {
  return (
    <section aria-label="Your progress and next step" className="overflow-hidden rounded-card border border-line bg-white shadow-m-2">
      <div className="px-2 py-4 sm:px-8 sm:py-5">
        {ready ? (
          <StageRail states={states} className="mx-auto max-w-[720px]" />
        ) : (
          <div className="mx-auto h-[84px] max-w-[520px] animate-pulse rounded-ctl bg-canvas" />
        )}
      </div>

      {focusedJob ? (
        <div className="flex flex-col gap-2 border-t border-line bg-canvas px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="min-w-0 flex-1">
            <p className="type-caption font-semibold uppercase tracking-[0.08em] text-ink-muted">Application to continue</p>
            <p className="mt-1 break-words type-helper font-semibold text-ink">{jobLabel(focusedJob)}</p>
          </div>
          <Link href={`/package/${focusedJob.id}`} className="inline-flex min-h-11 shrink-0 items-center self-start rounded-ctl px-2 type-helper font-semibold text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">Open workspace →</Link>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 bg-teal p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-teal-soft">
            {loadError
              ? 'Something went wrong'
              : !ready
                ? 'Your next step'
                : draftWaiting
                  ? 'Waiting for your decision'
                  : currentStage
                  ? `Step ${currentStage.n} · ${currentStage.name}`
                  : 'Preparation complete'}
          </span>
          <h2 className="type-section text-white">
            {loadError
              ? 'Your saved work could not be loaded'
              : !ready
                ? 'Loading your next step…'
                : firstRun
                  ? 'Start with the CV you already have'
                  : nextAction.title}
          </h2>
          <p className="max-w-[60ch] type-body text-teal-soft">
            {loadError
              ? 'Please try again to see your latest profile and application progress.'
              : !ready
                ? 'Checking your profile and saved applications.'
                : firstRun
                  ? 'Upload once, check the extracted facts, and save your Career Profile. Reuse it for your CVs, letters and interview preparation.'
                  : nextAction.body}
          </p>
        </div>
        {loadError ? (
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 shrink-0 rounded-ctl bg-white px-5 py-3 text-sm font-semibold text-teal">
            Try again
          </button>
        ) : !ready ? null : firstRun ? (
          <div className="flex shrink-0 flex-col gap-2 sm:w-[250px]">
            <Link href="/profile?import=upload" className={GOLD_CTA}>
              Upload my CV
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/profile?import=paste" className={GHOST_CTA}>
                Paste text
              </Link>
              <Link href="/profile" className={GHOST_CTA}>
                Type it in
              </Link>
            </div>
            <span className="text-center text-[12px] text-teal-soft/80">PDF or Word file</span>
          </div>
        ) : (
          <Link href={nextAction.href} className={GOLD_CTA}>
            {nextAction.cta}
          </Link>
        )}
      </div>
    </section>
  )
}

const GOLD_CTA =
  'inline-flex min-h-12 shrink-0 items-center justify-center rounded-ctl bg-gold px-6 type-button text-ink transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-teal'
const GHOST_CTA =
  'inline-flex min-h-11 items-center justify-center rounded-ctl border border-white/35 px-3 text-[13.5px] font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
