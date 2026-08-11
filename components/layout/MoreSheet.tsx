'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ShieldCheckIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  CreditCardIcon,
  Cog6ToothIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline'

/**
 * MoreSheet — mobile bottom drawer (DESIGN_SYSTEM.md §8.3).
 *
 * Lists every destination not in the 5-slot bottom bar: GCC Readiness,
 * Job Match, Cover Letter, Payments, Settings. Opens from the "More" tab
 * in MobileBottomNav. Dismiss on backdrop tap or close button.
 */
const MORE_ITEMS = [
  { label: 'GCC Readiness', href: '/gcc-readiness', icon: ShieldCheckIcon },
  { label: 'Job Match', href: '/job-match', icon: MagnifyingGlassIcon },
  { label: 'Cover Letter', href: '/cover-letter', icon: EnvelopeIcon },
  { label: 'Payments', href: '/payments', icon: CreditCardIcon },
  { label: 'Settings', href: '/settings', icon: Cog6ToothIcon },
] as const

export function MoreSheet() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* More trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10.5px] font-redesign-sans transition-colors',
          open
            ? 'font-semibold text-redesign-gold'
            : 'font-medium text-ink-400-dark'
        )}
        aria-label="More destinations"
      >
        <EllipsisHorizontalIcon
          className={cn(
            'size-5',
            open ? 'text-redesign-gold' : 'text-ink-400-dark'
          )}
        />
        More
      </button>

      {/* Backdrop + drawer */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-forest-deep/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Drawer */}
          <div
            className={cn(
              'relative z-10 w-full rounded-t-2xl border-t border-line-dark bg-surface-dark p-5 shadow-redesign-lg',
              'animate-in slide-in-from-bottom'
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-ink-900-dark font-redesign-sans">More</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400-dark hover:text-ink-900-dark"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[13.5px] font-redesign-sans transition-colors',
                      active
                        ? 'border border-redesign-gold/25 bg-redesign-gold/[0.09] font-semibold text-redesign-gold'
                        : 'border border-transparent font-medium text-ink-400-dark hover:bg-marble/[0.05] hover:text-ink-900-dark'
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-5 shrink-0',
                        active ? 'text-redesign-gold' : 'text-ink-400-dark'
                      )}
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