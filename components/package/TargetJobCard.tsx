'use client'

import { useState } from 'react'
import { cn, PERSONA_INDUSTRIES } from '@/lib/utils'
import { isSummary, type PackageListItem } from '@/lib/packageSummary'
import { readMatchReport } from '@/components/optimizer/MatchResult'
import { NAMES } from '@/lib/serviceLabels'

/**
 * THE TARGET JOB, SHOWN WHEREVER THE JOB IS USED (founder decision 2026-09-17).
 *
 * Every optimization is written against a job title and, when pasted, a job
 * description. Both are saved on the package; this card shows them back — on
 * the results page, in the Resume Library, and on the cover letter, interview
 * Q&A and mock interview screens, which are generated from the same optimized
 * CV and target job — so the user can always see what a document was made for.
 *
 * With a list summary (no description or score loaded) it shows the title and
 * level only; pass a full package for the rest.
 */
export function TargetJobCard({
  pkg,
  note,
  className,
  defaultOpen = false,
}: {
  pkg: PackageListItem
  /** One line on how this screen uses the target job. */
  note?: string
  className?: string
  defaultOpen?: boolean
}) {
  const full = isSummary(pkg) ? null : pkg
  const description = full?.job_description?.trim() ?? ''
  const report = full ? readMatchReport(full.match_report) : null
  const after = report?.after?.total
  const before = report?.before.total
  const estimate = report?.mode === 'target_title_only'
  const [open, setOpen] = useState(defaultOpen)
  const facts = [
    pkg.target_company,
    PERSONA_INDUSTRIES.find((i) => i.value === pkg.target_industry)?.label ?? null,
    `${pkg.optimization_level.charAt(0).toUpperCase()}${pkg.optimization_level.slice(1)} optimization`,
  ].filter(Boolean) as string[]

  return (
    <section
      aria-label={NAMES.targetJob}
      className={cn('rounded-card border border-line bg-white p-4 shadow-m-1', className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-muted">{NAMES.targetJob}</p>
          <p className="mt-0.5 break-words font-display text-[18px] leading-tight text-ink">{pkg.target_job_title}</p>
          <p className="mt-1 text-[12.5px] text-ink-soft">{facts.join(' · ')}</p>
        </div>
        {typeof before === 'number' && typeof after === 'number' ? (
          <div className="flex shrink-0 items-center gap-2 rounded-ctl border border-line bg-canvas px-3 py-2">
            <span className="text-[12px] font-semibold text-ink-muted">
              {NAMES.atsScore}
              {estimate ? ' (estimate)' : ''}
            </span>
            <span className="font-mono text-[14px] text-ink-muted">{before}</span>
            <span aria-hidden="true" className="text-ink-muted">→</span>
            <span className="font-mono text-[16px] font-bold text-teal">{after}</span>
            <span className="sr-only">
              before {before}, after {after}
            </span>
          </div>
        ) : null}
      </div>

      {full ? (
        description ? (
          <div className="mt-3">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="min-h-11 text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {open ? `Hide ${NAMES.jobDescription.toLowerCase()}` : `Show ${NAMES.jobDescription.toLowerCase()}`}
            </button>
            {open ? (
              <div className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-ctl border border-line bg-canvas p-3 text-[13px] leading-relaxed text-ink-soft">
                {description}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-[12.5px] text-ink-muted">
            No {NAMES.jobDescription.toLowerCase()} was saved. Everything is based on the {NAMES.jobTitle.toLowerCase()}.
          </p>
        )
      ) : null}

      {note ? <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-ink-soft">{note}</p> : null}
    </section>
  )
}
