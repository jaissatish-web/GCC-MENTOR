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
/** One A4 page at 96 DPI. The floor of the printed page, not a cap on content. */
const PAGE_HEIGHT = 1123
/** Breathing room under the page so it never touches the pane's bottom edge. */
const BOTTOM_GAP = 12
/**
 * How small fit-to-height is allowed to go.
 *
 * On a short laptop the arithmetic can ask for a scale that makes the resume
 * unreadable, and an unreadable whole page is worse than a readable page you
 * scroll. Below this the page is allowed to exceed the pane and the user scrolls
 * within it — the content is still complete either way, because the wrapper
 * always reserves the FULL scaled height.
 */
const MIN_FIT_SCALE = 0.5

/** Nearest ancestor that actually scrolls, or null when the page itself does. */
function findScrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement
  while (p) {
    const oy = getComputedStyle(p).overflowY
    if (oy === 'auto' || oy === 'scroll') return p
    p = p.parentElement
  }
  return null
}

export function ResumeDocumentView({
  children,
  className = '',
  /**
   * Scale so a WHOLE PAGE fits the visible height, then scroll for the next one
   * (TASK-154).
   *
   * Fitting width alone was right while the page scrolled as a whole. Once
   * TASK-153 gave the document its own fixed-height pane, a page at true size
   * (1123px) inside a ~520px pane meant the user saw half a page and had to
   * scroll to find the rest — "cut from the bottom", as the founder put it.
   *
   * Off by default: this only makes sense where the container constrains height.
   * When no scrolling ancestor is found — a phone, where the page itself scrolls
   * — it falls back to width-only fitting on its own, so the flag is safe to
   * pass anywhere.
   */
  fitToHeight = false,
}: {
  children: React.ReactNode
  className?: string
  fitToHeight?: boolean
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
    let next = Math.min(1, available / PAGE_WIDTH)

    if (fitToHeight) {
      const container = findScrollParent(outer)
      if (container) {
        // Offset of the page within its scroll container, measured
        // scroll-INDEPENDENTLY — adding scrollTop back means a re-measure taken
        // halfway down the resume yields the same answer as one taken at the
        // top, instead of shrinking the page every time the user scrolls.
        const offsetWithin =
          outer.getBoundingClientRect().top -
          container.getBoundingClientRect().top +
          container.scrollTop
        const availableHeight = container.clientHeight - offsetWithin - BOTTOM_GAP
        if (availableHeight > 0) {
          const heightFit = availableHeight / PAGE_HEIGHT
          next = Math.max(MIN_FIT_SCALE, Math.min(next, heightFit))
        }
      }
    }

    setScale(next)
    // The page grows with content (minHeight is a floor, not a cap), so read
    // the real rendered height rather than assuming 1123px — a three-page CV
    // must not be cut off at the bottom, which is the same bug in the other
    // axis.
    //
    // `offsetHeight`, NOT `getBoundingClientRect().height` (TASK-154). A bounding
    // rect INCLUDES the transform, so multiplying it by the scale applied the
    // scale twice and the reserved box came out short — the page was clipped at
    // the bottom by the `overflow-hidden` on that very box. Invisible while the
    // scale was 1, because 1123 x 1 x 1 is still 1123. It was wrong on every
    // phone from the day this component shipped, since a narrow screen always
    // scales down: measured a 324px box holding a 440px page at 375px wide.
    // `offsetHeight` is the untransformed layout height, which is what the
    // multiplication actually wants.
    setScaledHeight(inner.offsetHeight * next)
  }, [fitToHeight])

  useEffect(() => {
    measure()
    const outer = outerRef.current
    const inner = innerRef.current
    if (!outer || !inner) return

    // Watch BOTH: the container (sidebar opening, layout shifts) and the page
    // itself (fonts finishing, an image loading, content edited in place).
    const ro = new ResizeObserver(() => measure())
    ro.observe(outer)
    ro.observe(inner)

    // And the SCROLL CONTAINER, when fitting to height — its height is an input
    // to the scale, and nothing else reports it. Without this the first measure
    // ran against a container still being laid out and the page stayed at
    // whatever scale that produced: measured 0.42 with 155px of headroom going
    // spare, because no later event ever recomputed it.
    const container = fitToHeight ? findScrollParent(outer) : null
    if (container) ro.observe(container)

    // One more pass after layout settles. The container's final height is not
    // known during the first paint of a flex chain this deep, and the fit is a
    // function of it.
    const raf = requestAnimationFrame(() => measure())

    // A window listener as well, and not as belt-and-braces padding: observed
    // failing. Growing the viewport from 760px to 1280px left the container
    // correctly at 794px while the page stayed rendered at 680px — the observer
    // did not deliver for that change, so the resume rendered smaller than its
    // own container until something else forced a re-measure. Resizing the
    // window is the single most likely way a real user hits this.
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure, fitToHeight])

  // A second pass once webfonts settle — text metrics change and the page gets
  // taller, which would otherwise leave the last lines overlapping whatever
  // follows.
  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts?.ready) return
    document.fonts.ready.then(() => measure()).catch(() => {})
  }, [measure])

  return (
    <div ref={outerRef} className={className}>
      {/* The reserved box is exactly the SCALED page, and centred.
          It used to be `w-full`, which was invisible while the scale was 1 and
          the box was already page-width. The moment fit-to-height made the scale
          less than 1, the page — transformed from its top-LEFT origin — sat
          against the left edge of a wider box. Same off-centre bug as TASK-146
          and TASK-148, in a third place. Sizing the box to the result rather than
          to the container removes the gap instead of compensating for it. */}
      <div
        style={{
          height: scaledHeight || undefined,
          width: PAGE_WIDTH * scale,
          maxWidth: '100%',
        }}
        className="relative mx-auto overflow-hidden"
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
