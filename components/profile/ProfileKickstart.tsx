'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

/**
 * First-run nudge to build the Career Profile — the one thing every user, free or
 * paid, must do before anything else works (founder decision 2026-08-18).
 *
 * A DISMISSIBLE pop-up, not a wall. It leads with the three ways in — upload,
 * paste, type — right at the top, one click straight into the fill flow, because
 * upload is instant and that is the moment to capture. Crossing it drops the user
 * on the dashboard, where the same call to action stays visible; the pull comes
 * from the empty dashboard and the profile-locked tools, never from trapping them.
 *
 * Shows only when there is genuinely no profile yet, and remembers a dismissal for
 * the session so it does not nag on every dashboard visit. It reappears on a fresh
 * session until the profile exists — the profile is the whole goal, so a gentle
 * repeat is fair.
 */

const DISMISS_KEY = 'profile_kickstart_dismissed'

export function ProfileKickstart({ show }: { show: boolean }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!show) return
    // Session-scoped: dismissed once, gone until the next visit — long enough to
    // not nag, short enough that an unfinished profile is nudged again.
    const dismissed = sessionStorage.getItem(DISMISS_KEY)
    if (!dismissed) setOpen(true)
  }, [show])

  if (!open) return null

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setOpen(false)
  }

  const Option = ({ href, badge, title, desc }: { href: string; badge?: string; title: string; desc: string }) => (
    <Link
      href={href}
      onClick={dismiss}
      className="flex flex-1 flex-col gap-1.5 rounded-radius-lg border border-line-light bg-surface-light px-4 py-4 text-left transition-colors hover:border-redesign-gold hover:bg-gold-tint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold"
    >
      <span className="flex items-center gap-2">
        <span className="text-[14px] font-bold text-ink-900">{title}</span>
        {badge ? (
          <span className="rounded-[5px] bg-redesign-gold-tint px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-text">
            {badge}
          </span>
        ) : null}
      </span>
      <span className="text-[12px] leading-snug text-ink-700">{desc}</span>
    </Link>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-forest-deep/50 px-4 pt-[8vh] font-redesign-sans backdrop-blur-sm">
      <div className="w-full max-w-[640px] rounded-radius-xl border border-line-light bg-surface-2-light p-6 shadow-redesign-lg sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gold-text">First, the important bit</p>
            <h2 className="mt-2 font-serif text-2xl text-ink-900">Create your Career Profile</h2>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-700">
              Everything — your resume, your Gulf readiness, your cover letters — is built from one Career
              Profile. Set it up once and the rest takes minutes. Pick the fastest way for you:
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={dismiss}
            className="shrink-0 rounded-radius-md px-2 py-1 text-[18px] leading-none text-ink-400 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold"
          >
            ✕
          </button>
        </div>

        {/* The three ways in, at the top, one click to instant. */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Option href="/profile?import=upload" badge="Fastest" title="Upload" desc="PDF or DOCX — we read it and fill everything in." />
          <Option href="/profile?import=paste" title="Paste" desc="Paste your resume text straight in." />
          <Option href="/profile" title="Type" desc="No resume handy? Fill it in yourself." />
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="mt-5 block w-full text-center text-[12px] font-semibold text-ink-400 hover:text-ink-900"
        >
          I&rsquo;ll do this from my dashboard
        </button>
      </div>
    </div>
  )
}
