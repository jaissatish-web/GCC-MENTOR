'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Bars3Icon,
  BriefcaseIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  QuestionMarkCircleIcon,
  RectangleStackIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { buttonVariants } from '@/components/ui/Button'
import { SideSheet, SheetGroupLabel } from '@/components/ui/SideSheet'
import { cn } from '@/lib/utils'

/**
 * The three-bar menu on the public site.
 *
 * FOUNDER REQUEST 2026-09-10: "no sign in or sign up on the landing page so an
 * existing user can click straight in — and the right-side three-bar should be
 * there too." Both were real gaps. "Log in" existed but was hidden on phones,
 * there was no sign-up anywhere in the header, and the three-bar only appeared
 * below 1024px as a dropdown rather than the side panel the app uses.
 *
 * ACCOUNT FIRST. The two things someone opens a public menu to find are "let me
 * in" and "let me start", so they sit above everything else.
 *
 * WHERE THE SERVICE LINKS POINT, and why it is not all `/signup`. Every service
 * except the free scorecard is a protected route, and middleware sends a
 * signed-out visitor to `/login?redirectTo=<that page>`. So linking to the REAL
 * page is right for everyone who already has an account: signed in, they go
 * straight there; signed out, they log in and land on it. Pointing them all at
 * `/signup` would have dropped every existing user on the dashboard instead of
 * the thing they tapped — and `/login` and `/signup` already redirect a
 * signed-in user to their dashboard, so the account buttons are safe for them
 * too.
 *
 * SERVICES mirrors the public landing offer, so the mobile menu cannot drift
 * from what the page is selling.
 *
 * ANCHOR LINKS CLOSE THE SHEET FIRST, then scroll — from an effect, not from a
 * frame callback. The first version scrolled inside `requestAnimationFrame`,
 * and in testing the panel closed but the page never moved and the hash never
 * changed: rAF does not fire at all in a tab that is not being painted, so the
 * scroll was silently dropped. That may only bite in a background tab, but a
 * navigation that depends on the page being on screen is fragile for no gain.
 * Now the target is remembered, and the scroll runs in the effect that fires
 * once `open` is false — after SideSheet's cleanup has released the scroll
 * lock, because React runs every cleanup before any new effect body.
 */

const SERVICES = [
  { label: 'Gulf Readiness Score', href: '/gulf-readiness-score', icon: ChartBarIcon, blurb: 'Free, no login — one upload', tag: 'Free' },
  { label: 'Career Profile', href: '/profile', icon: UserCircleIcon, blurb: 'Your career, read once and kept', tag: 'Free' },
  { label: 'Resume Library', href: '/dashboard/library', icon: BriefcaseIcon, blurb: 'Every application and its stage', tag: 'Free' },
  { label: 'Resume Optimizer', href: '/optimize/target', icon: DocumentTextIcon, blurb: 'Rewritten for the Gulf, never invented', tag: '₹499' },
  { label: 'CV Templates', href: '/templates', icon: RectangleStackIcon, blurb: 'Fifteen Gulf formats', tag: 'Included' },
  { label: 'Cover Letter', href: '/cover-letter', icon: EnvelopeIcon, blurb: 'Four tones, same profile', tag: '₹999' },
  { label: 'Interview Q&A', href: '/signup', icon: QuestionMarkCircleIcon, blurb: 'Answers from your optimized resume', tag: 'Live' },
  { label: 'Mock Interview', href: '/signup', icon: ChatBubbleLeftRightIcon, blurb: 'Speaking and confidence feedback', tag: 'Live' },
] as const

export function PublicMenu({ anchors }: { anchors: ReadonlyArray<readonly [string, string]> }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const close = useCallback(() => setOpen(false), [])

  const pendingHash = useRef<string | null>(null)

  const goToSection = (hash: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    pendingHash.current = hash
    setOpen(false)
  }

  useEffect(() => {
    if (open || !pendingHash.current) return
    const hash = pendingHash.current
    pendingHash.current = null
    document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' })
    history.replaceState(null, '', hash)
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="All services"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex size-11 shrink-0 items-center justify-center rounded-ctl bg-teal-soft text-teal transition-colors hover:bg-teal/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
      >
        <Bars3Icon className="size-5" />
      </button>

      <SideSheet open={open} onClose={close} title="All services" returnFocusTo={triggerRef}>
        {/* ── Account ── */}
        <div className="flex flex-col gap-2.5 rounded-card bg-white p-4 shadow-m-1">
          <span className="text-[13px] leading-snug text-ink-soft">
            New here? Your first three stations are free.
          </span>
          <Link href="/signup" onClick={close} className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}>
            Create free account
          </Link>
          <Link href="/login" onClick={close} className={cn(buttonVariants({ variant: 'secondary' }), 'w-full')}>
            Log in
          </Link>
        </div>

        {/* ── Services ── */}
        <div className="flex flex-col gap-2">
          <SheetGroupLabel>Services</SheetGroupLabel>
          {SERVICES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={close}
              className="flex min-h-[52px] items-center gap-3 rounded-ctl bg-white px-3.5 py-3 shadow-m-1 transition-colors hover:bg-teal-soft/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-ctl bg-teal-soft text-teal">
                <s.icon className="size-[18px]" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[14px] font-semibold leading-tight text-ink">{s.label}</span>
                <span className="truncate text-[12px] text-ink-muted">{s.blurb}</span>
              </span>
              <span
                className={cn(
                  'ml-auto shrink-0 rounded-full px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.08em]',
                  s.tag === 'Free' ? 'bg-teal-soft text-teal' : 'bg-gold-soft text-gold-ink',
                )}
              >
                {s.tag}
              </span>
            </Link>
          ))}
        </div>

        {/* ── This page ── */}
        <div className="flex flex-col gap-1">
          <SheetGroupLabel>On this page</SheetGroupLabel>
          {anchors.map(([label, hash]) => (
            <a
              key={hash}
              href={hash}
              onClick={goToSection(hash)}
              className="flex min-h-11 items-center rounded-ctl px-3 text-[14px] font-semibold text-ink-soft transition-colors hover:bg-teal-soft hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal"
            >
              {label}
            </a>
          ))}
        </div>
      </SideSheet>
    </>
  )
}
