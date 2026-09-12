'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { ProcessingOrbit, ProcessingSteps } from '@/components/ui/Processing'
import { GENERATE_NOTES } from '@/lib/processingNotes'
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
  'Applying Gulf CV format',
  'Rewriting for your target role',
  'Checking every line against your profile',
]

const FINAL_STEP = 'Checking every line against your profile'

/** The whole list is paced across this, then holds on its last step. */
const PACE_MS = 60000

export default function GeneratePage({ params }: { params: { packageId: string } }) {
  const router = useRouter()
  const packageId = params.packageId
  // The steps the user actually chose on setup — their summary, each employer's
  // bullets — handed over through OPTIMIZATION_BUILD_STEPS_KEY (2026-09-12).
  const [steps, setSteps] = useState<readonly string[]>(STEPS)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const run = useCallback(async () => {
    setError(null)
    const start = Date.now()
    setElapsedMs(0)
    const timer = window.setInterval(() => setElapsedMs(Date.now() - start), 500)
    try {
      const res = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId }),
      })
      const body = await res.json().catch(() => ({}))
      window.clearInterval(timer)

      if (!res.ok) {
        // The 402 branch is gone with the paywall. A 429 is the one remaining
        // refusal the user can act on, and the server's own message names the
        // reset time, so it is shown rather than replaced.
        // No JSON at all is the platform answering, not our route — most often
        // its timeout page (2026-09-11). Say which; the job itself is kept.
        setError(
          (body?.error as string) ??
            (res.status === 504
              ? 'Building your CV took too long and was stopped. Your job is saved — please try again.'
              : 'Could not build your resume. Please try again.'),
        )
        return
      }
      try {
        window.sessionStorage.removeItem(OPTIMIZATION_BUILD_STEPS_KEY)
      } catch {
        /* display-only handoff */
      }
      router.replace(`/package/${encodeURIComponent(packageId)}`)
    } catch {
      window.clearInterval(timer)
      setError('Network error. Please check your connection and try again.')
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
      if (saved?.packageId === packageId && list.length > 0) setSteps([...list, FINAL_STEP])
    } catch {
      /* keep the generic steps */
    }
    void run()
  }, [run, packageId])

  const activeIndex = Math.min(steps.length - 1, Math.floor(elapsedMs / (PACE_MS / steps.length)))

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-canvas px-6 py-12 font-redesign-sans">
        <div className="w-full max-w-[480px] rounded-card border border-line bg-white p-8 text-center">
          <h1 className="font-display text-[26px] leading-tight text-ink">We couldn&apos;t build it</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{error}</p>
          {/* Was "Your payment is safe … without paying twice" — there is no
              payment step while the locks are off, so it reassured the user
              about something that never happened. What is true: the job is kept. */}
          <p className="mt-3 text-[12px] text-ink-muted">
            Nothing is lost — this job stays in your Resume Library and can be built again from there.
          </p>
          <div className="mt-7 flex flex-col gap-3">
            <Button variant="primary" className="w-full" onClick={() => void run()}>
              Try again
            </Button>
            <Button variant="secondary" className="w-full" onClick={() => router.push('/dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </div>
      </main>
    )
  }

  // The model call takes up to a minute and reports no progress of its own, so
  // what is shown is only what is true: it is running (the orbit), which stage
  // of the pipeline it is in (named, paced by the timer above, holding on the
  // last one), and how long it has really taken. See components/ui/Processing.
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-ink px-6 py-12 font-redesign-sans">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_28%,rgba(201,150,46,0.16),transparent_70%)]"
      />
      <div className="relative flex w-full max-w-[440px] flex-col items-center gap-7">
        <ProcessingOrbit tone="dark" size={184} />
        <div className="text-center">
          <p className="mb-2 font-mono text-[12px] uppercase tracking-[0.14em] text-white/60">Step 3 of 3</p>
          <h1 className="font-display text-[28px] leading-tight text-white">Building your Gulf CV</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">
            Every line is checked against your Career Profile before you see it.
          </p>
        </div>
        <ProcessingSteps
          tone="dark"
          steps={steps}
          activeIndex={Math.max(0, activeIndex)}
          notes={GENERATE_NOTES}
        />
      </div>
    </main>
  )
}
