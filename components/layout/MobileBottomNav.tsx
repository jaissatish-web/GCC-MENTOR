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
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line-dark bg-forest-deep-dark/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden"
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
              'flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-[10px] leading-tight font-redesign-sans transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold',
              active ? 'font-semibold text-redesign-gold' : 'font-medium text-ink-400-dark'
            )}
          >
            <Icon className={cn('size-5 shrink-0', active ? 'text-redesign-gold' : 'text-ink-400-dark')} />
            {item.label}
          </Link>
        )
      })}

      {/* More — opens the bottom drawer with every remaining destination */}
      <MoreSheet />
    </nav>
  )
}
