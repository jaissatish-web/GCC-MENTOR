import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button — shared action button.
 *
 * Variants map one-to-one to DESIGN.md §4 and the approved Components panel
 * in design-reference/MVP Screens.dc.html:
 *   primary   = navy action      (bg-midnight)
 *   purchase  = gold purchase    (bg-gold)
 *   progress  = emerald progress (bg-emerald)
 *   secondary = white + line-strong border
 *   disabled  = fill-subtle + ink-faint
 *
 * Every interactive element is at least 44px tall (min-h-11).
 */
const buttonVariants = cva(
  'inline-flex min-h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg px-[22px] py-4 text-sm leading-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void active:scale-[0.99] disabled:pointer-events-none motion-reduce:transition-none',
  {
    variants: {
      variant: {
        primary: 'bg-midnight font-bold text-marble hover:bg-deep-navy',
        // The primary purchase CTA on dark: gold with a soft outer glow that
        // intensifies on hover. This is the single loudest element on any
        // screen — deliberately the only thing that glows this strongly.
        purchase:
          'bg-gold font-bold text-midnight shadow-glow-gold hover:bg-gold-light hover:shadow-glow-gold-lg hover:-translate-y-px',
        progress: 'bg-emerald font-bold text-marble shadow-glow-emerald hover:bg-emerald',
        secondary:
          'border border-line-strong bg-white font-semibold text-midnight hover:bg-fill-subtle',
        // Dark-surface secondary — hairline border on translucent fill.
        ghost:
          'border border-hairline bg-marble/[0.04] font-semibold text-marble backdrop-blur hover:border-gold/45 hover:bg-marble/[0.08] hover:-translate-y-px',
        disabled: 'bg-surface-2/60 font-semibold text-marble/35',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />
  )
)
Button.displayName = 'Button'

export { Button, buttonVariants }
