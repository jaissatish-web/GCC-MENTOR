import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Toggle — field visibility switch.
 *
 * Visual pill is 46×27px per DESIGN.md §4 (On = emerald, Off = line-strong);
 * the surrounding button pads the gap so the full touch target is >=44px.
 * Uncontrolled from the consumer's perspective: `checked` is the source of
 * truth and `onCheckedChange` reports the next value.
 *
 * `tone="light"` (default, unchanged): original light-theme styling —
 * off-track uses bg-line-strong, white knob, midnight focus ring. Still used
 * by every light screen (app/profile, app/profile/visibility).
 *
 * `tone="dark"` (new, 2026-08-07 Phase 2): dark surface variant for the
 * redesigned dashboard auth pages — off-track uses bg-surface-2, gold focus
 * ring. Opt-in only; every existing call site (which passes no `tone`) is
 * completely unaffected.
 */
export interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange' | 'type'> {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  tone?: 'light' | 'dark'
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, checked, onCheckedChange, onClick, tone = 'light', ...props }, ref) => {
    const isDark = tone === 'dark'

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        className={cn(
          'inline-flex rounded-full p-[9px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          isDark
            ? 'focus-visible:ring-gold focus-visible:ring-offset-void'
            : 'focus-visible:ring-midnight',
          className
        )}
        onClick={(event) => {
          onClick?.(event)
          onCheckedChange?.(!checked)
        }}
        {...props}
      >
        <span
          className={cn(
            'flex h-[27px] w-[46px] items-center rounded-full p-[3px] transition-colors',
            checked ? 'justify-end bg-emerald' : isDark ? 'justify-start bg-surface-2' : 'justify-start bg-line-strong'
          )}
        >
          <span className="h-[21px] w-[21px] rounded-full bg-white shadow-sm" />
        </span>
      </button>
    )
  }
)
Toggle.displayName = 'Toggle'

export { Toggle }
