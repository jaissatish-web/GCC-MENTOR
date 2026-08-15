'use client'

import * as React from 'react'
import { buttonVariants } from '@/components/ui/Button'
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
    <header className="sticky top-0 z-30 border-b border-line/80 bg-bg/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="font-serif flex h-9 w-9 items-center justify-center rounded-lg bg-forest-deep text-lg text-redesign-gold">G</span>
          <span className="text-[16px] font-bold tracking-wide text-ink-900">GCC MENTOR</span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {ITEMS.map(([label, href]) => <a key={href} href={href} className="rounded-lg px-3 py-2 text-[13px] font-semibold text-ink-400 transition-colors hover:text-ink-900">{label}</a>)}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-[13px] font-semibold text-ink-400 hover:text-ink-900 sm:inline">Log in</Link>
          <Link href="/onboarding" className={buttonVariants({ variant: 'purchase', size: 'sm' }) + ' hidden sm:inline-flex'}>Get Started Free</Link>
          <button type="button" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(v => !v)} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-ink-900 lg:hidden">{open ? '✕' : '☰'}</button>
        </div>
      </div>
      {open ? <div className="border-t border-line bg-bg px-5 py-5 lg:hidden"><nav className="mx-auto flex max-w-[1280px] flex-col gap-1">{ITEMS.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="min-h-11 rounded-lg px-3 py-3 text-[15px] font-semibold text-ink-900">{label}</a>)}<Link href="/onboarding" onClick={() => setOpen(false)} className="mt-3 min-h-11 rounded-lg bg-forest-deep px-4 py-3 text-center font-bold text-white">Get Started Free</Link></nav></div> : null}
    </header>
  )
}

export default SiteNav
