import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Pill — compact status / label chip.
 *
 * The seven variant names and label/children behavior are unchanged. Visuals
 * use Design B (navy & gold, 2026-10-23): status chips sit on navy-soft or
 * gold-soft tints instead of clashing teal, offers read as done-green, and
 * anything that must not look actionable stays neutral.
 */
const pillVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-[11px] py-[6px] font-redesign-sans text-[12px] font-semibold leading-none',
  {
    variants: {
      variant: {
        saved: 'border border-dashed border-line-strong bg-white text-ink-soft',
        applied: 'border border-line-strong bg-canvas text-ink-soft',
        rejected: 'border border-alert/40 bg-alert-soft text-alert',
        withdrawn: 'border border-line bg-canvas text-ink-soft',
        shortlisted: 'border border-navy-tint bg-navy-tint text-navy-deep',
        interview: 'border border-gold/40 bg-gold-soft text-gold-ink',
        visa_processing: 'border border-line bg-line text-ink-soft',
        offer: 'bg-ok text-white',
        risk: 'rounded-[7px] border border-alert bg-alert-soft text-alert',
        grounded: 'rounded-[7px] border border-ok/30 bg-ok-soft text-ok',
      },
    },
    defaultVariants: {
      variant: 'applied',
    },
  }
)

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  /** If set and no children are provided, rendered as the pill's text. */
  label?: string
}

const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  ({ className, variant, label, children, ...props }, ref) => (
    <span ref={ref} className={cn(pillVariants({ variant }), className)} {...props}>
      {children ?? label}
    </span>
  )
)
Pill.displayName = 'Pill'

export { Pill, pillVariants }
