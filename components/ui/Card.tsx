import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Card — the standard raised surface.
 *
 * `tone="light"` (the DEFAULT, unchanged) is the original white-on-marble
 * card from DESIGN.md §4, still used by every light app screen.
 *
 * `tone="dark"` is the 2026-08-07 dark redesign surface: a navy panel with a
 * hairline border and an inset top highlight, so it reads as a physically
 * raised object instead of a flat rectangle. `tone="dark-interactive"` adds
 * the hover lift used by clickable cards.
 */
const cardVariants = cva('rounded-2xl border', {
  variants: {
    tone: {
      light: 'border-line bg-white',
      dark: 'border-hairline bg-surface shadow-elev-2 shadow-inset-hairline',
      'dark-interactive':
        'border-hairline bg-surface shadow-elev-2 transition-all duration-300 hover:-translate-y-1 hover:border-gold/40 hover:shadow-elev-3 motion-reduce:transform-none motion-reduce:transition-none',
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
