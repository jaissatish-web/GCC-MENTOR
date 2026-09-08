import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Skeleton — the shape of what is loading.
 *
 * WHY THIS EXISTS. **Three of 34 screens had any loading design at all.**
 * Everywhere else a fetch produced a bare "Loading…" string or nothing.
 *
 * That is backwards for this product's actual users. They are on Gulf mobile
 * networks, and several of these screens wait on a model call measured at 8 to
 * 45 seconds — so the loading state is not a flicker between real states, it is
 * one of the most-seen screens in the app. It was also the least designed.
 *
 * A skeleton beats a spinner here for one concrete reason: it says how much is
 * coming and where it will be, so the layout does not jump when the data
 * lands. A spinner says only "wait".
 *
 * MOTION IS OPTIONAL BY DESIGN. The shimmer sits behind
 * `prefers-reduced-motion`, so a user who has asked for stillness gets a plain
 * grey block rather than a pulsing one — the shape still does its job.
 *
 * Every skeleton is `aria-hidden` and the container carries the announcement.
 * A screen reader should hear "loading" once, not the geometry of nine bars.
 */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Rounded to match what it stands in for. */
  shape?: 'text' | 'title' | 'block' | 'circle'
}

const SHAPES: Record<NonNullable<SkeletonProps['shape']>, string> = {
  text: 'h-[13px] rounded-radius-sm',
  title: 'h-[19px] w-1/2 rounded-radius-sm',
  block: 'h-24 rounded-radius-md',
  circle: 'size-10 rounded-full',
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, shape = 'text', ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        'w-full bg-surface-2-light',
        'motion-safe:animate-pulse',
        SHAPES[shape],
        className,
      )}
      {...props}
    />
  ),
)
Skeleton.displayName = 'Skeleton'

/**
 * The announcement wrapper. Put skeletons inside it so assistive technology
 * hears one honest sentence instead of nothing — the failure mode of a purely
 * visual loading state.
 */
export function SkeletonGroup({
  label = 'Loading',
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { label?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-col gap-2.5', className)} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export { Skeleton }
