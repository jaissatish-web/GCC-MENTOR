import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { normalizeCode } from '@/lib/admin/promoCodes'
import {
  getRateLimitStatus,
  incrementRateLimit,
  LIMIT_ACTION_PROMO_REDEMPTION,
} from '@/lib/rateLimit'

/**
 * Promo-code redemption — TASK-051 (Razorpay payment bypass while KYC stays
 * blocked on the founder's Saudi Arabia residency).
 *
 * POST /api/packages/[id]/redeem-promo   body: { code: string }
 *
 * Auth first (401). Rate-limited BEFORE attempting redemption — a promo code
 * is a guessable string, so attempts (not just successes) must be capped, or
 * this endpoint is a brute-force oracle. Ownership of the package is checked
 * TWICE, independently: once here (the package must belong to the caller —
 * checked before even calling the RPC, so a wrong/foreign package id 404s
 * cleanly) and once again inside redeem_promo_code itself (migration 021) —
 * neither check relies on the other having been correct.
 *
 * The actual redemption (validate code, increment its count, flip
 * packages.is_paid) is ONE atomic Postgres function call — never a
 * read-then-write here, see migration 021 for why.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const packageId = params.id
  if (typeof packageId !== 'string' || packageId.trim() === '') {
    return NextResponse.json({ error: 'Invalid package id' }, { status: 400 })
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

  // ---- Ownership check #1: the package must be the caller's own, and not
  // already paid (mirrors the RPC's own check — belt and suspenders) --------
  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select('id, is_paid')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgError) {
    console.error('redeem-promo: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }
  if (pkgRow.is_paid) {
    return NextResponse.json({ error: 'This package is already unlocked' }, { status: 400 })
  }

  // ---- Rate limit: attempts, not just successes ----------------------------
  const status = await getRateLimitStatus({ userId: user.id, action: LIMIT_ACTION_PROMO_REDEMPTION })
  if (!status.allowed) {
    return NextResponse.json({ error: status.message ?? 'Too many attempts. Try again later.' }, { status: 429 })
  }
  // Count this attempt regardless of outcome — a guesser must not get
  // unlimited free tries just because their guesses are wrong.
  await incrementRateLimit({ userId: user.id, action: LIMIT_ACTION_PROMO_REDEMPTION })

  // ---- The atomic redemption -------------------------------------------------
  const serviceSupabase = createServiceRoleClient()
  const { data: redeemed, error: rpcError } = await serviceSupabase.rpc('redeem_promo_code', {
    p_code: code,
    p_package_id: packageId,
    p_user_id: user.id,
  })

  if (rpcError) {
    console.error('redeem-promo: rpc error user=' + user.id + ' pkg=' + packageId, rpcError.message)
    return NextResponse.json({ error: 'Could not redeem this code. Please try again.' }, { status: 500 })
  }

  if (!redeemed) {
    return NextResponse.json(
      { error: 'That code is invalid, expired, or has already been fully used.' },
      { status: 400 }
    )
  }

  console.info(`promo code redeemed: code=${code} user=${user.id} package=${packageId}`)
  return NextResponse.json({ ok: true })
}
