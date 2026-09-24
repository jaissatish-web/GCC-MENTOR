'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'
import { cn, GULF_COUNTRIES } from '@/lib/utils'
import { CTA, NAMES } from '@/lib/serviceLabels'
import { readMatchReport } from '@/components/optimizer/MatchResult'
import { completedReportRunId, cvReady as isCvReady, isSummary, letterCount, qaReady, type PackageListItem } from '@/lib/packageSummary'

type Step = 'resume' | 'letter' | 'qa' | 'mock' | 'report'

/**
 * THE JOB THIS SCREEN IS FOR, AND HOW FAR ITS PACK HAS GOT — in one card.
 *
 * 2026-09-24 simplification. This used to be two stacked cards: a target-job
 * card with a note, then a five-tile grid ("1. Optimized CV · Saved" …) and a
 * paragraph about application stages. On a phone that was ~650px before the
 * service's own form began, and the founder's read was that people could not
 * tell what to do. Now: the job, its ATS score, and four chips — done, here,
 * to do — each a link to that step. The mock report is part of "Mock".
 *
 * Uses saved artifacts only; navigation never generates or changes a package.
 * Accepts a full package or a list summary (audit M08) — every step is a flag.
 */
export function PreparationJourney({
  pkg,
  current,
  bare = false,
}: {
  pkg: PackageListItem
  current: Step
  /** Inside a service's own form card: no border of its own, no repeated job title. */
  bare?: boolean
}) {
  const id = encodeURIComponent(pkg.id)
  const reportRunId = completedReportRunId(pkg)
  const cvReady = isCvReady(pkg)
  const full = isSummary(pkg) ? null : pkg
  const report = full ? readMatchReport(full.match_report) : null
  const before = report?.before.total
  const after = report?.after?.total
  const description = full?.job_description?.trim() ?? ''
  const [open, setOpen] = useState(false)
  const country = GULF_COUNTRIES.find((c) => c.value === pkg.target_country && c.value !== 'generic_gulf')?.label

  const steps: Array<{ key: Step; label: string; ready: boolean; href: string }> = [
    { key: 'resume', label: 'CV', ready: cvReady, href: `/package/${id}` },
    { key: 'letter', label: 'Letter', ready: letterCount(pkg) > 0, href: `/cover-letter?package=${id}` },
    { key: 'qa', label: 'Q&A', ready: qaReady(pkg), href: `/interview-qa?package=${id}` },
    {
      key: 'mock',
      label: 'Mock',
      ready: Boolean(reportRunId),
      href: reportRunId ? `/mock-interview?package=${id}&run=${encodeURIComponent(reportRunId)}#interview-report` : `/mock-interview?package=${id}`,
    },
  ]
  const here: Step = current === 'report' ? 'mock' : current

  return (
    <section aria-label={NAMES.targetJob} className={bare ? '' : 'rounded-card border border-line bg-white p-4 shadow-m-1'}>
      <div className={cn('flex items-start justify-between gap-3', bare && 'sr-only')}>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-muted">{NAMES.targetJob}</p>
          <p className="mt-0.5 break-words font-display text-[18px] leading-tight text-ink">{pkg.name || pkg.target_job_title}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-ink-soft">
            {[pkg.target_company, country].filter(Boolean).join(' · ')}
            {typeof before === 'number' && typeof after === 'number' ? (
              <span className="inline-flex items-center gap-1 font-semibold">
                {pkg.target_company || country ? <span aria-hidden="true">·</span> : null}
                ATS <span className="font-mono text-ink-muted">{before}</span>
                <span aria-hidden="true">→</span>
                <span className="font-mono text-teal">{after}</span>
              </span>
            ) : null}
          </p>
        </div>
        {here !== 'resume' ? (
          <Link href={`/package/${id}`} className="shrink-0 text-[13px] font-semibold text-teal underline-offset-4 hover:underline">
            {CTA.viewOptimizedCv}
          </Link>
        ) : null}
      </div>

      {bare && typeof before === 'number' && typeof after === 'number' ? (
        <p className="text-[13px] text-ink-soft">
          ATS <span className="font-mono text-ink-muted">{before}</span> → <span className="font-mono font-semibold text-teal">{after}</span>
          {here !== 'resume' ? (
            <>
              {' · '}
              <Link href={`/package/${id}`} className="font-semibold text-teal underline-offset-4 hover:underline">
                {CTA.viewOptimizedCv}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
      <ol aria-label="This job's pack" className={cn('grid grid-cols-4 gap-1.5', bare ? 'mt-2' : 'mt-3')}>
        {steps.map((step) => {
          const isHere = here === step.key
          const locked = step.key !== 'resume' && !cvReady
          const body = (
            <>
              {step.ready ? <CheckIcon className="size-4" aria-hidden="true" /> : <span aria-hidden="true" className={cn('size-2 rounded-full', isHere ? 'bg-teal' : 'bg-line-strong')} />}
              {step.label}
              <span className="sr-only">{step.ready ? ' — done' : isHere ? ' — this step' : ' — to do'}</span>
            </>
          )
          const cls = cn(
            'flex min-h-10 items-center justify-center gap-1.5 rounded-ctl border px-1 text-[13px] font-semibold',
            isHere ? 'border-teal bg-teal-soft text-teal' : step.ready ? 'border-ok/30 bg-ok-soft text-ok' : 'border-line text-ink-muted',
          )
          return (
            <li key={step.key}>
              {locked || isHere ? (
                <span aria-current={isHere ? 'step' : undefined} className={cn(cls, locked && !isHere && 'border-dashed')}>
                  {body}
                </span>
              ) : (
                <Link href={step.href} className={cn(cls, 'hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal')}>
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ol>

      {full ? (
        description ? (
          <div className="mt-2">
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="min-h-10 text-[13px] font-semibold text-teal underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {open ? 'Hide job description' : 'Show job description'}
            </button>
            {open ? (
              <div className="mt-1 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-ctl border border-line bg-canvas p-3 text-[13px] leading-relaxed text-ink-soft">
                {description}
              </div>
            ) : null}
          </div>
        ) : null
      ) : null}
    </section>
  )
}
