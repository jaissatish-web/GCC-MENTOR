'use client'

import Link from 'next/link'
import { useRef } from 'react'
import { BTN_GOLD } from './primitives'
import { cn } from '@/lib/utils'

/** Native disclosure with a small enhancement: selecting a section closes it. */
export function LandingSectionMenu({ anchors }: { anchors: ReadonlyArray<readonly [string, string]> }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const close = () => { if (menu.current) menu.current.open = false }
  return (
    <details ref={menu} className="group relative xl:hidden" onKeyDown={event => {
      if (event.key === 'Escape') {
        close()
        menu.current?.querySelector('summary')?.focus()
      }
    }}>
      <summary aria-label="Open section menu" className="grid size-11 cursor-pointer list-none place-items-center rounded-ctl border border-line bg-white text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
        <svg className="size-5 group-open:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        <svg className="hidden size-5 group-open:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </summary>
      <nav aria-label="Page sections" className="absolute right-0 top-[52px] max-h-[calc(100dvh-88px)] w-[min(260px,calc(100vw-32px))] overflow-y-auto rounded-card border border-line bg-white p-2 shadow-m-3">
        {anchors.map(([label, href]) => <a key={href} href={href} onClick={close} className="flex min-h-11 items-center rounded-ctl px-3 text-[15px] font-medium text-ink hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">{label}</a>)}
        <Link href="/gulf-readiness-score" onClick={close} className="flex min-h-11 items-center rounded-ctl px-3 text-[15px] font-medium text-teal hover:bg-teal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">Free readiness score</Link>
        <Link href="/signup" onClick={close} className={cn(BTN_GOLD, 'mt-2 w-full')}>Start free</Link>
      </nav>
    </details>
  )
}
