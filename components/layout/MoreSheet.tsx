'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline'
import { MOBILE_MORE_ITEMS, isNavItemActive, navHref } from './navItems'

/**
 * MoreSheet — mobile bottom drawer (DESIGN_SYSTEM.md §8.3).
 *
 * Renders whatever ./navItems did not pin to the bottom bar, so every
 * destination stays reachable on a phone and the drawer cannot fall out of
 * sync with the sidebar when the nav is reordered.
 */
export function MoreSheet() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] leading-tight font-redesign-sans transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold',
          open ? 'font-semibold text-redesign-gold' : 'font-medium text-ink-400-dark'
        )}
      >
        <EllipsisHorizontalIcon
          className={cn('size-5', open ? 'text-redesign-gold' : 'text-ink-400-dark')}
        />
        More
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          <div
            className="absolute inset-0 bg-forest-deep/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border-t border-line-dark bg-surface-dark p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-redesign-lg">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-redesign-sans text-sm font-semibold text-ink-900-dark">More</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-400-dark hover:text-ink-900-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <nav aria-label="More destinations" className="flex flex-col gap-1">
              {MOBILE_MORE_ITEMS.map((item) => {
                const Icon = item.icon
                const active = isNavItemActive(item, pathname ?? '')
                return (
                  <Link
                    key={item.label}
                    href={navHref(item)}
                    onClick={() => setOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] font-redesign-sans transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold',
                      active
                        ? 'border border-redesign-gold/25 bg-redesign-gold/[0.09] font-semibold text-redesign-gold'
                        : 'border border-transparent font-medium text-ink-400-dark hover:bg-marble/[0.05] hover:text-ink-900-dark'
                    )}
                  >
                    <Icon
                      className={cn('size-5 shrink-0', active ? 'text-redesign-gold' : 'text-ink-400-dark')}
                    />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </>
  )
}
