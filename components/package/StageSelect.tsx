'use client'

import { cn, PACKAGE_STATUSES } from '@/lib/utils'
import type { PackageStatus } from '@/types/package'

/**
 * Where an application stands — applied → shortlisted → interview →
 * visa_processing → offer.
 *
 * SHARED, because it appears both on the Target Jobs list and on a job's own
 * page. Copying it would have guaranteed the two drifted, and a stage that
 * looks different depending on which screen you changed it from is worse than
 * one you can only change in one place.
 *
 * A NATIVE <select>. On a phone that opens the platform's own picker, which is
 * reachable, scrollable and familiar; a custom dropdown here would buy styling
 * and cost all three.
 *
 * THE PARENT OWNS THE WRITE. This reports the new value and nothing else — the
 * optimistic update, the PUT and the revert-on-failure stay with whoever holds
 * the data, so this cannot half-succeed on its own.
 *
 * COLOUR IS A PROGRESSION, not five decorations. Neutral while it is only sent;
 * the brand tint once someone has responded; gold at the interview, which is
 * the one stage that asks something of the user; then solid as it becomes
 * official and green when it is won. That ordering is the point — a glance
 * down the list should read as movement.
 *
 * REBUILT FOR MERIDIAN 2026-09-09. Under Blueprint this used `signal-tint` for
 * BOTH shortlisted and interview, told apart only by a sand fill — so a
 * mechanical palette swap collapsed shortlisted and offer onto the same teal
 * and made three stages look alike. Every pair is measured:
 *   ink-soft on canvas      8.32    applied
 *   teal on teal-soft       8.30    shortlisted
 *   gold-ink on gold-soft   4.83    interview
 *   white on teal           9.84    visa processing
 *   white on ok             6.12    offer
 * `gold` itself is 2.66 on white and is a FILL only — the interview stage
 * reads because it uses `gold-ink`, never `gold`.
 */

export function stageClass(status: PackageStatus): string {
  const map: Record<PackageStatus, string> = {
    applied: 'border-line-strong bg-canvas text-ink-soft',
    shortlisted: 'border-teal/35 bg-teal-soft text-teal',
    interview: 'border-gold/50 bg-gold-soft text-gold-ink',
    visa_processing: 'border-teal bg-teal text-white',
    offer: 'border-ok bg-ok text-white',
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
        'min-h-11 cursor-pointer rounded-full border px-[11px] py-[6px] text-[12px] font-semibold leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2',
        stageClass(value),
        className
      )}
    >
      {PACKAGE_STATUSES.map((s) => (
        <option key={s.value} value={s.value} className="bg-white text-ink-soft">
          {s.label} ▾
        </option>
      ))}
    </select>
  )
}
