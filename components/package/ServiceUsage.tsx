'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ServiceUsageCounts, ServiceUsageResponse } from '@/app/api/service-usage/route'

/**
 * HOW MANY TIMES EACH SERVICE HAS BEEN USED (founder request 2026-09-17).
 *
 * Totals across every saved CV for the dashboard, and one line per CV in the
 * Resume Library. One request per screen (GET /api/service-usage), counted from
 * each package's own service history — one event per generation, so a
 * regenerated Q&A set counts twice.
 */

export function useServiceUsage(): { usage: ServiceUsageResponse | null; failed: boolean } {
  const [usage, setUsage] = useState<ServiceUsageResponse | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let live = true
    fetch('/api/service-usage', { cache: 'no-store' })
      .then((r) => (r.ok ? (r.json() as Promise<ServiceUsageResponse>) : Promise.reject(new Error(String(r.status)))))
      .then((data) => live && setUsage(data))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])
  return { usage, failed }
}

const ITEMS: ReadonlyArray<{ key: keyof ServiceUsageCounts; label: string; icon: string; tone: string }> = [
  { key: 'cv', label: 'CVs optimized', icon: '📄', tone: 'text-teal' },
  { key: 'cover_letter', label: 'Cover letters', icon: '✉️', tone: 'text-sec-summary' },
  { key: 'qa', label: 'Interview Q&A sets', icon: '💬', tone: 'text-sec-status' },
  { key: 'mock_started', label: 'Mock interviews', icon: '🎤', tone: 'text-sec-experience' },
]

/** The totals strip: how much of each service this user has used so far. */
export function ServiceUsageTotals({ usage, className }: { usage: ServiceUsageResponse | null; className?: string }) {
  if (!usage) return null
  const { totals } = usage
  const any = ITEMS.some((i) => totals[i.key] > 0)
  return (
    <section aria-label="Services you have used" className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-muted">Services you have used</span>
        <span className="text-[12px] font-medium text-ink-muted">
          {usage.packages} saved CV{usage.packages === 1 ? '' : 's'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ITEMS.map((i) => (
          <div key={i.key} className="flex flex-col gap-0.5 rounded-card border border-line bg-white px-3 py-2.5">
            <span className={cn('text-[12px] font-semibold', i.tone)}>
              <span aria-hidden="true">{i.icon}</span> {i.label}
            </span>
            <span className="font-mono text-[20px] font-bold leading-none text-ink">{totals[i.key]}</span>
          </div>
        ))}
      </div>
      {!any ? (
        <p className="text-[12px] text-ink-muted">Nothing used yet. Your counts appear here as you optimize CVs and prepare for interviews.</p>
      ) : (
        <p className="text-[12px] text-ink-muted">
          Counted per generation, across all your saved CVs
          {totals.mock_completed > 0 ? ` · ${totals.mock_completed} mock interview report${totals.mock_completed === 1 ? '' : 's'} saved` : ''}
          {totals.pdf > 0 ? ` · ${totals.pdf} PDF download${totals.pdf === 1 ? '' : 's'}` : ''}.
        </p>
      )}
    </section>
  )
}

/** One CV's usage, for a Resume Library card. */
export function ServiceUsageLine({ counts }: { counts: ServiceUsageCounts | undefined }) {
  if (!counts) return null
  const used = counts.cover_letter + counts.qa + counts.mock_started
  return (
    <p className="text-[12px] text-ink-muted">
      {used === 0 ? (
        'No services used for this CV yet'
      ) : (
        <>
          <strong className="text-ink">Used {used} time{used === 1 ? '' : 's'}:</strong>{' '}
          {counts.cover_letter} cover letter{counts.cover_letter === 1 ? '' : 's'} · {counts.qa} Q&amp;A set
          {counts.qa === 1 ? '' : 's'} · {counts.mock_started} mock interview{counts.mock_started === 1 ? '' : 's'}
        </>
      )}
    </p>
  )
}
