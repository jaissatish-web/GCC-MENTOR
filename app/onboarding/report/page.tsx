'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ScorecardResult } from '@/components/gulfReadiness/ScorecardResult'
import { CLAIMED_READINESS_RESULT_KEY } from '@/lib/onboardingDraft'
import type { GulfReadinessResult } from '@/lib/gulfReadiness/types'

/**
 * The full Gulf Readiness report, revealed the moment a user signs up
 * (2026-08-18: signup-restore of the full report).
 *
 * The anonymous scorecard shows a subset behind an honest gate whose CTA
 * promises "create a free account to unlock the full breakdown". This page keeps
 * that promise: it re-renders the SAME computed result the visitor already saw,
 * now with `locked={false}` — every dimension, the full ranked plan, no gate.
 *
 * It is deliberately shown BEFORE profile extraction. The score is arithmetic
 * and already computed, so the reward is instant (no AI call, no wait); the ~20s
 * extraction that builds the Career Profile follows on the CTA, as the second
 * payoff rather than a barrier in front of the first.
 *
 * The result is handed over by /onboarding via CLAIMED_READINESS_RESULT_KEY. No
 * handoff (a refresh after the tab lost it, or a direct visit) is not an error:
 * the user is signed in, so we send them to their dashboard rather than strand
 * them. The resume text and answers travel separately and are consumed by the
 * extraction screen and the profile's live readiness respectively.
 */
export default function OnboardingReportPage() {
  const router = useRouter()
  const [result, setResult] = useState<GulfReadinessResult | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let parsed: GulfReadinessResult | null = null
    try {
      const raw = window.sessionStorage.getItem(CLAIMED_READINESS_RESULT_KEY)
      if (raw) {
        const candidate = JSON.parse(raw) as GulfReadinessResult
        if (candidate && typeof candidate.finalScore === 'number' && candidate.band) {
          parsed = candidate
        }
      }
    } catch {
      parsed = null
    }
    if (!parsed) {
      // Nothing to show — they're already signed in, so the dashboard is the
      // honest destination, not an error screen.
      router.replace('/dashboard')
      return
    }
    setResult(parsed)
    setChecked(true)
  }, [router])

  if (!checked || !result) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg font-redesign-sans">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </main>
    )
  }

  return (
    <main className="min-h-dvh bg-bg text-ink-900">
      <header className="border-b border-line-light bg-bg/95">
        <div className="mx-auto flex h-[72px] max-w-[1100px] items-center justify-between px-5 sm:px-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="font-serif flex h-9 w-9 items-center justify-center rounded-radius-md bg-forest-deep text-lg text-gold-text-dark">G</span>
            <span className="font-bold tracking-wide">GCC MENTOR</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-[820px] px-5 py-12 sm:px-8 lg:py-16">
        <div className="mb-6 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-text">Your full Gulf readiness report</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">Unlocked — here&rsquo;s everything we found</h1>
          <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-ink-700">
            The complete breakdown of the score you saw, with every dimension and your full ranked action plan. Next,
            we&rsquo;ll build your Career Profile so you can act on it.
          </p>
        </div>

        <ScorecardResult result={result} locked={false} />

        <div className="mt-8 rounded-radius-xl border border-redesign-gold/40 bg-gold-tint/40 p-6 text-center sm:p-8">
          <h2 className="font-serif text-2xl text-ink-900">Now let&rsquo;s build your Career Profile</h2>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-700">
            We already have your resume — we&rsquo;ll read it once, free, and fill in everything we can. You review and
            confirm before anything is saved.
          </p>
          <div className="mt-5">
            <Button
              variant="purchase"
              onClick={() => router.push('/onboarding/extracting?path=claimed')}
            >
              Build my Career Profile
            </Button>
          </div>
          <p className="mt-3 text-[11px] text-ink-400">Takes about 20 seconds. Nothing is saved until you confirm.</p>
        </div>
      </div>
    </main>
  )
}
