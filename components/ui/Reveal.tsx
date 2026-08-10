'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Reveal — scroll-triggered entrance animation.
 *
 * Wraps children in an element that animates in once, the first time it
 * enters the viewport. Deliberately one-shot: re-animating on every scroll
 * past is the thing that makes "animated" sites feel cheap and restless.
 *
 * Safety properties (see the .js-reveal rules in globals.css):
 *  - Content is only pre-hidden when JS has run AND reduced-motion is off,
 *    so no-JS and reduced-motion visitors always see content immediately.
 *  - The observer disconnects after firing, so there is no lingering
 *    scroll-time work — this stays cheap on low-end Android.
 *
 * `delay` staggers siblings (in ms). Keep stagger small; anything over
 * ~240ms total reads as the page being slow rather than choreographed.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    // If the browser can't observe, just show it.
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible')
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-visible')
            observer.disconnect()
          }
        }
      },
      // Fire slightly before the element is fully on screen so the motion
      // finishes as it settles into view rather than after it has arrived.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.08 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      data-reveal=""
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(className)}
    >
      {children}
    </div>
  )
}
