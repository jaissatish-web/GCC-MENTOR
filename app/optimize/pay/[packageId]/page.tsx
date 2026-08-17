'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/Card'
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
      <div className="flex min-h-dvh items-center justify-center bg-bg px-5">
        <p className="text-sm text-terra">{error}</p>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg">
        <p className="font-mono text-sm text-ink-400">Loading…</p>
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-bg px-5 py-10 font-redesign-sans">
      <Card tone="light" className="flex w-full max-w-[520px] flex-col gap-3 p-5 sm:p-6">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-radius-md text-[20px] leading-none text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-deep focus-visible:ring-offset-2"
        >
          ←
        </button>
        <h1 className="font-serif text-[27px] leading-tight text-ink-900">One payment. No surprises.</h1>

        {/* Order summary */}
        <div className="flex flex-col gap-3 rounded-radius-lg border border-line-light bg-surface-light p-4.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-ink-900">Optimized Gulf CV</span>
            <span className="font-mono text-[15px] text-ink-900">₹499</span>
          </div>
          <p className="text-[11px] text-ink-400">
            {pkg.target_job_title}
            {pkg.target_company ? ` · ${pkg.target_company}` : ''}
          </p>
          <div className="h-px bg-line-light" />
          <div className="flex flex-col gap-1.5 text-[12px] text-ink-700">
            <div className="flex gap-2">
              {/* Says PDF only. Word download is not offered yet (founder
                  decision, 2026-08-16) — this line sits on the PAYMENT screen,
                  so promising a format the buyer cannot then download is the
                  one place that mistake actually costs money and trust. */}
              <span className="text-forest">✓</span> PDF download
            </div>
            <div className="flex gap-2">
              <span className="text-forest">✓</span> Edit and re-download anytime
            </div>
            <div className="flex gap-2">
              <span className="text-forest">✓</span> Saved to your Library forever
            </div>
          </div>
          <p className="text-[10.5px] text-ink-400">No subscription. No auto-renewal. Taxes included.</p>
        </div>

        {/* Promo code — the actual unlock path while Razorpay is blocked */}
        <div className="flex flex-col gap-2.5 rounded-radius-lg border border-forest/30 bg-forest-tint p-4.5">
          <span className="text-[12px] font-bold text-ink-900">Have a promo code?</span>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              aria-label="Promo code"
              className="min-h-11 flex-1 rounded-radius-md border border-line-light bg-surface-light px-3 text-[13px] uppercase tracking-wide text-ink-700 outline-none focus:border-forest-deep focus:ring-2 focus:ring-forest-deep/20"
            />
            <button
              type="button"
              disabled={!code.trim() || redeeming}
              onClick={() => redeem()}
              className="min-h-11 rounded-radius-md bg-forest px-4 text-[13px] font-bold text-marble disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
            >
              {redeeming ? 'Checking…' : 'Unlock'}
            </button>
          </div>
          {redeemError ? <p className="text-[11.5px] text-terra">{redeemError}</p> : null}
        </div>

        {/* Razorpay — honestly disabled, not a dead link */}
        <div className="flex flex-col gap-2 rounded-radius-lg border border-dashed border-line-light-strong bg-surface-2-light p-4.5 opacity-70">
          <span className="text-[12px] font-bold text-ink-900">Card · UPI · Netbanking · Wallet</span>
          <p className="text-[11px] text-ink-400">
            Coming soon. We never see or store your card details.
          </p>
        </div>

        <p className="mt-1 text-center text-[11px] text-ink-400">
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
