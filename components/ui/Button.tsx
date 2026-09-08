import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button — the single source of truth for every clickable action.
 *
 * An audit found 60 hand-styled buttons against 32 using this component, across
 * 10 different background colours and 5 padding combinations, two of them still
 * on palette tokens that no longer exist. That happens when the component does
 * not cover the real cases, so the fix is to cover them rather than to police
 * the call sites:
 *
 *   size="sm"      row-level actions (Add, Remove, inline edit) that previously
 *                  hand-rolled px-3 py-2 and ended up smaller than the 44px
 *                  touch target.
 *   variant danger destructive actions, which were previously built by pasting
 *                  terra classes onto a secondary button.
 *
 * WORDING GOES WITH IT. A button says what it does in the imperative ("Save
 * changes"), and its busy state is the same verb in progress ("Saving…"). The
 * codebase had seven unrelated busy words — Working, Loading, Processing among
 * them — which reads as several products stitched together. `busyLabel` keeps
 * the pair adjacent so they cannot drift.
 */
const buttonVariants = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-bp font-redesign-sans leading-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2 focus-visible:ring-offset-paper active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        primary: 'bg-signal font-bold text-white hover:bg-signal-ink',
        purchase:
          'bg-signal font-bold text-white shadow-redesign-cta-glow hover:bg-signal-ink hover:shadow-redesign-lg hover:-translate-y-px',
        progress: 'bg-signal font-bold text-white shadow-redesign-md hover:bg-signal-ink',
        secondary:
          'border border-edge-strong bg-white font-semibold text-graphite hover:bg-paper',
        ghost:
          'border border-transparent bg-transparent font-semibold text-signal-ink hover:bg-signal-tint',
        danger:
          'border border-terra bg-white font-semibold text-terra hover:bg-terra-tint',
        'danger-solid': 'bg-terra font-bold text-white hover:opacity-90',
        disabled: 'bg-paper font-semibold text-slate',
      },
      size: {
        // 44px minimum — the touch-target floor. Anything smaller is a link.
        md: 'min-h-11 px-[22px] py-4 text-sm',
        sm: 'min-h-11 px-4 py-2.5 text-[13px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * Shown in place of the label while `busy` is true, and the button disables
   * itself. Use the same verb as the label, in progress: Save -> Saving…
   */
  busy?: boolean
  busyLabel?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, busy, busyLabel, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      aria-busy={busy || undefined}
      disabled={disabled || busy}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
