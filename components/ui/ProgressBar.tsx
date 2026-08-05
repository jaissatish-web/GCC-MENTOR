import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * ProgressBar — determinate or indeterminate progress.
 *
 * Matches the progress strips in design-reference/MVP Screens.dc.html
 * (lines 534 / 726): 4px track in sand, emerald fill, fully rounded.
 * Determinate: width driven by `value` (0–100). Indeterminate: an
 * emerald/gold sweep (keyframe `sweep`) for the named-step progress
 * screens — never a bare spinner.
 */
export interface ProgressBarProps {
  /** 0–100. Ignored (aria shows no value) when indeterminate. */
  value?: number
  indeterminate?: boolean
  /** Optional human-readable label for the current value, for a11y. */
  getValueLabel?: (value: number) => string
  className?: string
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ value = 0, indeterminate = false, getValueLabel, className }, ref) => {
    const clamped = Math.min(100, Math.max(0, Math.round(value)))

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuetext={getValueLabel ? getValueLabel(clamped) : undefined}
        className={cn(
          'relative h-1 w-full overflow-hidden rounded-full bg-sand',
          className
        )}
      >
        {indeterminate ? (
          <div className="absolute inset-y-0 left-0 w-2/5 animate-sweep rounded-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        ) : (
          <div
            className="h-full rounded-full bg-emerald transition-[width] duration-500 ease-out"
            style={{ width: `${clamped}%` }}
          />
        )}
      </div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

export { ProgressBar }
