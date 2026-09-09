import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Pill — compact status / label chip.
 *
 * The seven variant names and label/children behavior are unchanged. Visuals
 * use the redesign semantic and neutral tokens from DESIGN_SYSTEM.md §8.
 */
const pillVariants = cva(
  'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-[11px] py-[6px] font-redesign-sans text-[12px] font-semibold leading-none',
  {
    variants: {
      variant: {
        applied: 'border border-line-strong bg-canvas text-ink-soft',
        shortlisted: 'border border-teal bg-teal-soft text-teal',
        interview: 'border border-teal-soft bg-teal-soft text-teal',
        visa_processing: 'border border-line bg-line text-ink-soft',
        offer: 'bg-teal text-white',
        risk: 'rounded-[7px] border border-alert bg-alert-soft text-alert',
        grounded: 'rounded-[7px] border border-teal-soft bg-teal-soft text-teal',
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
