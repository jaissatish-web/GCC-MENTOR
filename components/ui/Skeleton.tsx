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
  text: 'h-[13px] rounded-ctl',
  title: 'h-[19px] w-1/2 rounded-ctl',
  block: 'h-24 rounded-ctl',
  circle: 'size-10 rounded-full',
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, shape = 'text', ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        'w-full bg-canvas',
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

/**
 * A whole screen's worth of placeholder (2026-09-18). Nine screens showed a
 * bare monospace "Loading…" on an empty page for 10–20 seconds on a slow
 * network. This gives the page its shape: a heading, a line of context and
 * content cards. Bars sit inside white cards because a bar on the canvas
 * background is invisible (the bar colour is the canvas colour).
 */
export function PageSkeleton({ label = 'Loading', cards = 3 }: { label?: string; cards?: number }) {
  return (
    <SkeletonGroup label={label} className="w-full max-w-[900px] gap-4 self-start px-4 pb-10 pt-8 sm:px-6">
      <Skeleton shape="title" className="h-7 w-2/3 bg-line/70 sm:w-1/2" />
      <Skeleton className="w-5/6 bg-line/60 sm:w-2/3" />
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-card border border-line bg-white p-5 shadow-m-1">
          <Skeleton shape="title" className="w-1/3" />
          <Skeleton />
          <Skeleton className="w-4/5" />
          {i === 0 ? <Skeleton shape="block" className="h-20" /> : null}
        </div>
      ))}
    </SkeletonGroup>
  )
}
