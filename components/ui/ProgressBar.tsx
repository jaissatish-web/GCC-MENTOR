import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * ProgressBar — determinate or indeterminate progress.
 *
 * Matches the progress strips in design-reference/MVP Screens.dc.html
 * (lines 534 / 726): 4px track, emerald fill, fully rounded. Determinate:
 * width driven by `value` (0–100). Indeterminate: an emerald/gold sweep
 * (keyframe `sweep`) for the named-step progress screens — never a bare
 * spinner.
 *
 * `tone="light"` (default) is the original sand-track/emerald-fill bar,
 * unchanged, still used by every light screen. `tone="dark"` is the
 * 2026-08-07 dark-dashboard variant: a dark surface track with a gold fill,
 * used for the Readiness Score breakdown bars.
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

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuetext={getValueLabel ? getValueLabel(clamped) : undefined}
        className={cn(
          'relative h-1.5 w-full overflow-hidden rounded-full',
          isDark ? 'bg-surface-2' : 'bg-sand',
          className
        )}
      >
        {indeterminate ? (
          <div
            className={cn(
              'absolute inset-y-0 left-0 w-2/5 animate-sweep rounded-full bg-gradient-to-r from-transparent to-transparent motion-reduce:animate-none',
              isDark ? 'via-gold/50' : 'via-gold/40'
            )}
          />
        ) : (
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
              isDark ? 'bg-gold shadow-glow-gold' : 'bg-emerald'
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
