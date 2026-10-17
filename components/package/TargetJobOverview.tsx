import { Target } from 'lucide-react'
import { readMatchReport } from '@/components/optimizer/MatchResult'
import { PERSONA_INDUSTRIES } from '@/lib/utils'
import type { Package } from '@/types/package'

/** Job context stays visible even for saved resumes without legacy AI fields. */
export function TargetJobOverview({ pkg }: { pkg: Package }) {
  const description = pkg.job_description?.trim() ?? ''
  const report = readMatchReport(pkg.match_report)
  const typical = !description && report?.advert_source === 'typical'
    ? report.typical_advert?.trim() ?? ''
    : ''
  const industry = PERSONA_INDUSTRIES.find((item) => item.value === pkg.target_industry)?.label
  const level = pkg.optimization_level.charAt(0).toUpperCase() + pkg.optimization_level.slice(1)

  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-card border border-teal/40 bg-teal-soft p-4">
      <h2 className="flex items-center gap-2 type-label font-semibold text-teal">
        <Target className="size-4 shrink-0" aria-hidden="true" />
        Target job title
      </h2>
      <p className="break-words font-display text-[20px] leading-tight text-ink">{pkg.target_job_title}</p>
      <p className="type-helper text-ink-soft">
        {[pkg.target_company, industry, `${level} optimization`].filter(Boolean).join(' · ')}
      </p>
      <p className="type-label text-ink">
        {description ? 'Optimized based on your job title and job description.' : 'Optimized based on job title only. No job description was provided.'}
      </p>
      {description || typical ? (
        <details className="min-w-0">
          <summary className="flex min-h-11 cursor-pointer items-center type-label font-semibold text-teal underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
            {description ? 'Job description — view details' : 'Typical Gulf requirements used — view details'}
          </summary>
          <div className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-ctl border border-teal/20 bg-white p-3 type-label leading-relaxed text-ink-soft">
            {description || typical}
          </div>
        </details>
      ) : null}
    </article>
  )
}
