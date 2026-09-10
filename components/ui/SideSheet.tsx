'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { XMarkIcon } from '@heroicons/react/24/outline'

/**
 * A full-height panel that slides in from the right — the "three-bar" menu.
 *
 * ONE COMPONENT FOR BOTH MENUS, on purpose. The signed-in app and the public
 * site each have a three-bar menu, and both are launched from inside a sticky
 * header with `backdrop-blur`. That combination is exactly what broke the first
 * version (2026-09-09): a `backdrop-filter` makes its element the CONTAINING
 * BLOCK for every fixed-position descendant, so a panel rendered inside the
 * header resolved `fixed inset-0` against the header's own 64px box — the panel
 * was 64px tall and the page showed through below it. Two copies of the fix
 * would be two chances to lose it, so the fix lives here once.
 *
 * WHAT IT GUARANTEES, whichever menu uses it:
 *   · Portalled to <body>, so no ancestor can become its containing block.
 *   · Rendered only after mount — `document` does not exist during SSR.
 *   · Escape closes it and focus returns to the button that opened it.
 *   · The page behind cannot scroll while it is open.
 *   · A tap on the dimmed area closes it; the scrim is a real button.
 *
 * It owns no content and no navigation. What goes in it, and what closes it on
 * a route change, belongs to the menu that uses it.
 */
export function SideSheet({
  open,
  onClose,
  title,
  returnFocusTo,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** The trigger button, so a keyboard user lands back where they started. */
  returnFocusTo?: React.RefObject<HTMLElement>
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const panelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        returnFocusTo?.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, returnFocusTo])

  if (!open || !mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-[87%] max-w-[380px] flex-col bg-canvas shadow-m-drawer focus:outline-none"
      >
        <div className="flex items-center justify-between border-b border-line bg-white px-4 py-3.5">
          <span className="font-display text-[16px] font-semibold text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-9 items-center justify-center rounded-ctl bg-canvas text-ink-soft transition-colors hover:bg-line/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
          >
            <XMarkIcon className="size-[18px]" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-3.5 py-4 pb-8">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

/** The small uppercase label above each group inside a sheet. */
export function SheetGroupLabel({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'alert' }) {
  return (
    <span
      className={
        'px-1 text-[10.5px] font-bold uppercase tracking-[0.14em] ' +
        (tone === 'alert' ? 'text-alert' : 'text-ink-muted')
      }
    >
      {children}
    </span>
  )
}
