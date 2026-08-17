'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'

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

const STEPS = [
  'Reading your Career Profile',
  'Applying Gulf CV format',
  'Rewriting for your target role',
  'Checking every line against your profile',
]

const STEP_MS = 15000

export default function GeneratePage({ params }: { params: { packageId: string } }) {
  const router = useRouter()
  const packageId = params.packageId
  const [step, setStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const started = useRef(false)

  const run = useCallback(async () => {
    setError(null)
    setStep(1)
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length)), STEP_MS)
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
        setError((body?.error as string) ?? 'Could not build your resume. Please try again.')
        return
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
    void run()
  }, [run])

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-bg px-6 py-12 font-redesign-sans">
        <div className="w-full max-w-[480px] rounded-radius-lg border border-line-light bg-surface-light p-8 text-center">
          <h1 className="font-serif text-[26px] leading-tight text-ink-900">We couldn&apos;t build it</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-700">{error}</p>
          <p className="mt-3 text-[12px] text-ink-400">
            Your payment is safe — this resume stays in your Library and can be built again without
            paying twice.
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

  return (
    <main className="flex min-h-dvh items-center justify-center bg-forest-deep px-6 py-12 font-redesign-sans">
      <div className="w-full max-w-[440px]">
        <h1 className="font-serif text-[28px] leading-tight text-ink-900-dark">
          Building your Gulf CV…
        </h1>
        <p className="mt-2 text-[13px] text-ink-400-dark">
          This takes about a minute. Every line is checked against your profile — nothing is
          invented.
        </p>
        <ul className="mt-8 flex flex-col gap-3">
          {STEPS.map((label, i) => {
            const state = i < step ? 'done' : i === step ? 'active' : 'todo'
            return (
              <li key={label} className="flex items-center gap-3 text-[13.5px]">
                <span
                  aria-hidden
                  className={
                    'flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] ' +
                    (state === 'done'
                      ? 'border-redesign-gold bg-redesign-gold text-forest-deep'
                      : state === 'active'
                        ? 'border-redesign-gold text-gold-text-dark'
                        : 'border-ink-900-dark/25 text-ink-400-dark')
                  }
                >
                  {state === 'done' ? '✓' : i + 1}
                </span>
                <span className={state === 'todo' ? 'text-ink-400-dark' : 'text-ink-900-dark'}>
                  {label}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </main>
  )
}
