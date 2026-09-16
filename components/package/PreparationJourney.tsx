import Link from 'next/link'
import { cn } from '@/lib/utils'
import { completedReportRunId, cvReady as isCvReady, letterCount, qaReady, type PackageListItem } from '@/lib/packageSummary'

type Step = 'resume' | 'letter' | 'qa' | 'mock' | 'report'

/**
 * Uses saved artifacts only; navigation never generates or changes a package.
 * Accepts a full package or a list summary (audit M08) — every step is a flag.
 */
export function PreparationJourney({ pkg, current }: { pkg: PackageListItem; current: Step }) {
  const id = encodeURIComponent(pkg.id)
  const reportRunId = completedReportRunId(pkg)
  const cvReady = isCvReady(pkg)
  const steps = [
    { key: 'resume', label: 'Resume', ready: cvReady, href: `/package/${id}` },
    { key: 'letter', label: 'Cover letter', ready: letterCount(pkg) > 0, href: `/cover-letter?package=${id}` },
    { key: 'qa', label: 'Q&A', ready: qaReady(pkg), href: `/interview-qa?package=${id}` },
    { key: 'mock', label: 'Mock interview', ready: Boolean(reportRunId), href: `/mock-interview?package=${id}` },
    { key: 'report', label: 'Report', ready: Boolean(reportRunId), href: reportRunId ? `/mock-interview?package=${id}&run=${encodeURIComponent(reportRunId)}#interview-report` : null },
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
      <p className="mt-3 text-xs leading-relaxed text-ink-muted">Each step stays with this job. Preparing a CV does not mark it as applied — set the application stage in your Resume Library when you apply.</p>
    </nav>
  )
}
