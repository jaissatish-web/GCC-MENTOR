'use client'

import { useEffect, useState } from 'react'
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
      {/* Red, at the founder's request (2026-09-09), so every unbuilt thing in
          the product can be found by scanning rather than remembering. */}
      <div className="px-3 pb-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-alert">
        Not built yet
      </div>
      {PLANNED_NAV_ITEMS.map((item) => {
        const Icon = item.icon
        return (
          <div
            key={item.label}
            aria-disabled="true"
            className="flex min-h-11 cursor-default items-center gap-3 rounded-xl px-3 text-[14px] font-medium text-ink-muted"
          >
            <Icon className="size-5 shrink-0 text-alert/70" />
            <span className="flex-1 truncate">{item.label}</span>
            <span className="shrink-0 rounded-full border border-alert/35 bg-alert-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-alert">
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
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-[15px] font-bold text-white shadow-redesign-sm">
        G
      </div>
      <span className="text-[14px] font-semibold text-ink">GCC MENTOR</span>
    </Link>
  )
}

function NavItem({
  item,
  active,
  collapsed,
  onClick,
  pending = false,
}: {
  item: NavItemType
  active: boolean
  collapsed: boolean
  onClick?: () => void
  /**
   * The destination exists but the user has not set it up yet.
   *
   * Still a real link — they are sent here straight after extraction, so it
   * must be reachable and must not move around the menu later. It is only
   * presented as not-yet-started.
   */
  pending?: boolean
}) {
  const Icon = item.icon
  return (
    <Link
      key={item.label}
      href={navHref(item)}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-ctl text-[14px] font-redesign-sans transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        collapsed ? 'justify-center px-0' : 'px-3',
        pending && !active && 'opacity-60',
        active
          ? 'border border-teal/30 bg-teal-soft font-semibold text-teal'
          : 'border border-transparent font-medium text-ink-soft hover:bg-canvas hover:text-ink'
      )}
    >
      <Icon
        className={cn('size-5 shrink-0', active ? 'text-teal' : 'text-ink-muted')}
      />
      {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
      {!collapsed && pending ? (
        <span className="shrink-0 rounded-[5px] border border-line px-1.5 py-0.5 text-[12px] font-semibold uppercase tracking-wider text-ink-muted/70">
          Set up
        </span>
      ) : null}
    </Link>
  )
}

/**
 * Cached across client-side navigations.
 *
 * The shell re-renders on every route change, and re-asking whether the user
 * has a profile each time would add a request per navigation for a fact that
 * changes once. Module scope resets on a full page load, which is exactly when
 * it should be re-checked.
 */
let cachedHasProfile: boolean | null = null

export function Sidebar() {
  // Defaults to true so the nav never briefly tells an existing user that
  // their profile is missing while the check is in flight.
  const [hasProfile, setHasProfile] = useState<boolean>(cachedHasProfile ?? true)

  useEffect(() => {
    if (cachedHasProfile !== null) return
    fetch('/api/profile', { cache: 'no-store' })
      .then((res) => {
        // 404 is the documented "no profile yet" response, not an error.
        cachedHasProfile = res.status !== 404
        setHasProfile(cachedHasProfile)
      })
      .catch(() => {
        cachedHasProfile = true
      })
  }, [])
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
          <NavItem
            key={item.label}
            item={item}
            active={isActive(item)}
            collapsed={false}
            pending={Boolean(item.needsProfile) && !hasProfile}
          />
        ))}
        <PlannedGroup />
      </nav>
      <div className="mt-auto flex flex-col gap-1.5 rounded-card border border-line bg-canvas p-4">
        <div className="text-[12px] font-semibold leading-normal text-teal">Need help?</div>
        <div className="text-[12px] leading-snug text-ink-muted">
          Email the founder — replies within a day.
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar — ≥1024px */}
      {/* Pinned to the viewport on desktop (TASK-153), with NO scroller of its
          own (TASK-155, founder's call). It was a plain flex item, so on any long
          page the nav scrolled off the top. `sticky` + `h-dvh` holds it still;
          the `overflow-y-auto` that came with it added a second scrollbar beside
          the page's own, which read as clutter. The nav is nine items and fits a
          laptop screen, so it does not need one. */}
      <aside className="hidden w-[248px] flex-none flex-col gap-7 border-r border-line bg-white px-4 py-6 lg:sticky lg:top-0 lg:flex lg:h-dvh">
        {navContent}
      </aside>

      {/* Tablet collapsed sidebar — 768–1023px */}
      <aside className="relative hidden w-[48px] flex-none flex-col items-center gap-5 border-r border-line bg-white px-2 py-4 md:flex lg:hidden">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal text-[15px] font-bold text-white shadow-redesign-sm"
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
                  'flex h-11 w-11 items-center justify-center rounded-ctl text-[14px] font-redesign-sans transition-colors',
                  active
                    ? 'border border-teal/25 bg-teal/[0.09] font-semibold text-teal'
                    : 'border border-transparent font-medium text-ink-soft hover:bg-canvas hover:text-ink'
                )}
                title={item.label}
              >
                <Icon className={cn('size-5 shrink-0', active ? 'text-teal' : 'text-ink-muted')} />
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
            className="absolute inset-0 bg-teal/60 backdrop-blur-sm"
            onClick={() => setTabletExpanded(false)}
          />
          {/* Slide-in drawer */}
          <aside className="relative z-10 flex w-[280px] flex-none flex-col gap-7 border-r border-line bg-white px-4 py-6 shadow-redesign-lg">
            <button
              type="button"
              onClick={() => setTabletExpanded(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-ctl text-ink-muted hover:text-ink"
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
                  pending={Boolean(item.needsProfile) && !hasProfile}
                  onClick={() => setTabletExpanded(false)}
                />
              ))}
              <PlannedGroup />
            </nav>
            <div className="mt-auto flex flex-col gap-1.5 rounded-card border border-line bg-canvas p-4">
              <div className="text-[12px] font-semibold leading-normal text-teal">Need help?</div>
              <div className="text-[12px] leading-snug text-ink-muted">
                Email the founder — replies within a day.
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}