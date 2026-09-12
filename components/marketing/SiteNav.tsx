import Link from 'next/link'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { PublicMenu } from './PublicMenu'

/**
 * The public site header.
 *
 * LOG IN AND SIGN UP ARE ALWAYS REACHABLE (founder request 2026-09-10). The
 * previous header hid "Log in" on phones, had no sign-up at all, and showed
 * the three-bar only below 1024px. An existing user on a phone — the person
 * most likely to come back — had to open a dropdown to find the way in.
 *
 * WHAT FITS WHERE, measured rather than hoped for:
 *   · Every width: the wordmark, "Log in", and the three-bar.
 *   · From 640px: "Sign up free" joins them. Below that there is not room
 *     for four things beside the wordmark on a 375px phone, so sign-up lives
 *     at the top of the three-bar panel instead — the first thing it shows —
 *     and the hero repeats the free start directly under the fold line.
 *   · From 1024px: the section links appear in the middle.
 *
 * THIS REVERSES A STATED DECISION. The header CTA used to be the free
 * scorecard, deliberately "never signup", because the scorecard is the designed
 * top of the funnel. The founder chose account access over that; the scorecard
 * is still the hero's primary action and the first service in the menu, so the
 * funnel's front door is unchanged — the header just stops hiding the others.
 *
 * Server component: nothing here holds state. The only interactive part is the
 * menu, which is its own client component.
 */

/**
 * THE ANCHORS HAVE DRIFTED TWICE, so they are now tested.
 *
 * First "How It Works" pointed at `#how-it-works` after the section became
 * `#how`. Then the landing page was rebuilt from a feature list into the guided
 * path, and four of five entries pointed at sections that no longer existed.
 * Both times the build, the types and the lint all passed — a link to a missing
 * fragment is valid HTML that silently does nothing.
 *
 * `scripts/verify-landing-anchors.ts` checks every href here against the real
 * ids in `app/page.tsx`. Run it after touching either file. The same list feeds
 * the three-bar panel, so it cannot drift from the header either.
 */
const ITEMS = [
  ['Pain points', '#pain'],
  ['Services', '#services'],
  ['Templates', '#templates'],
  ['Interview prep', '#interview'],
  ['Pricing', '#pricing'],
  ['FAQ', '#faq'],
] as const

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-3 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
        >
          <span className="flex size-9 items-center justify-center rounded-ctl bg-teal font-display text-[16px] font-bold text-white">
            G
          </span>
          <span className="font-display text-[16px] font-bold tracking-[-0.01em] text-ink">GCC MENTOR</span>
        </Link>

        <nav aria-label="Sections" className="hidden items-center gap-1 lg:flex">
          {ITEMS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-ctl px-3 py-2 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-teal-soft hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          <Link
            href="/login"
            className="flex min-h-11 items-center rounded-ctl px-2.5 text-[14px] font-semibold text-teal transition-colors hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}
          >
            Sign up free
          </Link>
          <PublicMenu anchors={ITEMS} />
        </div>
      </div>
    </header>
  )
}

export default SiteNav
