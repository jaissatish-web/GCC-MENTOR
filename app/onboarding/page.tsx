'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'
import {
  CAREER_PROFILE_DRAFT_KEY,
  CLAIMED_RESUME_TEXT_KEY,
  CLAIMED_SCAN_RESULT_KEY,
} from '@/lib/onboardingDraft'
import { readHandoff, clearHandoff } from '@/lib/gulfReadiness/handoff'

/**
 * Onboarding path chooser — screen 02 (TASK-022), route /onboarding.
 *
 * Conversion of the "02 · Choose how to start" screen in
 * design-reference/MVP Screens.dc.html — not a redesign. Three option cards,
 * each a real <button> with a 44px+ touch target, plus the progress bar
 * (1/5), back arrow, privacy note and Continue button shown in the mockup.
 *
 * TASK-082 light restyle (2026-08-12, PAGE_SPECS.md §B): the dark navy
 * full-screen mockup frame is presented as a light centered card column on
 * the paper `--bg` (max-width 640px, same as the auth/utility screens). No
 * prop, state variable, or function signature changed.
 *
 * This screen only CHOOSES a path. It does not call the rate limiter and does
 * not run extraction — screen 03 (TASK-023) will run POST /api/parse/upload or
 * /api/parse/text and handle the results. Path 3 (scratch) routes straight
 * through to the Career Profile review screen (/profile, TASK-024).
 *
 * TASK-069 addition: on mount, silently attempts to claim an anonymous
 * analysis session (POST /api/anonymous-session/claim). A claimed draft is
 * written into the SAME sessionStorage key TASK-023's own extraction handoff
 * already uses, so /profile's existing draft-review code picks it up
 * completely unchanged.
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
        'flex w-full min-h-11 items-start gap-3.5 rounded-radius-lg border bg-surface-light px-4 py-4 text-left font-redesign-sans transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
        selected ? 'border-forest shadow-redesign-md' : 'border-line-light'
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-surface-2-light text-ink-900">
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-ink-900">{title}</span>
          {badge ? (
            <span className="rounded-[5px] bg-redesign-gold-tint px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold-text">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="text-[12px] leading-snug text-ink-700">{description}</span>
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

    // The new free funnel (the arithmetic Gulf Readiness Scorecard) hands off
    // through sessionStorage, not the older server-side anonymous session. If that
    // handoff is present, the visitor already gave us their resume for the score.
    //
    // ONE FREE EXTRACTION AT SIGNUP, FOR EVERYONE (founder decision 2026-08-18,
    // Option B). Rather than make a free user retype what we can already read, we
    // run the LLM extraction once, free, and auto-fill their Career Profile — the
    // "wow" moment right after signup. The paywall moved off extraction and onto
    // the AI optimization, the ATS/Job Readiness score and the cover letter. So the
    // handoff routes straight into the same extraction screen the older claim used,
    // and the answers travel so the profile's live readiness knows the scenario.
    const handoff = readHandoff()
    if (handoff && handoff.resumeText.trim().length >= 50) {
      window.sessionStorage.setItem(CLAIMED_RESUME_TEXT_KEY, handoff.resumeText)
      window.sessionStorage.setItem('gulf_readiness_answers', JSON.stringify(handoff.answers))
      clearHandoff()
      router.replace('/onboarding/extracting?path=claimed')
      return
    }

    fetch('/api/anonymous-session/claim', { method: 'POST', cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return
        // Carry the pre-signup score along in either branch below, if there was
        // one. Whoever builds the "welcome back" display (TASK-070) reads and
        // clears this.
        const carryScore = () => {
          if (data?.atsScore) {
            window.sessionStorage.setItem(
              CLAIMED_SCAN_RESULT_KEY,
              JSON.stringify({ atsScore: data.atsScore, jobDescription: data.jobDescription ?? null }),
            )
          }
        }

        if (data?.draft) {
          window.sessionStorage.setItem(CAREER_PROFILE_DRAFT_KEY, JSON.stringify(data.draft))
          carryScore()
          router.replace('/profile')
          return
        }

        // No draft, but we still hold the resume text they scanned — since
        // TASK-109 that is the normal case, not an edge one. Extract it now
        // rather than making them upload the same file a second time.
        if (typeof data?.resumeText === 'string' && data.resumeText.trim().length >= 50) {
          window.sessionStorage.setItem(CLAIMED_RESUME_TEXT_KEY, data.resumeText)
          carryScore()
          router.replace('/onboarding/extracting?path=claimed')
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
      <main className="flex min-h-dvh items-center justify-center bg-bg font-redesign-sans">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col bg-bg font-redesign-sans">
      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col px-5 pb-6 pt-9 sm:px-8 sm:pt-12">
        {/* Back arrow + progress bar 1/5 */}
        <div className="flex items-center gap-3.5">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => router.back()}
            className="flex size-11 items-center justify-center rounded-radius-md text-[20px] leading-none text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            ←
          </button>
          <div className="flex-1">
            <ProgressBar value={20} tone="light" />
          </div>
          <span className="font-mono text-[11px] text-ink-400">1/5</span>
        </div>

        {/* Heading */}
        <div className="mt-8 flex flex-col gap-2">
          <h1 className="font-serif text-[28px] leading-tight text-ink-900 sm:text-[32px]">
            Let&apos;s build your Career Profile
          </h1>
          <p className="text-[13.5px] leading-relaxed text-ink-700">
            Built once, reused for every future application. Choose whichever is easiest — all three
            end up in the same place.
          </p>
        </div>

        {/* Option cards */}
        <div className="mt-7 flex flex-col gap-3">
          <OptionCard
            icon={<span className="text-[17px] text-forest">↑</span>}
            title="Upload a file"
            badge="Fastest"
            description="Resume PDF/DOCX, or your LinkedIn profile export. We read it and fill in everything we can."
            selected={path === 'upload'}
            onClick={() => setPath('upload')}
          />
          <OptionCard
            icon={<span className="text-[16px] text-ink-700">¶</span>}
            title="Paste your resume text"
            description="No file handy? Paste the text straight in."
            selected={path === 'paste'}
            onClick={() => setPath('paste')}
          />
          <OptionCard
            icon={<span className="text-[16px] text-ink-700">✎</span>}
            title="Start from scratch"
            description="Fill it in yourself. Good if you don't have a resume yet."
            selected={path === 'scratch'}
            onClick={() => setPath('scratch')}
          />
        </div>

        {/* Privacy note + Continue — pinned to the bottom like the mockup */}
        <div className="mt-auto flex flex-col gap-3 pt-8">
          <div className="flex items-start gap-2.5 rounded-radius-lg border border-line-light bg-surface-2-light px-3.5 py-3">
            <span className="text-[13px] text-gold-text">⌾</span>
            <p className="text-[11px] leading-snug text-ink-700">
              Your file is used only to build your profile. Passport, visa and contact fields are
              encrypted and never shown publicly.
            </p>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={continueLink}
            disabled={path === null}
          >
            Continue
          </Button>
        </div>
      </div>
    </main>
  )
}
