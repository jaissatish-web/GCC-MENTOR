'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { MOBILE_PRIMARY_ITEMS, isNavItemActive, navHref } from './navItems'
import { MoreSheet } from './MoreSheet'

/**
 * Mobile bottom nav — DESIGN_SYSTEM.md §8.3.
 *
 * Four pinned destinations plus "More". Which four is decided in ./navItems
 * (MOBILE_PRIMARY_HREFS) rather than re-listed here, so the bar can never
 * disagree with the sidebar about labels, icons, order or routes — it had
 * already drifted once, still showing "Library" after the rail was renamed.
 *
 * Only visible below the md breakpoint; the tablet/desktop sidebar takes over
 * above it.
 */
export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      // BLUEPRINT (2026-09-08). Was a dark navy bar with a GOLD active state,
      // which fought the oxide signal the moment the dashboard changed — two
      // accents on one screen, and neither reading as "the important one".
      // White bar, hairline top, signal for the current tab: the same colour
      // that marks the primary action everywhere else.
      // Contrast checked: signal 5.18:1 and slate 5.51:1 on white.
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden"
    >
      {MOBILE_PRIMARY_ITEMS.map((item) => {
        const Icon = item.icon
        const active = isNavItemActive(item, pathname ?? '')
        return (
          <Link
            key={item.label}
            href={navHref(item)}
            aria-current={active ? 'page' : undefined}
            className={cn(
              // flex-1, not a 64px minimum: five 64px slots plus the bar's
              // padding is 336px, wider than a 320px phone.
              'flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-ctl px-0.5 text-center text-[12px] leading-tight font-redesign-sans transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
              active ? 'font-semibold text-teal' : 'font-medium text-ink-muted'
            )}
          >
            <Icon className={cn('size-5 shrink-0', active ? 'text-teal' : 'text-ink-muted')} />
            {item.shortLabel ?? item.label}
          </Link>
        )
      })}

      {/* More — opens the bottom drawer with every remaining destination */}
      <MoreSheet />
    </nav>
  )
}
