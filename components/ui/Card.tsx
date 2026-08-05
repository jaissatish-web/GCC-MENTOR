import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Card — the standard white surface used across the app.
 *
 * White on marble, 1px line border, 18px radius (rounded-2xl), per
 * DESIGN.md §4 ("Cards: Radius 14–18px, white on marble, 1px #E4DED2 border").
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('rounded-2xl border border-line bg-white', className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

export { Card }
