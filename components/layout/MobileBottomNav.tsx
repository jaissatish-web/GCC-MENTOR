'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Mobile bottom nav — app shell (TASK-004), dark-redesigned 2026-08-07.
 * Home / Library / Profile — same three real routes as before, restyled
 * only. Library is at /dashboard/library (TASK-035). Only visible below the
 * lg breakpoint; the desktop sidebar replaces it.
 *
 * The raised center button is new this pass: it goes straight to
 * /optimize/target (the real, existing "start an optimization" entry
 * point — not a new feature, just a shortcut to one that already exists),
 * matching the phase brief's mobile hierarchy ask for a clear primary
 * action within reach of the thumb.
 */
const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', glyph: '◆' },
  { label: 'Library', href: '/dashboard/library', glyph: '▤' },
]
const NAV_ITEMS_RIGHT = [{ label: 'Profile', href: '/profile', glyph: '◎' }]

export function MobileBottomNav() {
  const pathname = usePathname()

  // Exact match so each screen highlights exactly one nav item — avoids
  // prefix-matching false positives (e.g. /dashboard/library would otherwise
  // light "Home" too).
  const isActive = (href: string) => pathname === href

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const active = isActive(item.href)
    return (
      <Link
        key={item.label}
        href={item.href}
        className={cn(
          'flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-3 text-[10.5px] transition-colors',
          active ? 'font-semibold text-gold-light' : 'font-medium text-marble/45'
        )}
      >
        <span className="text-[16px] leading-none">{item.glyph}</span>
        {item.label}
      </Link>
    )
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-void/95 px-4 pb-[max(10px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md lg:hidden">
      <div className="relative flex items-center justify-around">
        {NAV_ITEMS.map(renderItem)}

        {/* Raised primary action — real route, not a placeholder */}
        <Link
          href="/optimize/target"
          aria-label="Start a new optimization"
          className="relative -mt-7 flex h-14 w-14 flex-none items-center justify-center rounded-full bg-gold text-[22px] font-bold text-midnight shadow-glow-gold-lg transition-transform active:scale-95 motion-reduce:transition-none"
        >
          +
        </Link>

        {NAV_ITEMS_RIGHT.map(renderItem)}
      </div>
    </nav>
  )
}
