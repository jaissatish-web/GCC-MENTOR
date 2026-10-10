'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline'
import { LockClosedIcon } from '@heroicons/react/24/solid'
import { signOut } from '@/app/auth/actions'
import { cn } from '@/lib/utils'
import { useCurrentStage } from '@/components/journey/useCurrentStage'
import { type StageId } from '@/components/journey/stages'
import {
  NAV_GROUPS,
  NAV_ITEMS,
  isNavItemActive,
  navHref,
  type NavItem as NavItemType,
} from './navItems'

/**
 * Desktop sidebar — per docs/redesign/DESIGN_SYSTEM.md §8.1–8.2.
 *
 * A continuous service list with colored icons, without category headings.
 * Journey guidance remains on Dashboard; destinations retain their state marks.
 *
 * Desktop (≥1024px): full 248px sidebar with labels.
 * Tablet (768–1023px): 48px icon-only bar; tap expands into a labeled
 * overlay that sits above the page content.
 * Mobile (<768px): hidden — handled by MobileBottomNav + the header menu.
 */

function SignOutButton() {
  const [pending, setPending] = useState(false)
  return (
    <form action={signOut} onSubmit={() => setPending(true)}>
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-10 w-full items-center gap-3 rounded-ctl px-3 text-[13px] font-medium text-ink-soft hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-60"
      >
        <ArrowRightStartOnRectangleIcon className="size-5 text-ink-muted" />
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    </form>
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
  onClick,
  mark = null,
}: {
  item: NavItemType
  active: boolean
  onClick?: () => void
  /**
   * Where this destination sits against the user's progress:
   * 'next' — the first item of the step they are on (gold "Next" tag);
   * 'locked' — a later step (dimmed, lock icon, still a real link: each page
   * says what it needs first, so nothing is a dead end).
   */
  mark?: 'next' | 'locked' | null
}) {
  const Icon = item.icon
  return (
    <Link
      href={navHref(item)}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      title={mark === 'locked' ? 'Opens after the step before it' : undefined}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-ctl px-3 py-1.5 text-[14px] font-redesign-sans transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        active
          ? 'border border-teal/30 bg-teal-soft font-medium text-teal'
          : mark === 'locked'
            ? 'border border-transparent font-medium text-ink-muted hover:bg-canvas'
            : 'border border-transparent font-medium text-ink-soft hover:bg-canvas hover:text-ink'
      )}
    >
      <span aria-hidden="true" className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', item.iconClass, mark === 'locked' && !active && 'opacity-70')}>
        <Icon className="size-[18px]" />
      </span>
      {/* Wraps rather than truncating: "Resume Optimizer" beside the "Next"
          tag was cut to "Resume Opti…" (audit 2026-10-04, D7). */}
      <span className="min-w-0 flex-1 leading-tight">{item.label}</span>
      {mark === 'next' ? (
        <span className="shrink-0 rounded-full bg-gold px-2 py-0.5 text-[12px] font-bold leading-tight text-ink">Next</span>
      ) : null}
      {mark === 'locked' ? (
        <>
          <LockClosedIcon aria-hidden="true" className="size-3.5 shrink-0 text-ink-muted/70" />
          <span className="sr-only">(opens after the step before it)</span>
        </>
      ) : null}
    </Link>
  )
}

export function Sidebar() {
  const snap = useCurrentStage()
  const states = snap ? snap.states : null
  const pathname = usePathname()
  const [tabletExpanded, setTabletExpanded] = useState(false)

  // Prefix-aware except for Dashboard — see isNavItemActive for why.
  const isActive = (item: NavItemType) => isNavItemActive(item, pathname ?? '')

  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.hrefs.map((h) => NAV_ITEMS.find((i) => i.href === h)).filter((i): i is NavItemType => Boolean(i)),
  }))
  const markFor = (stage: StageId | undefined, index: number): 'next' | 'locked' | null => {
    if (!stage || !states) return null
    if (states[stage] === 'locked') return 'locked'
    if (states[stage] === 'current' && index === 0) return 'next'
    return null
  }

  const navContent = (onNavigate?: () => void) => (
    <>
      <BrandMark />
      <nav aria-label="Primary" className="flex flex-col gap-2">
        {groups.map((g) => {
          return (
            <div key={g.key} className="flex flex-col gap-0.5">
              {g.items.map((item, i) => (
                <NavItem key={item.label} item={item} active={isActive(item)} mark={markFor(g.stage, i)} onClick={onNavigate} />
              ))}
            </div>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
        <a
          href="mailto:jaissatish@gmail.com"
          className="flex min-h-10 items-center rounded-ctl px-3 text-[13px] font-medium text-ink-soft hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
        >
          Help · jaissatish@gmail.com
        </a>
        <SignOutButton />
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar — ≥1024px. Pinned, and scrollable inside itself when
          the screen is short (founder, 2026-09-17). */}
      <aside className="hidden w-[248px] flex-none flex-col gap-6 overflow-y-auto overscroll-contain border-r border-line bg-white px-4 py-6 [scrollbar-width:thin] lg:sticky lg:top-0 lg:flex lg:h-dvh">
        {navContent()}
      </aside>

      {/* Tablet collapsed sidebar — 768–1023px */}
      <aside className="relative hidden w-[64px] flex-none flex-col items-center gap-5 overflow-y-auto overscroll-contain border-r border-line bg-white px-2 py-4 [scrollbar-width:none] md:flex lg:hidden">
        {/* No logo here (2026-09-24): on a tablet the top bar beside this rail
            already carries it, and two "G" marks side by side read as a bug. */}
        <nav className="flex flex-col items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const active = isActive(item)
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setTabletExpanded(true)}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-ctl text-[14px] font-redesign-sans transition-colors',
                  active
                    ? 'border border-teal/25 bg-teal/[0.09] font-semibold text-teal'
                    : 'border border-transparent font-medium text-ink-soft hover:bg-canvas hover:text-ink'
                )}
                title={item.label}
              >
                <span aria-hidden="true" className={cn('flex size-8 items-center justify-center rounded-lg', item.iconClass)}><Icon className="size-[18px]" /></span>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Tablet expanded overlay — the same grouped content as desktop. */}
      {tabletExpanded && (
        <div className="fixed inset-0 z-40 md:flex lg:hidden">
          <div className="absolute inset-0 bg-teal/60 backdrop-blur-sm" onClick={() => setTabletExpanded(false)} />
          <aside className="relative z-10 flex w-[280px] flex-none flex-col gap-6 overflow-y-auto overscroll-contain border-r border-line bg-white px-4 py-6 shadow-redesign-lg [scrollbar-width:thin]">
            <button
              type="button"
              onClick={() => setTabletExpanded(false)}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-ctl text-ink-muted hover:text-ink"
              aria-label="Close navigation"
            >
              ✕
            </button>
            {navContent(() => setTabletExpanded(false))}
          </aside>
        </div>
      )}
    </>
  )
}
