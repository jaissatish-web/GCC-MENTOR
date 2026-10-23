'use client'

import { useCallback, useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation'
import { FlowHeader } from '@/components/optimizer/FlowHeader'
import { Button } from '@/components/ui/Button'
import { OptimizationProgress } from '@/components/optimizer/OptimizationProgress'
import { Alert } from '@/components/ui/Alert'
import { OPTIMIZATION_BUILD_STEPS_KEY } from '@/lib/onboardingDraft'

/**
 * Generation screen. POSTs { packageId } to /api/optimize, which reads the
 * target fields off the row rather than the request.
 *
 * Generation lives on its own screen rather than inside /optimize/setup's submit
 * because it used to run there, before payment: every visitor who never bought
 * spent real model tokens, and the product then had to sell a blurred preview of
 * work it had already paid for. The screen is worth keeping for that reason
 * alone — a long model call deserves its own progress surface — and it is where
 * the payment step will sit in front of again when the locks return.
 *
 * NO PAYMENT STEP while the locks are off (founder decision 2026-08-17).
 *
 * Idempotent by construction: if the package already has content the server
 * returns alreadyGenerated and nothing is spent, so a refresh mid-generation
 * cannot produce a second resume. That guard now carries the whole weight of
 * preventing a duplicate model call, since no payment check sits in front of it.
 */

/** Shown when setup's own list is not available — a refresh in a new tab, an old link. */
const STEPS = [
  'Reading your Career Profile',
  'Applying Gulf resume format',
  'Rewriting for your target role',
  'Checking every line against your profile',
]

const FINAL_STEP = 'Checking every line against your profile'


export default function GeneratePage(props: { params: Promise<{ packageId: string }> }) {
  const params = use(props.params);
  const router = useRouter()
  const packageId = params.packageId
  // The steps the user actually chose on setup — their summary, each employer's
  // bullets — handed over through OPTIMIZATION_BUILD_STEPS_KEY (2026-09-12).
  const [steps, setSteps] = useState<readonly string[]>(STEPS)
  const [phase, setPhase] = useState<'analysis' | 'build' | 'opening'>('analysis')
  const [analysisReady, setAnalysisReady] = useState<boolean | null>(null)
  const running = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const run = useCallback(async () => {
    if (running.current) return
    running.current = true
    setError(null)
    setPhase('analysis')
    setAnalysisReady(null)
    try {
      // 1. Read the job and match it to the profile, in its own request so the
      //    slow analysis has its own time budget (2026-09-17). Never fatal: the
      //    build still runs if this fails.
      const analysis = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId, analyzeOnly: true }),
      }).catch(() => null)
      setAnalysisReady(Boolean(analysis?.ok))
      setPhase('build')
      // 2. Write the resume and score it.
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const body = await res.json().catch(() => ({}))

      if (!res.ok) {
        // The 402 branch is gone with the paywall. A 429 is the one remaining
        // refusal the user can act on, and the server's own message names the
        // reset time, so it is shown rather than replaced.
        // No JSON at all is the platform answering, not our route — most often
        // its timeout page (2026-09-11). Say which; the job itself is kept.
        setError(
          (body?.error as string) ??
            (res.status === 504
              ? 'Building your resume took too long and was stopped. Your job is saved — please try again.'
              : 'Could not build your resume. Please try again.'),
        )
        return
      }
      try {
        window.sessionStorage.removeItem(OPTIMIZATION_BUILD_STEPS_KEY)
      } catch {
        /* display-only handoff */
      }
      // Optimizer v3 (2026-10-02): after the one-time agreement and a first
      // optimization seen on the review page, the added points are already in
      // the CV — straight to the result and its Download. Otherwise the review
      // page first, with the added points in yellow.
      setPhase('opening')
      router.replace(body?.autoApplied ? `/package/${encodeURIComponent(packageId)}` : `/optimize/preview/${encodeURIComponent(packageId)}`)
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      running.current = false
    }
  }, [packageId, router])

  useEffect(() => {
    // Ref guard: React runs effects twice in development StrictMode, and this
    // one spends a model call and a rate-limit slot.
    if (started.current) return
    started.current = true
    try {
      const raw = window.sessionStorage.getItem(OPTIMIZATION_BUILD_STEPS_KEY)
      const saved = raw ? (JSON.parse(raw) as { packageId?: unknown; steps?: unknown }) : null
      const list = Array.isArray(saved?.steps) ? saved.steps.filter((s): s is string => typeof s === 'string') : []
      // Only this job's list — a stale one must never label a different build.
      if (saved?.packageId === packageId && list.length > 0) setSteps(list.includes(FINAL_STEP) || list.some((x) => x.startsWith('Checking every line')) ? list : [...list, FINAL_STEP])
    } catch {
      /* keep the generic steps */
    }
    void run()
  }, [run, packageId])

  if (error) {
    return (
      <main className="ui-page ui-page-form page-gutter mx-auto w-full pb-10 font-redesign-sans">
        <div className="mx-auto w-full max-w-[480px] rounded-card border border-line bg-white p-8 text-center">
          <h1 className="font-display text-[26px] leading-tight text-ink">We couldn&apos;t build it</h1>
          <Alert variant="danger" className="mt-4 text-left" title="Optimization interrupted">{error}</Alert>
          {/* Was "Your payment is safe … without paying twice" — there is no
              payment step while the locks are off, so it reassured the user
              about something that never happened. What is true: the job is kept. */}
          <p className="mt-3 type-helper text-ink-muted">
            Your saved job details remain in your Resume Library. You can retry from here or return to your saved work.
          </p>
          <div className="mt-7 flex flex-col gap-3">
            <Button variant="primary" className="w-full" onClick={() => void run()}>
              Try again
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => router.push('/dashboard/library')}>
              Open Resume Library
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="ui-page ui-page-form page-gutter mx-auto flex w-full flex-col pb-10 font-redesign-sans">
      <FlowHeader step={3} title="Building your optimized resume" subtitle="Your saved job details and Career Profile guide this preparation." />
      <OptimizationProgress phase={phase} analysisReady={analysisReady} steps={steps} />
    </main>
  )
}
