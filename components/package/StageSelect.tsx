'use client'

import { cn, PACKAGE_STATUSES } from '@/lib/utils'
import type { PackageStatus } from '@/types/package'

/**
 * Where an application stands — applied → shortlisted → interview →
 * visa_processing → offer.
 *
 * SHARED, because it now appears in two places. It was written inline on the
 * Target Jobs list; when the same control was needed on a job's own page
 * (2026-09-09) copying it would have guaranteed the two drifted, and a stage
 * that looks different depending on which screen you changed it from is worse
 * than one you can only change in one place.
 *
 * A NATIVE <select>. On a phone that opens the platform's own picker, which is
 * reachable, scrollable and familiar; a custom dropdown here would buy styling
 * and cost all three.
 *
 * THE PARENT OWNS THE WRITE. This reports the new value and nothing else — the
 * optimistic update, the PUT and the revert-on-failure stay with whoever holds
 * the data, so this cannot half-succeed on its own.
 *
 * COLOURS. Five stages have to be told apart at a glance, and `signal` may
 * only be spent on the one that means "act". So the scale runs neutral →
 * signal → sand → navy → filled signal. Measured, because two pairs are new:
 *   graphite-soft on paper       7.03    applied
 *   signal-ink on signal-tint    6.22    shortlisted
 *   signal-ink on bp-sand        5.62    interview
 *   bp-navy on bp-navy-tint     10.86    visa processing
 *   white on signal              5.18    offer
 * `signal` on `bp-sand` is 3.99 and would have failed — `signal-ink` is why
 * the interview stage is readable.
 */

export function stageClass(status: PackageStatus): string {
  const map: Record<PackageStatus, string> = {
    applied: 'border-edge-strong bg-paper text-graphite-soft',
    shortlisted: 'border-signal/50 bg-signal-tint text-signal-ink',
    interview: 'border-bp-sand-line bg-bp-sand text-signal-ink',
    visa_processing: 'border-bp-navy/30 bg-bp-navy-tint text-bp-navy',
    offer: 'border-signal bg-signal text-white',
  }
  return map[status]
}

export function StageSelect({
  value,
  onChange,
  className,
}: {
  value: PackageStatus
  onChange: (next: PackageStatus) => void
  className?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => {
        const next = e.target.value as PackageStatus
        if (next !== value) onChange(next)
      }}
      aria-label="Application stage"
      className={cn(
        'min-h-11 cursor-pointer rounded-full border px-[11px] py-[6px] text-[12px] font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2',
        stageClass(value),
        className
      )}
    >
      {PACKAGE_STATUSES.map((s) => (
        <option key={s.value} value={s.value} className="bg-white text-graphite-soft">
          {s.label} ▾
        </option>
      ))}
    </select>
  )
}
