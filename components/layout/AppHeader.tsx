'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ServicesMenu } from './ServicesMenu'

/** Shared workspace header; every viewport can open the complete services drawer. */
export function AppHeader() {
  const home = usePathname() === '/dashboard'
  return (
    <header data-mobile-header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md">
      <div className={`mx-auto flex h-14 max-w-[1400px] items-center gap-3 page-gutter`}>
        {/* The whole lockup is one target, not just the mark — a one-character
            square is a precise tap, and this is the most-used escape hatch in
            the product. */}
        <Link
          href="/dashboard"
          aria-label="GCC MENTOR — go to your dashboard"
          className="mobile-wordmark -mx-2 flex min-h-11 items-center gap-2.5 rounded-ctl px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
        >
          <span
            aria-hidden="true"
            className="mobile-brand-mark flex size-8 items-center justify-center rounded-ctl bg-teal font-display text-[14px] font-bold text-white"
          >
            G
          </span>
          <span className="flex flex-col"><span className="font-display text-[15px] font-bold tracking-[-0.01em] text-ink">GCC <span className="text-teal">MENTOR</span></span><span className={`mobile-brand-caption text-[12px] leading-4 text-ink-muted ${home ? 'md:hidden' : ''}`}>Your Gulf career workspace</span></span>
        </Link>

        <div className="ml-auto"><ServicesMenu /></div>
      </div>
    </header>
  )
}
