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
  'inline-flex min-h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-lg px-[22px] py-4 text-sm leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2 active:scale-[0.99] disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-midnight font-bold text-marble hover:bg-deep-navy',
        purchase: 'bg-gold font-bold text-midnight hover:bg-gold-light',
        progress: 'bg-emerald font-bold text-marble hover:bg-emerald',
        secondary:
          'border border-line-strong bg-white font-semibold text-midnight hover:bg-fill-subtle',
        disabled: 'bg-fill-subtle font-semibold text-ink-faint',
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
