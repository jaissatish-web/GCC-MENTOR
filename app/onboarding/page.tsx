'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import { CAREER_PROFILE_DRAFT_KEY, CLAIMED_SCAN_RESULT_KEY } from '@/lib/onboardingDraft'

/**
 * Onboarding path chooser — screen 02 (TASK-022), route /onboarding.
 *
 * Conversion of the "02 · Choose how to start" screen in
 * design-reference/MVP Screens.dc.html — not a redesign. Three option cards,
 * each a real <button> with a 44px+ touch target, plus the progress bar
 * (1/5), back arrow, privacy note and Continue button shown in the mockup.
 *
 * Dark visual system redesign (2026-08-07): every token shifted to the navy/gold
 * premium palette. No prop, state variable, or function signature changed.
 *
 * This screen only CHOOSES a path. It does not call the rate limiter and does
 * not run extraction — screen 03 (TASK-023) will run POST /api/parse/upload or
 * /api/parse/text and handle the results. Path 3 (scratch) routes straight
 * through to the Career Profile review screen (/profile, TASK-024).
 *
 * NOTE (flagged to CTO): screen 03 has no route defined in docs/ — extraction
 * is a transient state with no URL in USER_FLOW. Paths 1 & 2 therefore advance
 * to /profile provisionally, recording which path was chosen in local state so
 * TASK-023 can intercept and run extraction when it is built. No extraction
 * happens here.
 *
 * TASK-069 addition: on mount, silently attempts to claim an anonymous
 * analysis session (POST /api/anonymous-session/claim) — a visitor who
 * scanned a resume via the free /ats-scan tool before signing up gets that
 * exact extraction handed back here instead of being asked to redo it
 * (docs/GCC_READINESS_JOB_MATCH.md §17). A claimed draft is written into the
 * SAME sessionStorage key TASK-023's own extraction handoff already uses, so
 * /profile's existing draft-review code (fromDraft, TASK-024) picks it up
 * completely unchanged — no new consumer to build or review. For everyone
 * else (the overwhelming majority: anonymous visitors with no prior scan,
 * and returning logged-in users) the claim call returns `{ draft: null }`
 * quickly and this screen behaves exactly as before.
 */

type OnboardingPath = 'upload' | 'paste' | 'scratch'

function OptionCard({
  icon,
  title,
  badge,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  badge?: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full min-h-11 items-start gap-3.5 rounded-2xl border bg-surface px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void',
        selected
          ? 'border-emerald shadow-[0_8px_22px_rgba(14,92,74,0.18)]'
          : 'border-hairline'
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-surface-2 text-marble">
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-marble">{title}</span>
          {badge ? (
            <span className="rounded-[5px] bg-state-gold-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-state-gold-text">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="text-[12px] leading-snug text-marble/55">{description}</span>
      </span>
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [path, setPath] = useState<OnboardingPath | null>(null)
  // Gates the first paint so a claimable session redirects to /profile
  // before the 3-choice screen ever flashes. Anonymous visitors and
  // returning users clear this in one fast round trip (no AI call, no file
  // I/O — just a cookie + row lookup) since the claim endpoint returns
  // `{ draft: null }` for both.
  const [checkingClaim, setCheckingClaim] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch('/api/anonymous-session/claim', { method: 'POST', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        if (data?.draft) {
          window.sessionStorage.setItem(CAREER_PROFILE_DRAFT_KEY, JSON.stringify(data.draft))
          // Carry the pre-signup score along too, if there was one (extraction
          // can succeed independently of scoring — see /api/ats-scan). Whoever
          // builds the "welcome back" display (TASK-070) reads and clears this.
          if (data.atsScore) {
            window.sessionStorage.setItem(
              CLAIMED_SCAN_RESULT_KEY,
              JSON.stringify({ atsScore: data.atsScore, jobDescription: data.jobDescription ?? null }),
            )
          }
          router.replace('/profile')
          return
        }
        setCheckingClaim(false)
      })
      .catch(() => {
        if (!cancelled) setCheckingClaim(false)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  const continueLink = () => {
      // Upload & paste go to the transient extraction screen (TASK-023), which
      // collects the payload and runs POST /api/parse/upload or /api/parse/text.
      // "Start from scratch" skips extraction and goes straight to the Career
      // Profile review screen (/profile, TASK-024).
      if (path === 'upload') {
        router.push('/onboarding/extracting?path=upload')
      } else if (path === 'paste') {
        router.push('/onboarding/extracting?path=paste')
      } else {
        router.push('/profile')
      }
    }

  if (checkingClaim) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-void">
        <p className="font-mono text-sm text-marble/55">Loading…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col bg-void">
      {/* Status bar placeholder + header */}
      <header className="flex h-11 items-center justify-between px-5 text-[12px] font-semibold text-marble/40">
        <span>9:41</span>
        <span className="tracking-[0.14em]">▮▮▮</span>
      </header>

      {/* Back arrow + progress bar 1/5 */}
      <div className="flex items-center gap-3.5 px-5 pb-4 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-marble focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void"
        >
          ←
        </button>
        <div className="flex-1">
          <ProgressBar value={20} tone="dark" />
        </div>
        <span className="font-mono text-[11px] text-marble/40">1/5</span>
      </div>

      {/* Heading */}
      <div className="flex flex-col gap-2 px-5">
        <h1 className="mt-1 font-serif text-[28px] leading-tight text-marble sm:text-[32px]">
          Let&apos;s build your Career Profile
        </h1>
        <p className="mb-1.5 text-[13.5px] leading-relaxed text-marble/55">
          Built once, reused for every future application. Choose whichever is easiest — all three
          end up in the same place.
        </p>
      </div>

      {/* Option cards */}
      <div className="flex flex-col gap-3 px-5 pt-3">
        <OptionCard
          icon={<span className="text-[17px] text-emerald">↑</span>}
          title="Upload a file"
          badge="Fastest"
          description="Resume PDF/DOCX, or your LinkedIn profile export. We read it and fill in everything we can."
          selected={path === 'upload'}
          onClick={() => setPath('upload')}
        />
        <OptionCard
          icon={<span className="text-[16px] text-marble/75">¶</span>}
          title="Paste your resume text"
          description="No file handy? Paste the text straight in."
          selected={path === 'paste'}
          onClick={() => setPath('paste')}
        />
        <OptionCard
          icon={<span className="text-[16px] text-marble/75">✎</span>}
          title="Start from scratch"
          description="Fill it in yourself. Good if you don't have a resume yet."
          selected={path === 'scratch'}
          onClick={() => setPath('scratch')}
        />
      </div>

      {/* Privacy note + Continue — pinned to the bottom like the mockup */}
      <div className="mt-auto flex flex-col gap-3 px-5 pb-6 pt-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-hairline bg-surface-2 px-3.5 py-3">
          <span className="text-[13px] text-gold-light">⌾</span>
          <p className="text-[11px] leading-snug text-marble/55">
            Your file is used only to build your profile. Passport, visa and contact fields are
            encrypted and never shown publicly.
          </p>
        </div>
        <Button
          variant="purchase"
          className="w-full"
          onClick={continueLink}
          disabled={path === null}
        >
          Continue
        </Button>
      </div>
    </main>
  )
}
