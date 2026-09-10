'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { EllipsisHorizontalIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { MOBILE_MORE_ITEMS, isNavItemActive, navHref } from './navItems'

/**
 * MoreSheet — mobile bottom drawer (DESIGN_SYSTEM.md §8.3).
 *
 * Renders whatever ./navItems did not pin to the bottom bar, so every
 * destination stays reachable on a phone and the drawer cannot fall out of
 * sync with the sidebar when the nav is reordered.
 *
 * PORTALLED TO <body>, AND IT HAS TO BE. Found in the 2026-09-10 audit: "More"
 * did nothing on any phone. The drawer was rendered inside the bottom <nav>,
 * which carries `backdrop-blur-md` — and a `backdrop-filter` makes its element
 * the containing block for every fixed-position descendant. So `fixed inset-0`
 * resolved against the 64px nav bar, not the screen: the drawer opened, fully
 * clipped, inside the bar. The button even reported aria-expanded="true". It is
 * the same defect SideSheet.tsx documents for the three-bar menu, which is why
 * the fix is the same: render at the root, where no ancestor can capture it.
 */
export function MoreSheet() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setMounted(true), [])

  // A route change closes it — a link tap already does, but the back button
  // and a redirect should too.
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const close = () => {
      setOpen(false)
      triggerRef.current?.focus()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          'flex min-h-11 min-w-[64px] flex-col items-center justify-center gap-1 rounded-ctl px-1 text-[12px] leading-tight font-redesign-sans transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
          open ? 'font-semibold text-teal' : 'font-medium text-ink-muted'
        )}
      >
        <EllipsisHorizontalIcon className={cn('size-5', open ? 'text-teal' : 'text-ink-muted')} />
        More
      </button>

      {open && mounted
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-end md:hidden">
              <button
                type="button"
                aria-label="Close menu"
                className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
                onClick={() => setOpen(false)}
              />
              <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label="More"
                tabIndex={-1}
                className="relative z-10 max-h-[80vh] w-full overflow-y-auto rounded-t-card-lg bg-canvas p-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-m-3 focus:outline-none"
              >
                {/* A grab handle: the shape people know means "this came up
                    from the bottom and can go back down". */}
                <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-line-strong" />
                <div className="mb-3 flex items-center justify-between px-1">
                  <h2 className="font-display text-[16px] font-semibold text-ink">More</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      triggerRef.current?.focus()
                    }}
                    aria-label="Close"
                    // Was `hover:text-white` on a white panel — the close
                    // button vanished under the pointer.
                    className="flex size-10 items-center justify-center rounded-ctl bg-white text-ink-soft shadow-m-1 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
                  >
                    <XMarkIcon className="size-[18px]" />
                  </button>
                </div>
                <nav aria-label="More destinations" className="flex flex-col gap-2">
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
                          'flex min-h-[52px] items-center gap-3 rounded-ctl bg-white px-3.5 text-[14px] font-semibold shadow-m-1 transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal',
                          active ? 'text-teal ring-1 ring-teal/30' : 'text-ink hover:bg-teal-soft/50'
                        )}
                      >
                        <span
                          aria-hidden="true"
                          className="flex size-9 shrink-0 items-center justify-center rounded-ctl bg-teal-soft text-teal"
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        {item.label}
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
