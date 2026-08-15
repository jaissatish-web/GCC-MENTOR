'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  NAV_ITEMS,
  PLANNED_NAV_ITEMS,
  isNavItemActive,
  navHref,
  type NavItem as NavItemType,
} from './navItems'

/**
 * Desktop sidebar — per docs/redesign/DESIGN_SYSTEM.md §8.1–8.2.
 *
 * The destination list now lives in ./navItems so this rail, the mobile
 * bottom bar and the More drawer cannot drift apart. Planned services appear
 * under their own "Coming soon" heading as dimmed, non-interactive rows —
 * founder decision 2026-08-15, recorded in docs/redesign/PLANNED_SERVICES.md.
 *
 * Desktop (≥1024px): full 248px sidebar with labels.
 * Tablet (768–1023px): 48px icon-only bar; tap expands into a labeled
 * overlay that sits above the page content.
 * Mobile (<768px): hidden — handled by MobileBottomNav + MoreSheet.
 */

/**
 * The "Coming soon" group.
 *
 * Rendered as plain <div>s, not buttons or links: there is nothing to activate,
 * and a disabled control still takes focus in some browsers, which would put a
 * keyboard user on an item that does nothing. Marked aria-disabled so assistive
 * tech announces the state rather than the user discovering it by trying.
 */
function PlannedGroup() {
  return (
    <div className="mt-6 flex flex-col gap-1">
      <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400-dark/70">
        Coming soon
      </div>
      {PLANNED_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            aria-disabled="true"
            className="flex min-h-11 cursor-default items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium text-ink-400-dark/55"
          >
            <Icon className="size-5 shrink-0 text-ink-400-dark/45" />
            <span className="flex-1 truncate">{item.label}</span>
            <span className="shrink-0 rounded-[5px] border border-line-dark px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-400-dark/70">
              Soon
            </span>
          </div>
        )
      })}
    </div>
  )
}

function BrandMark() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-redesign-gold text-[15px] font-bold text-forest-deep shadow-redesign-sm">
        G
      </div>
      <span className="text-[14px] font-semibold text-ink-900-dark">GCC MENTOR</span>
    </Link>
  )
}

function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItemType
  active: boolean
  collapsed: boolean
  onClick?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      key={item.label}
      href={navHref(item)}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-xl text-[13.5px] font-redesign-sans transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2 focus-visible:ring-offset-forest-deep-dark',
        collapsed ? 'justify-center px-0' : 'px-3',
        active
          ? 'border border-redesign-gold/25 bg-redesign-gold/[0.09] font-semibold text-redesign-gold'
          : 'border border-transparent font-medium text-ink-400-dark hover:bg-marble/[0.05] hover:text-ink-900-dark'
      )}
    >
      <Icon
        className={cn('size-5 shrink-0', active ? 'text-redesign-gold' : 'text-ink-400-dark')}
      />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const [tabletExpanded, setTabletExpanded] = useState(false)

  // Prefix-aware except for Dashboard — see isNavItemActive for why.
  const isActive = (item: NavItemType) => isNavItemActive(item, pathname ?? '')

  // Shared nav content rendered inside both desktop and tablet overlays.
  const navContent = (
    <>
      <BrandMark />
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.label} item={item} active={isActive(item)} collapsed={false} />
        ))}
        <PlannedGroup />
      </nav>
      <div className="mt-auto flex flex-col gap-1.5 rounded-2xl border border-line-dark bg-surface-dark p-4 shadow-sm">
        <div className="text-[12px] font-semibold leading-normal text-redesign-gold">Need help?</div>
        <div className="text-[11.5px] leading-snug text-ink-400-dark">
          Email the founder — replies within a day.
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar — ≥1024px */}
      <aside className="hidden w-[248px] flex-none flex-col gap-7 border-r border-line-dark bg-forest-deep-dark px-4 py-6 lg:flex">
        {navContent}
      </aside>

      {/* Tablet collapsed sidebar — 768–1023px */}
      <aside className="relative hidden w-[48px] flex-none flex-col items-center gap-5 border-r border-line-dark bg-forest-deep-dark px-2 py-4 md:flex lg:hidden">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-redesign-gold text-[15px] font-bold text-forest-deep shadow-redesign-sm"
        >
          G
        </Link>
        <nav className="flex flex-col items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setTabletExpanded(true)
                }}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl text-[13.5px] font-redesign-sans transition-colors',
                  active
                    ? 'border border-redesign-gold/25 bg-redesign-gold/[0.09] font-semibold text-redesign-gold'
                    : 'border border-transparent font-medium text-ink-400-dark hover:bg-marble/[0.05] hover:text-ink-900-dark'
                )}
                title={item.label}
              >
                <Icon className={cn('size-5 shrink-0', active ? 'text-redesign-gold' : 'text-ink-400-dark')} />
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Tablet expanded overlay */}
      {tabletExpanded && (
        <div className="fixed inset-0 z-40 md:flex lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-forest-deep/60 backdrop-blur-sm"
            onClick={() => setTabletExpanded(false)}
          />
          {/* Slide-in drawer */}
          <aside className="relative z-10 flex w-[280px] flex-none flex-col gap-7 border-r border-line-dark bg-forest-deep-dark px-4 py-6 shadow-redesign-lg">
            <button
              type="button"
              onClick={() => setTabletExpanded(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400-dark hover:text-ink-900-dark"
              aria-label="Close navigation"
            >
              ✕
            </button>
            <BrandMark />
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <NavItem
                  key={item.label}
                  item={item}
                  active={isActive(item)}
                  collapsed={false}
                  onClick={() => setTabletExpanded(false)}
                />
              ))}
              <PlannedGroup />
            </nav>
            <div className="mt-auto flex flex-col gap-1.5 rounded-2xl border border-line-dark bg-surface-dark p-4 shadow-sm">
              <div className="text-[12px] font-semibold leading-normal text-redesign-gold">Need help?</div>
              <div className="text-[11.5px] leading-snug text-ink-400-dark">
                Email the founder — replies within a day.
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}