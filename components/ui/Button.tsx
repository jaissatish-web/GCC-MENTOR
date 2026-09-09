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
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-ctl font-redesign-sans leading-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        /**
         * THE one action on a screen. Gold fill, ink text.
         *
         * `gold` is 2.66:1 against white and is a FILL ONLY — white text on it
         * would be unreadable, which is the trap `signal-ink` on `signal` was.
         * Ink on gold measures 6.70. Hover deepens the fill rather than
         * changing hue, so the button does not become a different colour when
         * a thumb rests on it.
         */
        primary: 'bg-gold font-bold text-ink hover:bg-gold-ink hover:text-white',
        /**
         * Purchase. Same gold, one step louder — this is the only place in the
         * product a button is allowed to lift.
         */
        purchase:
          'bg-gold font-bold text-ink shadow-m-2 hover:bg-gold-ink hover:text-white hover:shadow-m-3 hover:-translate-y-px',
        /** A step forward inside a flow: the brand, not the CTA. */
        progress: 'bg-teal font-bold text-white shadow-m-1 hover:bg-teal-bright',
        secondary:
          'border border-line-strong bg-white font-semibold text-ink hover:bg-canvas',
        ghost:
          'border border-transparent bg-transparent font-semibold text-teal hover:bg-teal-soft',
        danger:
          'border border-alert bg-white font-semibold text-alert hover:bg-alert-soft',
        'danger-solid': 'bg-alert font-bold text-white hover:opacity-90',
        disabled: 'bg-canvas font-semibold text-ink-muted',
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
