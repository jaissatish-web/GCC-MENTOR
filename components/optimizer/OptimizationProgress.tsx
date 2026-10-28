import { ProcessingOrbit, ProcessingSteps } from '@/components/ui/Processing'
import { GENERATE_NOTES } from '@/lib/processingNotes'

/** Only request boundaries advance completion. Elapsed time never completes a step. */
export function OptimizationProgress({ phase, analysisReady, steps }: {
  phase: 'analysis' | 'build' | 'opening'; analysisReady: boolean | null; steps: readonly string[]
}) {
  const active = phase === 'analysis' ? 0 : phase === 'build' ? 1 : 2
  const labels = [
    analysisReady === false ? 'Using your saved job details' : 'Reviewing your job details',
    'Building and checking your resume',
    'Opening your saved result',
  ]
  const confirmed = active > 1 ? [0, 1] : active > 0 ? [0] : []
  return <section aria-label="Resume optimization progress" className="rounded-card border border-line bg-white p-4 sm:p-7">
    <div className="mx-auto flex w-full max-w-[460px] flex-col items-center gap-5 text-center">
      <ProcessingOrbit size={160} glyph="AI" />
      <div className="min-w-0"><p className="type-helper font-semibold uppercase tracking-wider text-teal">Your experience. Clearly presented.</p><h2 className="mt-1 font-display type-section text-ink">Preparing your optimized resume</h2><p className="mt-2 type-helper leading-relaxed text-ink-soft">Keep this page open. Your result opens here when it is ready.</p></div>
      <ProcessingSteps steps={labels} activeIndex={active} completedIndices={confirmed} notes={GENERATE_NOTES} />
    </div>
    <details className="mt-4 rounded-ctl border border-line px-3">
      <summary className="min-h-11 cursor-pointer py-3 type-helper font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">Included in this optimization</summary>
      <ul className="mb-3 list-disc space-y-2 pl-5 type-helper leading-relaxed text-ink-soft">{steps.map(step => <li key={step}>{step}</li>)}</ul>
    </details>
    <p className="mt-4 type-helper leading-relaxed text-ink-soft">Preparation time varies. Green ticks appear when a stage finishes.</p>
  </section>
}
