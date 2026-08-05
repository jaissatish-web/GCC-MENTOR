import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Pill — compact status / label chip.
 *
 * The five package statuses use fully-rounded pill shapes; `risk` and
 * `grounded` use a tighter 7px radius and carry icons. Colours are the
 * semantic tints (state-*) from tailwind.config.ts — never hard-coded hex.
 *   applied         fill-subtle / line-strong
 *   shortlisted     state-gold-*
 *   interview       state-emerald-*
 *   visa_processing state-visa-*
 *   offer           solid emerald
 *   risk            state-terra-* (rounded-[7px])
 *   grounded        state-emerald-* (rounded-[7px])
 */
const pillVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-[11px] py-[6px] text-[11px] font-semibold leading-none',
  {
    variants: {
      variant: {
        applied: 'border border-line-strong bg-fill-subtle text-ink-body',
        shortlisted: 'border border-state-gold-line bg-state-gold-bg text-state-gold-text',
        interview: 'border border-state-emerald-line bg-state-emerald-bg text-emerald',
        visa_processing: 'border border-state-visa-line bg-state-visa-bg text-state-visa-text',
        offer: 'bg-emerald text-marble',
        risk: 'rounded-[7px] border border-state-terra-line bg-state-terra-bg text-state-terra-text',
        grounded:
          'rounded-[7px] border border-state-emerald-line bg-state-emerald-bg text-emerald',
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
