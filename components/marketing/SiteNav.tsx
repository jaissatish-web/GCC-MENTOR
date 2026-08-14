'use client'

import * as React from 'react'
import Link from 'next/link'

const ITEMS = [
  ['Services', '#services'],
  ['How It Works', '#how-it-works'],
  ['Gulf Markets', '#markets'],
  ['Pricing', '#pricing'],
] as const

export function SiteNav() {
  const [open, setOpen] = React.useState(false)
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-marble/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="font-serif flex h-9 w-9 items-center justify-center rounded-lg bg-midnight text-lg text-gold-light">G</span>
          <span className="text-[16px] font-bold tracking-wide text-midnight">GCC MENTOR</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {ITEMS.map(([label, href]) => <a key={href} href={href} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-muted transition-colors hover:text-midnight">{label}</a>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-[13px] font-semibold text-ink-muted hover:text-midnight sm:inline">Log in</Link>
          <Link href="/onboarding" className="hidden min-h-11 items-center rounded-lg bg-midnight px-5 py-2.5 text-[13px] font-bold text-marble transition-colors hover:bg-deep-navy sm:inline-flex">Get Started Free</Link>
          <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(v => !v)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-midnight lg:hidden">{open ? '✕' : '☰'}</button>
        </div>
      </div>
      {open ? <div className="border-t border-line bg-marble px-5 py-5 lg:hidden"><nav className="mx-auto flex max-w-[1280px] flex-col gap-1">{ITEMS.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 py-3 text-[15px] font-semibold text-midnight">{label}</a>)}<Link href="/onboarding" onClick={() => setOpen(false)} className="mt-3 min-h-11 rounded-lg bg-midnight px-4 py-3 text-center font-bold text-marble">Get Started Free</Link></nav></div> : null}
    </header>
  )
}

export default SiteNav
