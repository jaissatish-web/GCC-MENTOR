import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Toggle — field visibility switch. Props, switch semantics, and click
 * behavior are unchanged; the visual treatment uses redesign tokens.
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
          'inline-flex min-h-11 items-center justify-center rounded-full p-[9px] font-redesign-sans transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
          isDark
            ? 'focus-visible:ring-signal-ink focus-visible:ring-offset-paper'
            : 'focus-visible:ring-signal-ink focus-visible:ring-offset-paper',
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
            checked ? 'justify-end bg-signal' : isDark ? 'justify-start bg-signal-tint' : 'justify-start bg-edge'
          )}
        >
          <span className="h-[21px] w-[21px] rounded-full bg-white shadow-redesign-sm" />
        </span>
      </button>
    )
  }
)
Toggle.displayName = 'Toggle'

export { Toggle }
