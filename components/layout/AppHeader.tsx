import Link from 'next/link'

/**
 * AppHeader — the top bar on mobile and tablet.
 *
 * WHY IT EXISTS. `AppShell` had no header at all: below 1024px the only chrome
 * was the bottom navigation. That left three real problems on the screen size
 * most of these users are actually on:
 *
 *   1. **No way home from the top.** The natural gesture — tap the logo — had
 *      nothing to tap.
 *   2. **No brand present anywhere.** A user who arrives from a link, or
 *      returns after a week, saw a page with no name on it.
 *   3. **No trust signal.** `01_PRODUCT.md` §3 is blunt about this market:
 *      it is "trust-starved more than feature-starved", with documented scam
 *      behaviour targeting exactly this audience. A product with no visible
 *      identity is indistinguishable from the thing they are afraid of.
 *
 * DESKTOP DELIBERATELY DOES NOT GET THIS. The sidebar already carries the
 * wordmark, top-left, already linking to the dashboard. A second bar would be
 * the same thing twice — and a header that only exists to be consistent with
 * another header is chrome for its own sake.
 *
 * Sticky, because the way back should not require scrolling to the top first.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-edge bg-white/95 backdrop-blur-md lg:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        {/* The whole lockup is one target, not just the mark — a 2-character
            square is a precise tap, and this is the most-used escape hatch in
            the product. */}
        <Link
          href="/dashboard"
          aria-label="GCC MENTOR — go to your dashboard"
          className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-bp px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-bp bg-signal font-mono text-[13px] font-semibold text-white"
          >
            G
          </span>
          <span className="font-bp-display text-[14px] font-bold tracking-[-0.01em] text-graphite">
            GCC MENTOR
          </span>
        </Link>

        {/* The one thing worth saying beside the name. It is the product's
            actual promise and the reason someone in this market would trust it
            — see 02_PHILOSOPHY.md. Hidden on the narrowest phones, where the
            wordmark alone has to be enough. */}
        <span className="hidden text-[12px] font-medium text-slate min-[380px]:inline">
          Nothing invented
        </span>
      </div>
    </header>
  )
}
