import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * ProgressBar — determinate or indeterminate progress. Props, ARIA state,
 * clamping, timing, and sweep behavior are unchanged; only visual tokens are
 * from Design B (navy & gold, 2026-10-23).
 *
 * COLOUR MEANS PROGRESS, NOT DANGER. The fill starts NEUTRAL grey and turns
 * gold as it grows, then green when complete — it is never red at zero, so an
 * empty bar reads as "not started", not "something is wrong".
 *   <30%   neutral grey        (bg-edge)
 *   30–79% gold                (bg-gold)
 *   80–100% done green         (bg-ok)
 */
export interface ProgressBarProps {
  /** 0–100. Ignored (aria shows no value) when indeterminate. */
  value?: number
  indeterminate?: boolean
  /** Optional human-readable label for the current value, for a11y. */
  getValueLabel?: (value: number) => string
  tone?: 'light' | 'dark'
  className?: string
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value = 0, indeterminate = false, getValueLabel, tone = 'light', className }, ref) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)))
    const isDark = tone === 'dark'
    const fillClass = isDark
      ? clamped < 30
        ? 'bg-white/45'
        : clamped < 80
          ? 'bg-gold'
          : 'bg-ok'
      : clamped < 30
        ? 'bg-edge'
        : clamped < 80
          ? 'bg-gold'
          : 'bg-ok'

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuetext={getValueLabel ? getValueLabel(clamped) : undefined}
        className={cn(
          'relative h-1.5 w-full overflow-hidden rounded-full font-redesign-sans',
          isDark ? 'bg-white/15' : 'bg-paper',
          className
        )}
      >
        {indeterminate ? (
          <div
            className={cn(
              'absolute inset-y-0 left-0 w-2/5 animate-sweep rounded-full bg-gradient-to-r from-transparent to-transparent motion-reduce:animate-none',
              isDark ? 'via-gold/80' : 'via-gold/80'
            )}
          />
        ) : (
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
              isDark ? `${fillClass} shadow-redesign-cta-glow` : fillClass
            )}
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

export { ProgressBar }
