'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
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
        if (p.is_paid) {
          router.replace(`/package/${encodeURIComponent(packageId)}`)
          return
        }
        setPkg(p)
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
      router.push(`/package/${encodeURIComponent(packageId)}`)
    } catch {
      setRedeemError('Network error. Please try again.')
      setRedeeming(false)
    }
  }, [code, packageId, redeeming, router])

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-marble px-5">
        <p className="text-sm text-state-terra-text">{error}</p>
      </div>
    )
  }

  if (!pkg) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-marble">
        <p className="font-mono text-sm text-ink-muted">Loading…</p>
      </div>
    )
  }

  return (
    <main className="flex min-h-dvh flex-col bg-marble">
      <header className="flex h-11 items-center justify-between px-5 text-[12px] font-semibold text-midnight">
        <span>9:41</span>
        <span className="tracking-[0.14em]">▮▮▮</span>
      </header>

      <div className="flex flex-col gap-3 px-5 pb-6 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
        >
          ←
        </button>
        <h1 className="font-serif text-[27px] leading-tight text-midnight">One payment. No surprises.</h1>

        {/* Order summary */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-white p-4.5">
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-midnight">Optimized Gulf CV</span>
            <span className="font-mono text-[15px] text-midnight">₹499</span>
          </div>
          <p className="text-[11px] text-ink-muted">
            {pkg.target_job_title}
            {pkg.target_company ? ` · ${pkg.target_company}` : ''}
          </p>
          <div className="h-px bg-line-soft" />
          <div className="flex flex-col gap-1.5 text-[12px] text-ink-body">
            <div className="flex gap-2">
              <span className="text-emerald">✓</span> PDF and Word download
            </div>
            <div className="flex gap-2">
              <span className="text-emerald">✓</span> Edit and re-download anytime
            </div>
            <div className="flex gap-2">
              <span className="text-emerald">✓</span> Saved to your Library forever
            </div>
          </div>
          <p className="text-[10.5px] text-ink-faint">No subscription. No auto-renewal. Taxes included.</p>
        </div>

        {/* Promo code — the actual unlock path while Razorpay is blocked */}
        <div className="flex flex-col gap-2.5 rounded-2xl border border-emerald/30 bg-state-emerald-bg p-4.5">
          <span className="text-[12px] font-bold text-midnight">Have a promo code?</span>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter code"
              aria-label="Promo code"
              className="min-h-11 flex-1 rounded-lg border border-line bg-white px-3 text-[13px] uppercase tracking-wide text-ink-body outline-none focus:border-midnight focus:ring-2 focus:ring-midnight/20"
            />
            <button
              type="button"
              disabled={!code.trim() || redeeming}
              onClick={() => redeem()}
              className="min-h-11 rounded-lg bg-emerald px-4 text-[13px] font-bold text-marble disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald focus-visible:ring-offset-2"
            >
              {redeeming ? 'Checking…' : 'Unlock'}
            </button>
          </div>
          {redeemError ? <p className="text-[11.5px] text-state-terra-text">{redeemError}</p> : null}
        </div>

        {/* Razorpay — honestly disabled, not a dead link */}
        <div className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-strong bg-fill-subtle p-4.5 opacity-70">
          <span className="text-[12px] font-bold text-midnight">Card · UPI · Netbanking · Wallet</span>
          <p className="text-[11px] text-ink-muted">
            Coming soon. We never see or store your card details.
          </p>
        </div>

        <p className="mt-1 text-center text-[11px] text-ink-warm">
          Something went wrong with your order? Email the founder directly — replies within a day.
        </p>
      </div>
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
