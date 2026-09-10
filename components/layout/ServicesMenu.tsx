'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Bars3Icon } from '@heroicons/react/24/outline'
import { SideSheet, SheetGroupLabel } from '@/components/ui/SideSheet'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, PLANNED_NAV_ITEMS, isNavItemActive, navHref, type NavItem } from './navItems'

/**
 * Every service, one tap away, from anywhere.
 *
 * Founder request 2026-09-09: "right side three bar so any time user can click
 * and see all option of services."
 *
 * IT SOLVES A REAL PROBLEM, not just a stylistic one. The bottom bar holds four
 * slots, so Templates, Cover Letter, the Optimizer and Settings were reachable
 * only through a "More" sheet that itself only existed on small screens — and
 * on desktop the planned services were visible in the rail while on a phone
 * they were two taps down. One menu, every breakpoint, same contents.
 *
 * "NOT BUILT YET" IS A GROUP, NOT A LINK. Mock Interview, Interview Q&A and
 * Saved Jobs render dashed, dimmed and WITHOUT an href — `PlannedNavItem` has
 * no href field at all, so they cannot accidentally become links later. This
 * audience is actively targeted by placement scams (`01_PRODUCT.md` §3), and a
 * menu row that looks live and goes nowhere is exactly the experience that
 * costs the trust this product is built on. Showing the roadmap is good;
 * letting someone tap into a dead end is not.
 *
 * WHY A SHEET FROM THE RIGHT. The trigger is top-right, so the panel arrives
 * from the side it was summoned from — a panel that flies in from the opposite
 * edge reads as a different object. It is also the reachable corner for a
 * right-handed thumb, which is how these users hold a phone on a site.
 *
 * THE PANEL ITSELF IS `components/ui/SideSheet.tsx`, shared with the public
 * site's menu. It is portalled to <body> because this trigger lives inside a
 * `backdrop-blur` header, and a backdrop filter makes its element the
 * containing block for fixed descendants — the first version of this menu was
 * 64px tall for exactly that reason. The fix lives in SideSheet once rather
 * than in two copies.
 *
 * NAVIGATION IS THE ONLY THING IT DOES. It reads `NAV_ITEMS`, the same array
 * the sidebar and the bottom bar read, so the three can never drift.
 */

/** Groups the flat nav list into something a person can scan. */
const GROUPS: ReadonlyArray<{ label: string; hrefs: readonly string[] }> = [
  { label: 'Your career', hrefs: ['/dashboard', '/profile', '/gcc-readiness'] },
  { label: 'Applications', hrefs: ['/dashboard/library', '/optimize', '/cover-letter', '/templates'] },
  { label: 'Account', hrefs: ['/settings'] },
]

/**
 * Every destination must appear in exactly one group.
 *
 * The first version of this file listed `/gcc-readiness` in a group while it
 * was not yet in `NAV_ITEMS`, and left `/dashboard` out of every group — so the
 * menu silently rendered without either, and a menu that quietly drops a
 * destination is worse than one that never had it. In development this now
 * says so out loud rather than looking fine.
 */
if (process.env.NODE_ENV !== 'production') {
  const grouped = new Set(GROUPS.flatMap((g) => g.hrefs))
  const missing = NAV_ITEMS.filter((i) => !grouped.has(i.href)).map((i) => i.href)
  if (missing.length > 0) {
    console.warn(`ServicesMenu: these destinations are in no group and will not appear — ${missing.join(', ')}`)
  }
}

/** A one-line "what is this" for rows whose name does not say it. */
const BLURB: Record<string, string> = {
  '/dashboard': 'Your next step, and where you stand',
  '/profile': 'Built once, used by every CV',
  '/gcc-readiness': 'How complete your Career Profile is',
  '/cover-letter': 'Four tones, written for one job',
  '/dashboard/library': 'Your applications and their stage',
  '/optimize': 'Build a CV for a specific role',
  '/templates': 'Fifteen designs to choose from',
}

function MenuRow({ item, onNavigate, active }: { item: NavItem; onNavigate: () => void; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={navHref(item)}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[52px] items-center gap-3 rounded-ctl bg-white px-3.5 py-3 shadow-m-1 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        active ? 'ring-1 ring-teal/30' : 'hover:bg-teal-soft/50',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-ctl',
          active ? 'bg-teal text-white' : 'bg-teal-soft text-teal',
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] font-semibold leading-tight text-ink">{item.label}</span>
        {BLURB[item.href] ? (
          <span className="truncate text-[12px] text-ink-muted">{BLURB[item.href]}</span>
        ) : null}
      </span>
      <span aria-hidden="true" className="ml-auto text-[16px] leading-none text-line-strong">
        &rsaquo;
      </span>
    </Link>
  )
}

export function ServicesMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname() ?? ''
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const close = useCallback(() => setOpen(false), [])

  // A route change closes it. Without this, tapping a row on a slow connection
  // leaves the sheet sitting over the page it just navigated to.
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const itemFor = (href: string) => NAV_ITEMS.find((i) => i.href === href)

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="All services"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="ml-auto flex size-10 shrink-0 flex-col items-center justify-center gap-[3.5px] rounded-ctl bg-teal-soft transition-colors hover:bg-teal/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
      >
        <Bars3Icon className="size-5 text-teal" />
      </button>

      <SideSheet open={open} onClose={close} title="All services" returnFocusTo={triggerRef}>
        {GROUPS.map((group) => {
          const rows = group.hrefs.map(itemFor).filter(Boolean) as NavItem[]
          if (rows.length === 0) return null
          return (
            <div key={group.label} className="flex flex-col gap-2">
              <SheetGroupLabel>{group.label}</SheetGroupLabel>
              {rows.map((item) => (
                <MenuRow key={item.href} item={item} active={isNavItemActive(item, pathname)} onNavigate={close} />
              ))}
            </div>
          )
        })}

        {/* Roadmap, and deliberately not links — see the note at the top of this
            file. `PlannedNavItem` carries no href by design. Red, so the
            roadmap is countable at a glance before launch. */}
        <div className="flex flex-col gap-2">
          <SheetGroupLabel tone="alert">Not built yet</SheetGroupLabel>
          {PLANNED_NAV_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.label}
                aria-disabled="true"
                className="flex min-h-[52px] items-center gap-3 rounded-ctl border border-dashed border-alert/40 bg-alert-soft/30 px-3.5 py-3"
              >
                <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-ctl bg-alert-soft text-alert">
                  <Icon className="size-[18px]" />
                </span>
                <span className="text-[14px] font-semibold text-ink-muted">{item.label}</span>
                <span className="ml-auto rounded-full border border-alert/35 bg-alert-soft px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em] text-alert">
                  Soon
                </span>
              </div>
            )
          })}
        </div>
      </SideSheet>
    </>
  )
}
