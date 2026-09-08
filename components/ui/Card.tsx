import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Card — the standard raised surface.
 *
 * Exported props and tone behavior remain unchanged. The redesign uses the
 * shared surface, line, radius, and shadow tokens from DESIGN_SYSTEM.md §8.
 */
const cardVariants = cva('rounded-bp-lg border font-redesign-sans', {
  variants: {
    tone: {
      light: 'border-edge bg-white shadow-redesign-sm',
      dark: 'border-edge bg-white shadow-redesign-md',
      'dark-interactive':
        'border-edge bg-white shadow-redesign-md transition-all duration-300 hover:-translate-y-1 hover:border-signal hover:shadow-redesign-lg motion-reduce:transform-none motion-reduce:transition-none',
    },
  },
  defaultVariants: {
    tone: 'light',
  },
})

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, tone, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ tone }), className)} {...props} />
  )
)
Card.displayName = 'Card'

export { Card, cardVariants }
