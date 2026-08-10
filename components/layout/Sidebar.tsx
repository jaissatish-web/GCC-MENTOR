'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Desktop sidebar — app shell (TASK-004), dark-redesigned 2026-08-07 (Phase 1
 * of the dashboard visual pass). Same five real routes as before, restyled
 * only — no route added or removed. "Resumes" was deliberately NOT added as
 * a separate nav item: Library already is the resumes list, and the phase
 * brief is explicit — never expose a nav destination that doesn't exist.
 *
 * Library lives at /dashboard/library (TASK-035), Payments at /payments
 * (not yet ticketed — see docs/TASKS.md).
 */
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', glyph: '◆' },
  { label: 'Career Profile', href: '/profile', glyph: '◎' },
  { label: 'Library', href: '/dashboard/library', glyph: '▤' },
  { label: 'Payments', href: '/payments', glyph: '◈' },
  { label: 'Settings', href: '/settings', glyph: '⚙' },
]

export function Sidebar() {
  const pathname = usePathname()

  // Exact match so each screen highlights exactly one nav item — avoids
  // prefix-matching false positives (e.g. /dashboard/library would otherwise
  // light "Dashboard" too).
  const isActive = (href: string) => pathname === href

  return (
    <aside className="hidden w-[248px] flex-none flex-col gap-7 border-r border-hairline/70 bg-void px-4 py-6 lg:flex">
      {/* Brand mark */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
        <div className="font-serif flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-[15px] text-midnight shadow-glow-gold">
          G
        </div>
        <div className="text-[14px] font-semibold text-marble">GCC MENTOR</div>
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] transition-colors',
                active
                  ? 'border border-gold/25 bg-gold/[0.09] font-semibold text-gold-light'
                  : 'border border-transparent font-medium text-marble/55 hover:bg-marble/[0.05] hover:text-marble'
              )}
            >
              <span className={cn('text-[15px]', active ? 'text-gold' : 'text-marble/35')}>
                {item.glyph}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Help card */}
      <div className="mt-auto flex flex-col gap-1.5 rounded-2xl border border-hairline bg-surface p-4 shadow-elev-1">
        <div className="text-[12px] font-semibold leading-normal text-gold-light">Need help?</div>
        <div className="text-[11.5px] leading-snug text-marble/55">
          Email the founder — replies within a day.
        </div>
      </div>
    </aside>
  )
}
