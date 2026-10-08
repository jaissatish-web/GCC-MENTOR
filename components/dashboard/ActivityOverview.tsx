import Link from 'next/link'
import { BriefcaseIcon, EnvelopeIcon, QuestionMarkCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import { cn, PACKAGE_STATUSES } from '@/lib/utils'
import { coveragePercent, type DashboardOverview } from '@/lib/dashboardOverview'

const SERVICES = [
  { key: 'resume_count', label: 'Resumes', href: '/dashboard/library', cta: 'Open resumes', icon: BriefcaseIcon, color: 'bg-indigo-50 text-indigo-700' },
  { key: 'cover_letter_count', label: 'Cover letters', href: '/cover-letter', cta: 'Open cover letters', icon: EnvelopeIcon, color: 'bg-violet-50 text-violet-700' },
  { key: 'qa_set_count', label: 'Q&A sets', href: '/interview-qa', cta: 'Open interview Q&A', icon: QuestionMarkCircleIcon, color: 'bg-cyan-50 text-cyan-700' },
  { key: 'mock_interview_count', label: 'Mock interviews', href: '/mock-interview', cta: 'Open mock interviews', icon: ChatBubbleLeftRightIcon, color: 'bg-orange-50 text-orange-700' },
] as const

export function ActivityOverview({ overview, loading, error, onRetry }: {
  overview: DashboardOverview | null
  loading: boolean
  error: boolean
  onRetry: () => void
}) {
  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="activity-heading" className="type-section text-ink">Your saved activity</h2>
          <p className="mt-1 type-helper text-ink-muted">Your totals at a glance. Open a service to continue.</p>
        </div>
        <Link href="/dashboard/library" className={buttonVariants({ variant: 'primary', size: 'sm' })}>Open Resume Library</Link>
      </div>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-alert/30 bg-alert-soft p-4">
          <p className="type-helper text-alert">Your activity totals could not be loaded.</p>
          <button type="button" onClick={onRetry} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>Retry activity totals</button>
        </div>
      ) : null}
      <div aria-busy={loading} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {SERVICES.map((service) => {
          const Icon = service.icon
          return (
            <Link key={service.key} href={service.href} className="flex min-w-0 flex-col gap-2 rounded-card border border-line bg-white p-4 shadow-m-1 transition-colors hover:border-teal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal sm:p-5">
              <span aria-hidden="true" className={cn('flex size-10 items-center justify-center rounded-xl', service.color)}><Icon className="size-5" /></span>
              <span className="type-card text-ink">{service.label}</span>
              <span className={cn('font-display text-[32px] font-bold leading-none text-ink', loading && 'animate-pulse')}>
                {overview && !error ? overview[service.key].toLocaleString('en-IN') : '—'}
              </span>
              <span className="min-h-9 text-[12px] leading-snug text-ink-muted">
                {service.key === 'resume_count' && overview && !error
                  ? `${overview.profile_resume_count} Career Profile · ${overview.optimized_resume_count} optimized`
                  : service.key === 'mock_interview_count' && overview && !error
                    ? `${overview.mock_completed_count} completed · ${overview.mock_in_progress_count} in progress`
                    : service.key === 'qa_set_count' ? 'Saved question-and-answer sets' : service.key === 'cover_letter_count' ? 'Saved letters in every tone' : 'Your profile and tailored CVs'}
              </span>
              <span className="mt-auto text-[12.5px] font-semibold text-teal">{service.cta} <span aria-hidden="true">→</span></span>
            </Link>
          )
        })}
      </div>
      <p className="type-helper text-ink-muted">Counts show currently saved items, including Career Profile preparation. They are not credit usage or lifetime generation totals.</p>
    </section>
  )
}

export function OverallProgress({ overview }: { overview: DashboardOverview }) {
  const coverage = [
    { label: 'Resumes with a cover letter', value: overview.resumes_with_letter, href: '/cover-letter', color: 'bg-violet-600' },
    { label: 'Resumes with interview Q&A', value: overview.resumes_with_qa, href: '/interview-qa', color: 'bg-cyan-600' },
    { label: 'Resumes with a completed mock', value: overview.resumes_with_mock, href: '/mock-interview', color: 'bg-orange-600' },
  ]
  return (
    <section aria-labelledby="overall-progress-heading" className="flex flex-col gap-4">
      <h2 id="overall-progress-heading" className="type-section text-ink">Your progress report</h2>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-card border border-line bg-white p-5 shadow-m-1 sm:p-6">
          <h3 className="type-card text-ink">Preparation coverage</h3>
          <p className="mt-1 type-helper text-ink-muted">Across your {overview.resume_count} available resumes.</p>
          {overview.resume_count === 0 ? <p className="mt-4 type-body text-ink-soft">Save your Career Profile to start building your resume and preparation.</p> : null}
          <div className="mt-5 flex flex-col gap-5">
            {coverage.map((item) => (
              <Link key={item.label} href={item.href} className="rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
                <span className="flex items-start justify-between gap-3 text-[13px] text-ink-soft">
                  <span>{item.label}</span><span className="shrink-0 font-semibold text-ink">{item.value} / {overview.resume_count}</span>
                </span>
                <span role="progressbar" aria-label={item.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={coveragePercent(item.value, overview.resume_count)} aria-valuetext={`${item.value} of ${overview.resume_count} resumes`} className="mt-2 block h-2 overflow-hidden rounded-full bg-canvas">
                  <span className={cn('block h-full rounded-full', item.color)} style={{ width: `${coveragePercent(item.value, overview.resume_count)}%` }} />
                </span>
              </Link>
            ))}
          </div>
          {overview.draft_resume_count > 0 ? <Link href="/dashboard/library" className="mt-5 block type-helper font-semibold text-teal">{overview.draft_resume_count} tailored resume{overview.draft_resume_count === 1 ? '' : 's'} still to build →</Link> : null}
        </div>
        <div className="flex flex-col rounded-card border border-line bg-white p-5 shadow-m-1 sm:p-6">
          <h3 className="type-card text-ink">Interview practice</h3>
          <dl className="mt-5 grid grid-cols-2 gap-4">
            <div><dt className="type-helper text-ink-muted">Completed reports</dt><dd className="mt-1 font-display text-[28px] font-bold text-ink">{overview.mock_completed_count}</dd></div>
            <div><dt className="type-helper text-ink-muted">In progress</dt><dd className="mt-1 font-display text-[28px] font-bold text-ink">{overview.mock_in_progress_count}</dd></div>
          </dl>
          <p className="mt-5 type-helper text-ink-muted">Average saved report score</p>
          <p className="mt-1 font-display text-[28px] font-bold text-ink">{overview.average_mock_score === null ? 'No scored reports yet' : `${overview.average_mock_score} / 100`}</p>
          <p className="mt-2 type-helper text-ink-muted">Practice feedback helps you prepare. It does not predict hiring decisions.</p>
          <Link href="/mock-interview" className="mt-5 type-helper font-semibold text-teal">Continue interview practice →</Link>
        </div>
      </div>
      <div className="rounded-card border border-line bg-white p-5 shadow-m-1 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="type-card text-ink">Application status</h3>
          <Link href="/dashboard/library" className="type-helper font-semibold text-teal">Manage in Resume Library →</Link>
        </div>
        <p className="mt-1 type-helper text-ink-muted">{overview.target_job_count} target jobs. Career Profile Resume is separate from applications.</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PACKAGE_STATUSES.map((stage) => <div key={stage.value} className="min-w-0 rounded-ctl bg-canvas p-3"><dt className="text-[12px] leading-snug text-ink-muted">{stage.label}</dt><dd className="mt-1 text-xl font-semibold text-ink">{overview.stages[stage.value]}</dd></div>)}
        </dl>
      </div>
    </section>
  )
}
