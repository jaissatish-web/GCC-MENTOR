import Link from 'next/link'
import type { InterviewProgress as Progress } from '@/lib/interviewProgress'

function change(value: number) { return `${value > 0 ? '+' : ''}${value}` }

export function InterviewProgress({ progress, packageId, compact = false }: { progress: Progress; packageId: string; compact?: boolean }) {
  const overall = progress.metrics[0]
  const improved = progress.metrics.slice(1).filter(m => m.delta !== null && m.delta > 0)
  return <section className="ui-card rounded-card border border-line bg-white p-4 sm:p-6" aria-label="Interview progress report">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="type-section">Interview progress report</h2><p className="mt-1 text-sm text-ink-muted">Mock interview {progress.attemptNumber} · {progress.mode.replaceAll('_', ' ')} · {progress.difficulty} · {progress.questionCount} questions</p></div>
      <span className="shrink-0 rounded-full bg-teal-soft px-3 py-2 text-teal">{overall.score}/100</span>
    </div>
    {progress.previousNumber === null ? <p className="mt-4 text-ink-soft">This is your baseline for these settings and saved resume. Complete another matching interview to compare your progress.</p> : <>
      <p className="mt-4 text-ink-soft">Compared with mock interview {progress.previousNumber}: {overall.delta === 0 ? 'overall score unchanged' : `${change(overall.delta!)} points overall`}. Since your first matching interview: {change(overall.fromFirst!)} points.</p>
      <dl className="mt-4 divide-y divide-line">{progress.metrics.slice(1).map(metric => <div key={metric.key} className="flex flex-wrap justify-between gap-2 py-2"><dt>{metric.label}</dt><dd className={metric.delta! > 0 ? 'text-teal' : metric.delta! < 0 ? 'text-gold-text' : 'text-ink-muted'}>{metric.previous} → {metric.score} <span className="text-sm">({change(metric.delta!)})</span></dd></div>)}</dl>
      <p className="mt-3 text-sm text-ink-muted">{improved.length ? `Improved: ${improved.map(m => m.label.toLowerCase()).join(', ')}.` : 'No score increases in these areas yet. Use the feedback to guide your next practice.'}</p>
    </>}
    {!compact && progress.nextSteps.length > 0 && <div className="mt-4 border-t border-line pt-4"><h3 className="type-card">Practise next</h3><ul className="mt-2 list-disc space-y-2 pl-5">{progress.nextSteps.map((step, i) => <li key={i}>{step}</li>)}</ul></div>}
    <p className="mt-4 text-xs text-ink-muted">Comparisons use the same saved resume, mode, difficulty, question count and scoring rubric. Questions may differ; scores are practice guidance.</p>
    {compact && <Link className="mt-4 inline-flex min-h-11 items-center font-semibold text-teal hover:underline" href={`/mock-interview?package=${encodeURIComponent(packageId)}&run=${encodeURIComponent(progress.selectedId)}`}>View interview history →</Link>}
  </section>
}
