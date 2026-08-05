'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

/**
 * Desktop sidebar — app shell (TASK-004), matching screen D2 in
 * design-reference/MVP Screens.dc.html. Dark midnight rail, 224px, brand
 * mark, the five Phase-1 nav sections and a pinned "Need help?" card.
 *
 * Library lives inside the /dashboard shell per docs/USER_FLOW.md step 11,
 * and there is no dedicated /payments route in Phase 1 — both link to
 * /dashboard to avoid dead links until their own screens exist.
 */
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Library', href: '/dashboard' },
  { label: 'Career Profile', href: '/profile' },
  { label: 'Payments', href: '/dashboard' },
  { label: 'Settings', href: '/settings' },
]

export function Sidebar() {
  const pathname = usePathname()

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`)

  return (
    <aside className="hidden w-[224px] flex-none flex-col gap-[26px] bg-midnight px-[18px] py-6 lg:flex">
      {/* Brand mark */}
      <div className="flex items-center gap-2.5">
        <div className="font-serif flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-gold text-sm text-midnight">
          P
        </div>
        <div className="text-[13px] font-semibold text-marble">[Product Name]</div>
      </div>

      {/* Primary nav */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex min-h-11 items-center rounded-[9px] px-3 text-[12.5px] transition-colors',
                active
                  ? 'bg-marble/10 font-semibold text-marble'
                  : 'font-medium text-marble/65 hover:bg-marble/5 hover:text-marble'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Help card */}
      <div className="mt-auto flex flex-col gap-1.5 rounded-xl border border-sand/15 bg-marble/5 p-3.5">
        <div className="text-[11px] font-semibold leading-normal text-gold-light">Need help?</div>
        <div className="text-[10.5px] leading-snug text-marble/60">
          Email the founder — replies within a day.
        </div>
      </div>
    </aside>
  )
}
