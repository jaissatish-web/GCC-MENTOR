'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Mobile bottom nav — app shell (TASK-004), matching screen D1 in
 * design-reference/MVP Screens.dc.html. Home / Library / Profile.
 * Library is a section of the /dashboard shell (docs/USER_FLOW.md step 11).
 * Only visible below the lg breakpoint; the desktop sidebar replaces it.
 */
const NAV_ITEMS = [
  { label: 'Home', href: '/dashboard', glyph: '◆' },
  { label: 'Library', href: '/dashboard', glyph: '▤' },
  { label: 'Profile', href: '/profile', glyph: '◔' },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-marble px-4 pb-4 pt-2 lg:hidden">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              'flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg px-3 text-[10px]',
              active ? 'font-semibold text-midnight' : 'font-medium text-ink-warm'
            )}
          >
            <span className="text-[15px] leading-none">{item.glyph}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
