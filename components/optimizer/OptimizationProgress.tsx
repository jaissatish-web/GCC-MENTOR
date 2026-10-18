import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { ProcessingOrbit } from '@/components/ui/Processing'

/** Only request boundaries advance this view. Elapsed time never completes a step. */
export function OptimizationProgress({ phase, analysisReady, steps }: {
  phase: 'analysis' | 'build' | 'opening'; analysisReady: boolean | null; steps: readonly string[]
}) {
  const active = phase === 'analysis' ? 0 : phase === 'build' ? 1 : 2
  const labels = [
    analysisReady === false ? 'Using your saved job details' : 'Reviewing your job details',
    'Building and checking your resume',
    'Opening your saved result',
  ]
  return <section aria-label="Resume optimization progress" className="rounded-card border border-line bg-white p-4 sm:p-7">
    <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:gap-5 sm:text-left">
      <ProcessingOrbit size={96} />
      <div className="min-w-0"><p className="type-helper font-semibold uppercase tracking-wider text-teal">Your experience. Clearly presented.</p><h2 className="mt-1 font-display type-section text-ink">Preparing your optimized resume</h2><p className="mt-2 type-helper leading-relaxed text-ink-soft">Keep this page open. Your result opens here when it is ready.</p></div>
    </div>
    <p role="status" aria-live="polite" className="mt-5 rounded-ctl bg-teal-soft px-4 py-3 type-label font-semibold text-teal">{labels[active]}…</p>
    <ol className="mt-4 flex flex-col gap-3" aria-label="Optimization stages">
      {labels.map((label, index) => {
        const done = index < active && !(index === 0 && analysisReady === false)
        return <li key={index} aria-current={index === active ? 'step' : undefined} className="flex min-w-0 items-center gap-3 rounded-ctl border border-line p-3 type-helper text-ink-soft">
          {done ? <CheckCircleIcon className="size-5 shrink-0 text-teal" aria-hidden="true" /> : <ClockIcon className={`size-5 shrink-0 ${index === active ? 'text-teal' : 'text-ink-muted'}`} aria-hidden="true" />}
          <span className="min-w-0 flex-1 break-words">{label}</span><span className="shrink-0 type-caption">{done ? 'Complete' : index === active ? 'In progress' : index === 0 && analysisReady === false ? 'Continuing' : 'Waiting'}</span>
        </li>
      })}
    </ol>
    <details className="mt-4 rounded-ctl border border-line px-3">
      <summary className="min-h-11 cursor-pointer py-3 type-helper font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">Included in this optimization</summary>
      <ul className="mb-3 list-disc space-y-2 pl-5 type-helper leading-relaxed text-ink-soft">{steps.map(step => <li key={step}>{step}</li>)}</ul>
    </details>
    <p className="mt-4 type-helper leading-relaxed text-ink-soft">Preparation time varies. Progress changes when a stage finishes.</p>
  </section>
}
