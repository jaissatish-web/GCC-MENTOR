'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
 * Native CSS zoom keeps the fixed A4 layout while rasterizing text at the
 * displayed size. The full-screen reader uses the same original document,
 * with fit and 75–200% magnification; no screenshot is enlarged.
 */

const PAGE_WIDTH = 794

export function ResumeDocumentView({
  children,
  className = '',
  reader = true,
}: {
  children: React.ReactNode
  className?: string
  /** Offer "Read full size" when the page is shown small (phones). */
  reader?: boolean
}) {
  const [reading, setReading] = useState(false)
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
  }, [])

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

    // One more pass after layout settles: the container's final width is not
    // known during the first paint of a flex chain this deep, and a stale first
    // measurement leaves the page rendered at the wrong scale until something
    // else happens to trigger a re-measure.
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
      {/* The reserved box is exactly the SCALED page, and centred (TASK-154).
          It used to be `w-full`, which was invisible at scale 1 because the box
          was already page-width — but on any narrower screen the page, transformed
          from its top-LEFT origin, sat against the left edge of a wider box. Same
          off-centre defect as TASK-146 and TASK-148, in a third place. Sizing the
          box to the result rather than to the container removes the gap instead of
          compensating for it. */}
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
          data-document-preview
          style={{
            width: PAGE_WIDTH,
            zoom: scale,
            textRendering: 'geometricPrecision',
          }}
          className="shadow-[0_1px_3px_rgba(10,26,47,0.10),0_12px_32px_rgba(10,26,47,0.10)]"
        >
          {children}
        </div>
      </div>
      {reader ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-ctl border border-line bg-white px-3 py-2">
          <span className="type-caption text-ink-soft">A4 document · {Math.round(scale * 100)}% fit</span>
          <button type="button" onClick={() => setReading(true)} className="min-h-11 rounded-ctl bg-teal px-4 text-[13.5px] font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
            Open full-size preview
          </button>
        </div>
      ) : null}
      {reading ? <DocumentReader onClose={() => setReading(false)}>{children}</DocumentReader> : null}
    </div>
  )
}

const ZOOMS = [
  { label: 'Fit', value: 0 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1 },
  { label: '125%', value: 1.25 },
  { label: '150%', value: 1.5 },
  { label: '200%', value: 2 },
] as const

/** Native text at the selected magnification, never an enlarged screenshot. */
export function DocumentReader({ children, onClose, title = 'Resume preview', caption = 'A4 · Original document' }: { children: React.ReactNode; onClose: () => void; title?: string; caption?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const [zoom, setZoom] = useState<number>(0)
  const [fit, setFit] = useState(1)

  useEffect(() => {
    const dialog = dialogRef.current
    const body = bodyRef.current
    if (!dialog || !body) return
    const opener = document.activeElement as HTMLElement | null
    const measure = () => setFit(Math.min(1, Math.max(0.2, (body.clientWidth - 32) / PAGE_WIDTH)))
    if (!dialog.open) dialog.showModal()
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(body)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      observer.disconnect()
      if (dialog.open) dialog.close()
      document.body.style.overflow = previous
      opener?.focus()
    }
  }, [])

  const z = zoom === 0 ? fit : zoom
  if (typeof document === 'undefined') return null
  return createPortal(
    <dialog ref={dialogRef} onCancel={e => { e.preventDefault(); onClose() }} aria-label={title} aria-modal="true" className="fixed inset-0 z-[90] m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-[#e8eeec] p-0 backdrop:bg-ink/70">
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          <div className="min-w-0"><h2 className="text-[15px] font-semibold text-ink">{title}</h2><p className="text-[12px] text-ink-muted">{caption}</p></div>
          <button ref={closeRef} type="button" onClick={onClose} className="min-h-11 rounded-ctl border border-line bg-white px-4 text-[13.5px] font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">Close preview</button>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2" role="group" aria-label="Document zoom">
          {ZOOMS.map(option => <button key={option.label} type="button" aria-pressed={zoom === option.value} onClick={() => setZoom(option.value)} className={'min-h-11 rounded-ctl px-3 text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal ' + (zoom === option.value ? 'bg-teal text-white' : 'border border-line text-ink')}>{option.label}</button>)}
          <span className="ml-auto text-[12px] text-ink-soft">{Math.round(z * 100)}% · Scroll to read</span>
        </div>
        <div ref={bodyRef} className="min-h-0 flex-1 overflow-auto overscroll-contain p-4" tabIndex={0} aria-label="Scrollable resume document">
          <div style={{ width: PAGE_WIDTH * z }} className="mx-auto bg-white shadow-[0_4px_32px_rgba(10,26,47,.16)]">
            <div data-document-preview style={{ width: PAGE_WIDTH, zoom: z, textRendering: 'geometricPrecision' }} className="bg-white">{children}</div>
          </div>
        </div>
      </div>
    </dialog>, document.body,
  )
}
