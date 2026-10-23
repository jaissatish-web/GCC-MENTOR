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
  'ui-button inline-flex min-w-0 max-w-full select-none items-center justify-center gap-2 whitespace-normal break-words rounded-ctl font-redesign-sans leading-snug text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-deep focus-visible:ring-offset-2 focus-visible:ring-offset-canvas active:scale-[0.99] disabled:pointer-events-none disabled:opacity-55 motion-reduce:transition-none',
  {
    variants: {
      variant: {
        /**
         * Design B (2026-10-23): the ONE action per screen is gold fill with
         * dark ink text — never white on gold. `ink` (#14181C) on `gold`
         * measures 6.7:1 (WCAG AA); `gold-ink` on `gold` is only ~2.1:1 and
         * fails — this was caught in CTO audit on 2026-10-23 and corrected.
         */
        primary: 'bg-gold font-semibold text-ink shadow-m-1 hover:shadow-m-2 hover:-translate-y-px',
        /**
         * Purchase. Same gold family, one step louder — this is the only place
         * in the product a button is allowed to lift and deepen.
         */
        purchase:
          'bg-gold font-semibold text-ink shadow-m-2 hover:bg-gold-ink hover:text-white hover:shadow-m-3 hover:-translate-y-px',
        /** A step forward inside a flow: a gold-tinted ghost, so the primary
         *  action on the screen stays the only solid gold. */
        progress:
          'border border-gold/50 bg-white font-semibold text-gold-ink hover:bg-gold-soft',
        secondary:
          'border border-line-strong bg-white font-semibold text-navy-deep hover:bg-navy-tint',
        ghost:
          'border border-transparent bg-transparent font-semibold text-navy-deep hover:bg-navy-tint',
        danger:
          'border border-alert bg-white font-semibold text-alert hover:bg-alert-soft',
        'danger-solid': 'bg-alert font-semibold text-white hover:opacity-90',
        disabled: 'border border-line bg-canvas font-semibold text-ink-muted',
      },
      size: {
        // 44px minimum — the touch-target floor. Anything smaller is a link.
        md: 'min-h-12 px-[22px] py-3 type-button',
        sm: 'min-h-11 px-4 py-2.5 type-button',
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
      {/* A turning ring on every busy button (2026-09-10). Saves and uploads
          take a second or two — too short for the full processing orbit, long
          enough that a label change alone reads as a stuck button. It draws in
          `currentColor`, so it matches every variant without a colour of its
          own, and it stops for reduced-motion users. */}
      {busy ? (
        <span
          aria-hidden="true"
          className="size-4 shrink-0 rounded-full border-2 border-current border-r-transparent animate-spin motion-reduce:animate-none"
        />
      ) : null}
      {busy && busyLabel ? busyLabel : children}
    </button>
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
