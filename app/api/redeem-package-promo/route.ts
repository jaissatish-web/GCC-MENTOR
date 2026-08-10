import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { normalizeCode } from '@/lib/admin/promoCodes'
import { redeemPackagePromoCode } from '@/lib/admin/servicePackages'
import {
  getRateLimitStatus,
  incrementRateLimit,
  LIMIT_ACTION_PROMO_REDEMPTION,
} from '@/lib/rateLimit'

/**
 * Package-promo redemption (TASK-065) — the user-facing counterpart to
 * TASK-060's redeemPackagePromoCode. Deliberately separate from
 * app/api/packages/[id]/redeem-promo/route.ts (TASK-051): that route
 * unlocks ONE package's is_paid via the original redeem_promo_code and
 * stays completely untouched. This route is not scoped to any package at
 * all — a package-promo code grants service credits to the user's account
 * (user_service_credits), spendable later across any of their packages, so
 * there is no packageId in this URL.
 *
 * POST /api/redeem-package-promo   body: { code: string }
 *
 * Same abuse posture as the existing redemption route: rate-limited on
 * ATTEMPTS (not just successes) before calling the RPC, reusing the same
 * LIMIT_ACTION_PROMO_REDEMPTION bucket — a guessable code string is the
 * same threat model regardless of which kind of code it turns out to be.
 * The actual redemption (validate code, increment its count, grant
 * credits) is one atomic Postgres function call — never a read-then-write
 * here (migration 026's redeem_package_promo_code).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const rawCode = (body as { code?: unknown })?.code
  if (typeof rawCode !== 'string' || rawCode.trim() === '') {
    return NextResponse.json({ error: 'Enter a promo code' }, { status: 400 })
  }
  const code = normalizeCode(rawCode)

  const status = await getRateLimitStatus({ userId: user.id, action: LIMIT_ACTION_PROMO_REDEMPTION })
  if (!status.allowed) {
    return NextResponse.json({ error: status.message ?? 'Too many attempts. Try again later.' }, { status: 429 })
  }
  await incrementRateLimit({ userId: user.id, action: LIMIT_ACTION_PROMO_REDEMPTION })

  const redeemed = await redeemPackagePromoCode(code, user.id)

  if (!redeemed) {
    return NextResponse.json(
      { error: 'That code is invalid, expired, already fully used, or not this kind of code.' },
      { status: 400 },
    )
  }

  console.info(`package promo redeemed: code=${code} user=${user.id}`)
  return NextResponse.json({ ok: true })
}
