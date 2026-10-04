'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * The ring that shows a 0–100 score on the Career Profile (2026-10-04).
 *
 * Used by both cards on the profile overview — Profile complete and Gulf
 * Readiness — and by the two detail screens they open. One ring, one geometry,
 * so the two numbers look like the same kind of thing while their colour and
 * suffix say which one is which.
 *
 * `tone` is the score's status, never decoration: teal for profile
 * completeness (the brand's own measure), ok / gold / alert for the Gulf
 * verdict. Those are the status tokens, so a ring never claims "good" in a
 * colour that means something else elsewhere.
 */

export type RingTone = 'teal' | 'ok' | 'gold' | 'alert'

const STROKE: Record<RingTone, string> = {
  teal: 'stroke-teal',
  ok: 'stroke-ok',
  gold: 'stroke-gold',
  alert: 'stroke-alert',
}

const R = 42
const CIRCUMFERENCE = 2 * Math.PI * R

export function ScoreRing({
  value,
  size = 88,
  tone = 'teal',
  suffix = '%',
  label,
  className,
}: {
  /** 0–100. Null while the score is still being worked out: shows "—", never 0. */
  value: number | null
  size?: number
  tone?: RingTone
  /** '%' for completeness, '/100' for a score out of 100. */
  suffix?: '%' | '/100'
  /** What the number is, for screen readers. */
  label: string
  className?: string
}) {
  const clamped = value === null ? 0 : Math.max(0, Math.min(100, Math.round(value)))
  // Starts empty and fills on mount, like the header ring.
  const [offset, setOffset] = useState(CIRCUMFERENCE)
  useEffect(() => {
    setOffset(CIRCUMFERENCE * (1 - clamped / 100))
  }, [clamped])

  const big = size >= 110
  return (
    <div
      role="img"
      aria-label={value === null ? `${label}: not worked out yet` : `${label}: ${clamped}${suffix === '%' ? ' percent' : ' out of 100'}`}
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" strokeWidth="9" className="stroke-ink/[0.08]" />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={cn(STROKE[tone], 'transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none')}
        />
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('font-mono font-semibold tabular-nums text-ink', big ? 'text-[34px]' : size >= 80 ? 'text-[22px]' : 'text-[18px]')}>
          {value === null ? '—' : clamped}
          {suffix === '%' && value !== null ? <span className={big ? 'text-[18px]' : 'text-[12px]'}>%</span> : null}
        </span>
        {suffix === '/100' ? <span className="mt-0.5 text-[12px] font-medium text-ink-muted">/100</span> : null}
      </span>
    </div>
  )
}
