'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Squares2X2Icon,
  UserCircleIcon,
  DocumentTextIcon,
  BookOpenIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline'
import { MoreSheet } from './MoreSheet'

/**
 * Mobile bottom nav — redesigned per docs/redesign/DESIGN_SYSTEM.md §8.3.
 *
 * Five slots across the bottom bar: Dashboard · Career Profile · Resume
 * Optimizer · Library · More. The "More" slot opens a bottom drawer with
 * the remaining five destinations (GCC Readiness, Job Match, Cover Letter,
 * Payments, Settings).
 *
 * Only visible below the md breakpoint; the desktop or tablet sidebar
 * replaces it on larger screens.
 */
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: Squares2X2Icon },
  { label: 'Career Profile', href: '/profile', icon: UserCircleIcon },
  { label: 'Resume Optimizer', href: '/optimize/target', icon: DocumentTextIcon },
  { label: 'Library', href: '/dashboard/library', icon: BookOpenIcon },
] as const

export function MobileBottomNav() {
  const pathname = usePathname()

  // Exact match for active state.
  const isActive = (href: string) => pathname === href

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line-dark bg-forest-deep-dark/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:hidden">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                'flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[10.5px] font-redesign-sans transition-colors',
                active
                  ? 'font-semibold text-redesign-gold'
                  : 'font-medium text-ink-400-dark'
              )}
            >
              <Icon
                className={cn(
                  'size-5',
                  active ? 'text-redesign-gold' : 'text-ink-400-dark'
                )}
              />
              {item.label}
            </Link>
          )
        })}

        {/* More — opens the bottom drawer */}
        <MoreSheet />
      </nav>
    </>
  )
}