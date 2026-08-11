import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * ProgressBar — determinate or indeterminate progress. Props, ARIA state,
 * clamping, timing, and sweep behavior are unchanged; only visual tokens are
 * from the redesign system.
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
          'relative h-1.5 w-full overflow-hidden rounded-full font-redesign-sans',
          isDark ? 'bg-forest-tint-dark' : 'bg-surface-2-light',
          className
        )}
      >
        {indeterminate ? (
          <div
            className={cn(
              'absolute inset-y-0 left-0 w-2/5 animate-sweep rounded-full bg-gradient-to-r from-transparent to-transparent motion-reduce:animate-none',
              isDark ? 'via-redesign-gold-dark/60' : 'via-redesign-gold/60'
            )}
          />
        ) : (
          <div
            className={cn(
              'h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
              isDark ? 'bg-redesign-gold-dark shadow-redesign-cta-glow' : 'bg-forest'
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
