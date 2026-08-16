'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Shows a resume template as a DOCUMENT — the whole page, scaled to fit,
 * scrollable, nothing cut off.
 *
 * WHY THIS EXISTS. `GulfPremium` is a fixed A4 page: 794px wide by 1123px tall
 * (components/templates/tokens.ts), because that is what Puppeteer prints and
 * what the paid PDF has to be. Dropping that fixed-width element straight into
 * a responsive column — which /package/[id] did — puts a 794px page inside a
 * ~660px box with `overflow-hidden` on it, so the RIGHT-HAND SIDE of the user's
 * own resume was silently clipped, and on mobile most of it was gone. It looked
 * like a broken widget rather than a document.
 *
 * The fix is the one every document viewer uses: never reflow the page (that
 * would make the preview disagree with the PDF, which is the whole point of
 * sharing one template), scale it down uniformly and reserve exactly the space
 * the scaled result occupies.
 *
 * `zoom` would be simpler but it is not honoured consistently across browsers
 * for nested inline-styled trees, and it affects layout in ways `transform`
 * does not; transform + an explicitly sized wrapper is predictable everywhere.
 */

const PAGE_WIDTH = 794

export function ResumeDocumentView({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  const outerRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [scaledHeight, setScaledHeight] = useState<number>(0)

  const measure = useCallback(() => {
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    const available = outer.clientWidth
    // Never scale UP: a 1200px-wide monitor should show a crisp A4 page, not a
    // blown-up one.
    const next = Math.min(1, available / PAGE_WIDTH)
    setScale(next)
    // The page grows with content (minHeight is a floor, not a cap), so read
    // the real rendered height rather than assuming 1123px — a three-page CV
    // must not be cut off at the bottom, which is the same bug in the other
    // axis.
    setScaledHeight(inner.getBoundingClientRect().height * next)
  }, [])

  useEffect(() => {
    measure()
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    // Watch BOTH: the container (window resize, sidebar opening) and the page
    // itself (fonts finishing, an image loading, content edited in place).
    const ro = new ResizeObserver(() => measure())
    ro.observe(outer)
    ro.observe(inner)
    return () => ro.disconnect()
  }, [measure])

  // A second pass once webfonts settle — text metrics change and the page gets
  // taller, which would otherwise leave the last lines overlapping whatever
  // follows.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) return
    document.fonts.ready.then(() => measure()).catch(() => {})
  }, [measure])

  return (
    <div ref={outerRef} className={className}>
      <div
        style={{ height: scaledHeight || undefined }}
        className="relative w-full overflow-hidden"
      >
        <div
          ref={innerRef}
          style={{
            width: PAGE_WIDTH,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="shadow-[0_1px_3px_rgba(10,26,47,0.10),0_12px_32px_rgba(10,26,47,0.10)]"
        >
          {children}
        </div>
      </div>
    </div>
  )
}
