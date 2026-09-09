import Link from 'next/link'
import { ServicesMenu } from './ServicesMenu'

/**
 * AppHeader — the top bar, on every signed-in page and every screen size.
 *
 * LOGO LEFT, THREE-BAR RIGHT. Both are founder requests: the wordmark links
 * home from anywhere (2026-09-08), and the menu opens every service from
 * anywhere (2026-09-09).
 *
 * IT IS NO LONGER MOBILE-ONLY. This used to be `lg:hidden`, on the reasoning
 * that the desktop sidebar already carried the wordmark so a second bar was
 * chrome for its own sake. That was right for a bar that only held a logo. It
 * stopped being right when the bar gained the services menu: the menu is the
 * only place the full list — including what is not built yet — appears in one
 * view, and "any time" cannot mean "unless you are on a laptop".
 *
 * THE BAR HOLDS TWO THINGS AND NOTHING ELSE. "Nothing invented" used to sit
 * between them; the founder removed it on 2026-09-09 and the call is right.
 * The promise belongs where someone is deciding whether to trust the product —
 * the footer of every signed-in page, the login screen's trust strip, and the
 * moment they hand over a CV — not repeated above every screen they have
 * already chosen to be on. Repetition is how a claim stops being read.
 *
 * Sticky, because the way back should not require scrolling to the top first.
 */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4 sm:px-6">
        {/* The whole lockup is one target, not just the mark — a one-character
            square is a precise tap, and this is the most-used escape hatch in
            the product. */}
        <Link
          href="/dashboard"
          aria-label="GCC MENTOR — go to your dashboard"
          className="-mx-2 flex min-h-11 items-center gap-2.5 rounded-ctl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-ctl bg-teal font-display text-[14px] font-bold text-white"
          >
            G
          </span>
          <span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">
            GCC MENTOR
          </span>
        </Link>

        <ServicesMenu />
      </div>
    </header>
  )
}
