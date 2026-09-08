'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import type { Package } from '@/types/package'

/**
 * Payment — screen 09 (TASK-051), route /optimize/pay/[packageId].
 *
 * Real Razorpay integration (TASK-042/043) stays blocked — the founder is
 * based in Saudi Arabia and cannot complete Razorpay's India-only KYC. Launch
 * strategy instead: a promo code, redeemed through the rate-limited, atomic
 * server-side flow in app/api/packages/[id]/redeem-promo/route.ts (migration
 * 021's redeem_promo_code function). Razorpay itself is shown as a disabled
 * "coming soon" section — honest about what's not live, never a dead link
 * that pretends to work (same standing as every other locked-service surface
 * in this app, e.g. the dashboard's Phase 2-4 cards).
 *
 * If the package is already paid when this loads, redirect straight to the
 * results screen — this route has nothing to offer a package that's already
 * unlocked.
 */

function PaymentPageInner({ packageId }: { packageId: string }) {
  const router = useRouter()
  const [pkg, setPkg] = useState<Package | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [redeemError, setRedeemError] = useState<string | null>(null)
  const [redeeming, setRedeeming] = useState(false)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    fetch(`/api/packages/${encodeURIComponent(packageId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const p = data?.package as Package | undefined
        if (!p) {
          setError('Package not found.')
          return
        }
        // NOTHING TO PAY while the locks are off (founder decision 2026-08-17),
        // so this screen forwards EVERY package instead of asking for money the
        // product does not currently need.
        //
        // Kept as a pass-through rather than deleted: the flow no longer routes
        // through here, but old links, bookmarks and the browser back button do,
        // and landing on a payment form for an already-open service would be
        // exactly the kind of dead end this codebase avoids. The screen itself is
        // intact below and comes back into the flow with the locks.
        //
        // A package with no content goes to generation rather than to the resume —
        // the same forwarding rule the paid version used, for the same reason: do
        // not drop someone on an empty resume.
        router.replace(
          p.optimized_content
            ? `/package/${encodeURIComponent(packageId)}`
            : `/optimize/generate/${encodeURIComponent(packageId)}`,
        )
      })
      .catch(() => setError('Could not load this package.'))
  }, [packageId, router])

  const redeem = useCallback(async () => {
    if (!code.trim() || redeeming) return
    setRedeeming(true)
    setRedeemError(null)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(packageId)}/redeem-promo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setRedeemError((body?.error as string) ?? 'Could not redeem this code.')
        setRedeeming(false)
        return
      }
      // Paid — NOW build it. Generation deliberately happens after this point
      // and nowhere else (TASK-131).
      router.push(`/optimize/generate/${encodeURIComponent(packageId)}`)
    } catch {
      setRedeemError('Network error. Please try again.')
      setRedeeming(false)
    }
  }, [code, packageId, redeeming, router])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper px-5">
        <Alert variant="danger">{error}</Alert>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-paper">
        <p className="font-mono text-sm text-slate">Loading…</p>
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-10 font-redesign-sans">
      <Card tone="light" className="flex w-full max-w-[520px] flex-col gap-3 p-5 sm:p-6">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-bp text-[20px] leading-none text-graphite focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-ink focus-visible:ring-offset-2"
        >
          ←
        </button>
        <h1 className="font-bp-display text-[27px] leading-tight text-graphite">One payment. No surprises.</h1>

        {/* Order summary */}
        <div className="flex flex-col gap-3 rounded-bp-lg border border-edge bg-white p-4.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-graphite">Optimized Gulf CV</span>
            <span className="font-mono text-[15px] text-graphite">₹499</span>
          </div>
          <p className="text-[12px] text-slate">
            {pkg.target_job_title}
            {pkg.target_company ? ` · ${pkg.target_company}` : ''}
          </p>
          <div className="h-px bg-edge" />
          <div className="flex flex-col gap-1.5 text-[12px] text-graphite-soft">
            <div className="flex gap-2">
              {/* Says PDF only. Word download is not offered yet (founder
                  decision, 2026-08-16) — this line sits on the PAYMENT screen,
                  so promising a format the buyer cannot then download is the
                  one place that mistake actually costs money and trust. */}
              <span className="text-signal">✓</span> PDF download
            </div>
            <div className="flex gap-2">
              <span className="text-signal">✓</span> Edit and re-download anytime
            </div>
            <div className="flex gap-2">
              <span className="text-signal">✓</span> Saved to your Library forever
            </div>
          </div>
          <p className="text-[12px] text-slate">No subscription. No auto-renewal. Taxes included.</p>
        </div>

        {/* Promo code — the actual unlock path while Razorpay is blocked */}
        <div className="flex flex-col gap-2.5 rounded-bp-lg border border-signal/30 bg-signal-tint p-4.5">
          <span className="text-[12px] font-bold text-graphite">Have a promo code?</span>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              aria-label="Promo code"
              className="min-h-11 flex-1 rounded-bp border border-edge bg-white px-3 text-[13px] uppercase tracking-wide text-graphite-soft outline-none focus:border-signal-ink focus:ring-2 focus:ring-signal-ink/20"
            />
            <button
              type="button"
              disabled={!code.trim() || redeeming}
              onClick={() => redeem()}
              className="min-h-11 rounded-bp bg-signal px-4 text-[13px] font-bold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal focus-visible:ring-offset-2"
            >
              {redeeming ? 'Checking…' : 'Unlock'}
            </button>
          </div>
          {redeemError ? <Alert variant="danger">{redeemError}</Alert> : null}
        </div>

        {/* Razorpay — honestly disabled, not a dead link */}
        <div className="flex flex-col gap-2 rounded-bp-lg border border-dashed border-edge-strong bg-paper p-4.5 opacity-70">
          <span className="text-[12px] font-bold text-graphite">Card · UPI · Netbanking · Wallet</span>
          <p className="text-[12px] text-slate">
            Coming soon. We never see or store your card details.
          </p>
        </div>

        <p className="mt-1 text-center text-[12px] text-slate">
          Something went wrong with your order? Email the founder directly — replies within a day.
        </p>
      </Card>
    </main>
  )
}

export default function PaymentPage({ params }: { params: { packageId: string } }) {
  const packageId = params.packageId
  return (
    <Suspense>
      <PaymentPageInner packageId={packageId} />
    </Suspense>
  )
}
