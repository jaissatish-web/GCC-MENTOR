'use client'

import * as React from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import Link from 'next/link'

/**
 * The public site header.
 *
 * REBUILT IN MERIDIAN 2026-09-09, with the landing page. It was the last piece
 * of chrome still on the navy palette, which meant a visitor met one design in
 * the header and another in the page under it.
 *
 * The CTA is the FREE scorecard, never signup: it needs no login, returns a
 * real result in one step, and is the designed top of the funnel.
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
 * `scripts/verify-landing-anchors.ts` now checks every href here against the
 * real ids in `app/page.tsx`. Run it after touching either file.
 */
const ITEMS = [
  ['The path', '#path'],
  ['Not built yet', '#roadmap'],
  ['Who built it', '#about'],
  ['Pricing', '#pricing'],
  ['Questions', '#faq'],
] as const

export function SiteNav() {
  const [open, setOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[68px] max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-12">
        <Link
          href="/"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
        >
          <span className="flex size-9 items-center justify-center rounded-ctl bg-teal font-display text-[16px] font-bold text-white">
            G
          </span>
          <span className="font-display text-[16px] font-bold tracking-[-0.01em] text-ink">
            GCC MENTOR
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
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

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-ctl px-2 py-2 text-[13.5px] font-semibold text-ink-soft hover:text-teal sm:inline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            Log in
          </Link>
          <Link
            href="/gulf-readiness-score"
            className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}
          >
            Score my CV free
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="flex size-11 items-center justify-center rounded-ctl bg-teal-soft text-teal lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
          >
            {open ? <XMarkIcon className="size-5" /> : <Bars3Icon className="size-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-white px-5 py-4 lg:hidden">
          <nav className="mx-auto flex max-w-[1240px] flex-col gap-1">
            {ITEMS.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="min-h-11 rounded-ctl px-3 py-3 text-[15px] font-semibold text-ink hover:bg-teal-soft"
              >
                {label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="min-h-11 rounded-ctl px-3 py-3 text-[15px] font-semibold text-ink hover:bg-teal-soft sm:hidden"
            >
              Log in
            </Link>
            <Link
              href="/gulf-readiness-score"
              onClick={() => setOpen(false)}
              className={cn(buttonVariants({ variant: 'primary' }), 'mt-2 w-full')}
            >
              Score my CV free
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  )
}

export default SiteNav
