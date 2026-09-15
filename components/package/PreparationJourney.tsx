import Link from 'next/link'
import type { Package } from '@/types/package'
import { cn } from '@/lib/utils'

type Step = 'resume' | 'letter' | 'qa' | 'mock' | 'report'

/** Uses saved artifacts only; navigation never generates or changes a package. */
export function PreparationJourney({ pkg, current }: { pkg: Package; current: Step }) {
  const id = encodeURIComponent(pkg.id)
  const report = [...(pkg.mock_interview_runs ?? [])]
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
    .find((run) => run.status === 'completed' && run.final_report)
  const cvReady = pkg.optimized_content != null
  const steps = [
    { key: 'resume', label: 'Resume', ready: cvReady, href: `/package/${id}` },
    { key: 'letter', label: 'Cover letter', ready: Boolean(pkg.cover_letters?.length), href: `/cover-letter?package=${id}` },
    { key: 'qa', label: 'Q&A', ready: Boolean(pkg.interview_questions?.questions?.length), href: `/interview-qa?package=${id}` },
    { key: 'mock', label: 'Mock interview', ready: Boolean(report), href: `/mock-interview?package=${id}` },
    { key: 'report', label: 'Report', ready: Boolean(report), href: report ? `/mock-interview?package=${id}&run=${encodeURIComponent(report.id)}#interview-report` : null },
  ]
  return (
    <nav aria-label="Application preparation" className="mt-4 rounded-card border border-line bg-white p-4 shadow-m-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-words text-sm font-semibold text-ink">{pkg.name || pkg.target_job_title}{pkg.target_company ? ` · ${pkg.target_company}` : ''}</p>
        <Link href={`/package/${id}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-teal underline underline-offset-4">Open workspace</Link>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {steps.map((step, index) => {
          const available = step.key === 'resume' || (cvReady && step.href !== null)
          const content = <><span className="block text-sm font-semibold">{index + 1}. {step.label}</span><span className="mt-1 block text-xs">{step.ready ? 'Saved' : step.key === 'report' ? 'After practice' : !available ? 'Build resume first' : 'To prepare'}</span></>
          return <li key={step.key} className="min-w-0">{available && step.href ? (
            <Link href={step.href} aria-current={current === step.key ? 'step' : undefined} className={cn('block min-h-16 rounded-ctl border p-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal', current === step.key ? 'border-teal bg-teal-soft text-teal' : 'border-line text-ink-soft hover:bg-canvas')}>{content}</Link>
          ) : <div className="min-h-16 rounded-ctl border border-dashed border-line p-3 text-ink-muted">{content}</div>}</li>
        })}
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">Each step stays with this job. Prepare what you need; you can return to saved work at any time.</p>
    </nav>
  )
}
