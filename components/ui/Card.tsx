import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Card — a quiet boundary for a distinct form or result.
 *
 * Exported props and tone behavior remain unchanged. The redesign uses the
 * shared surface, line, radius, and shadow tokens from DESIGN_SYSTEM.md §8.
 */
const cardVariants = cva('ui-surface rounded-card border font-redesign-sans', {
  variants: {
    tone: {
      light: 'border-line bg-white',
      // Design B: the dark card is a navy surface for navy-shelled screens.
      dark: 'border-hairline bg-surface text-white',
      'dark-interactive':
        'border-line bg-white transition-colors duration-200 hover:border-navy-deep motion-reduce:transition-none',
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
