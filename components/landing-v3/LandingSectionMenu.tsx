'use client'

import Link from 'next/link'
import { useRef } from 'react'
import p from './premium.module.css'

/** Native disclosure with a small enhancement: selecting a section closes it. */
export function LandingSectionMenu({ anchors }: { anchors: ReadonlyArray<readonly [string, string]> }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const close = () => { if (menu.current) menu.current.open = false }
  return (
    <details ref={menu} className={p.menu} onKeyDown={event => {
      if (event.key === 'Escape') {
        close()
        menu.current?.querySelector('summary')?.focus()
      }
    }}>
      <summary aria-label="Open section menu" className={p.menuSummary}>
        <svg className={p.menuOpen} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        <svg className={p.menuClose} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </summary>
      <nav aria-label="Page sections" className={p.menuNav}>
        {anchors.map(([label, href]) => <a key={href} href={href} onClick={close}>{label}</a>)}
        <Link href="/privacy" onClick={close}>Privacy & data control</Link>
        <a href="#faq" onClick={close}>Common questions</a>
        <Link href="/signup" onClick={close}>Create an account</Link>
        <Link href="/gulf-readiness-score" onClick={close}>Check My Free GCC Readiness</Link>
      </nav>
    </details>
  )
}
