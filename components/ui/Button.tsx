import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Button — shared action button.
 *
 * Variant names and props are unchanged. Visuals use the redesign foundation
 * tokens from docs/redesign/DESIGN_SYSTEM.md §6; this component does not alter
 * click, submit, disabled, or focus behavior.
 */
const buttonVariants = cva(
  'inline-flex min-h-11 select-none items-center justify-center gap-2 whitespace-nowrap rounded-radius-md px-[22px] py-4 font-redesign-sans text-sm leading-none transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2 focus-visible:ring-offset-forest-deep active:scale-[0.99] disabled:pointer-events-none motion-reduce:transition-none',
  {
    variants: {
      variant: {
        primary: 'bg-forest-deep font-bold text-ink-900-dark hover:bg-forest-deep-dark',
        purchase:
          'bg-redesign-gold font-bold text-forest-deep shadow-redesign-cta-glow hover:bg-redesign-gold-dark hover:shadow-redesign-lg hover:-translate-y-px',
        progress: 'bg-forest font-bold text-surface-light shadow-redesign-md hover:bg-forest-dark',
        secondary:
          'border border-line-light-strong bg-surface-light font-semibold text-ink-900 hover:bg-surface-2-light',
        ghost:
          'border border-line-dark bg-transparent font-semibold text-ink-900-dark backdrop-blur hover:border-redesign-gold hover:bg-forest-tint-dark hover:-translate-y-px',
        disabled: 'bg-surface-2-light font-semibold text-ink-400',
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
