import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Alert — one presentation for every message the product needs to hand a user.
 *
 * WHY THIS EXISTS. An audit on 2026-09-05 counted **70 hand-written
 * `text-terra` error strings** and no shared component. Every screen styled its
 * own: a bare red sentence here, a bordered tinted box there, sometimes with
 * `role="alert"` and usually without. Two consequences, and the second is the
 * one that matters:
 *
 *   1. Errors looked different on every screen, which reads as several products.
 *   2. **There was no way to tell a field problem from a failed request from a
 *      standing warning**, because all three rendered identically. A user who
 *      cannot tell "you need to fix something" from "we broke, try again"
 *      cannot act.
 *
 * So the variants are not decoration — they are the distinction the old code
 * could not express.
 *
 * ACCESSIBILITY IS BUILT IN, NOT LEFT TO THE CALL SITE. `danger` and `warning`
 * announce themselves (`role="alert"`, `aria-live="assertive"` / `"polite"`);
 * `info` and `success` do not interrupt. That was inconsistent across the 70
 * sites and is the kind of thing a component should settle once.
 *
 * Colour is never the only signal: every variant carries a border and its own
 * ground, so it survives a monochrome screenshot and a colour-blind reader.
 */
const alertVariants = cva(
  'flex items-start gap-2.5 rounded-radius-md border px-3.5 py-3 font-redesign-sans text-[13px] leading-relaxed',
  {
    variants: {
      variant: {
        /** Something the user must fix, or something that failed. */
        danger: 'border-terra/40 bg-terra-tint text-terra',
        /** True, and worth knowing before continuing. Not a failure. */
        warning: 'border-amber/40 bg-redesign-gold-tint text-gold-text',
        /**
         * Neutral context. The commonest and the quietest.
         *
         * `text-navy`, NOT `text-info`. Caught in review 2026-09-08: there is no
         * `info` colour token, so `text-info` generated no rule at all and the
         * text fell through to the inherited body colour — `marble`, near-white
         * — giving white text on a pale blue ground at roughly 1.05:1.
         * Invisible, and silent: a missing Tailwind colour produces no error,
         * just no rule. It is the same failure that shipped white labels on a
         * white card, which is why every variant here is contrast-checked.
         */
        info: 'border-navy-tint bg-navy-tint text-navy',
        /** Something completed. Used sparingly — most successes need no box. */
        success: 'border-emerald/25 bg-state-emerald-bg text-emerald',
      },
    },
    defaultVariants: { variant: 'info' },
  },
)

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /**
   * Optional short heading. Use only when the body needs more than a sentence —
   * a one-line message reads better with no title above it.
   */
  title?: string
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, title, children, ...props }, ref) => {
    const urgent = variant === 'danger'
    const announces = urgent || variant === 'warning'
    return (
      <div
        ref={ref}
        // A failure interrupts; a warning waits for a pause; context does neither.
        role={announces ? 'alert' : undefined}
        aria-live={announces ? (urgent ? 'assertive' : 'polite') : undefined}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      >
        {/* A shape, not an icon font: it renders in every theme, needs no
            dependency, and reinforces the variant without relying on colour. */}
        <span aria-hidden="true" className="mt-[5px] size-1.5 shrink-0 rounded-full bg-current opacity-70" />
        <div className="min-w-0">
          {title ? <p className="mb-0.5 font-semibold">{title}</p> : null}
          <div className={cn(title && 'opacity-90')}>{children}</div>
        </div>
      </div>
    )
  },
)
Alert.displayName = 'Alert'

export { Alert, alertVariants }
