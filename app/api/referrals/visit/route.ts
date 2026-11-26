import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { REFERRAL_BROWSER_COOKIE, REFERRAL_CLAIM_COOKIE, REFERRAL_CODE, REFERRAL_TOKEN } from '@/lib/referrals/cookies'

const BROWSER_ID_MAX_AGE = 90 * 24 * 60 * 60

export async function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/', request.url))
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')

  const code = request.nextUrl.searchParams.get('ref')
  const agent = request.headers.get('user-agent') ?? ''
  const purpose = request.headers.get('sec-purpose') ?? request.headers.get('purpose') ?? ''
  const destination = request.headers.get('sec-fetch-dest')
  if ((destination && destination !== 'document') || !code || !REFERRAL_CODE.test(code) || !agent || /bot|crawler|spider|preview/i.test(agent)
    || /prefetch|prerender/i.test(purpose) || request.headers.has('next-router-prefetch')) {
    return response
  }

  const browserCookie = request.cookies.get(REFERRAL_BROWSER_COOKIE)?.value ?? ''
  const existingClaim = request.cookies.get(REFERRAL_CLAIM_COOKIE)?.value ?? ''
  const browserId = REFERRAL_TOKEN.test(browserCookie) ? browserCookie : crypto.randomUUID()
  try {
    const { data, error } = await createServiceRoleClient({ fresh: true }).rpc('record_referral_visit', {
      p_code: code,
      p_browser_id: browserId,
      p_existing_claim: REFERRAL_TOKEN.test(existingClaim) ? existingClaim : null,
    }).maybeSingle<{ claim_id: string; claim_expires_at: string }>()
    if (error) console.error('referral visit failed', error.code)
    if (data) {
      const options = { httpOnly: true, sameSite: 'lax' as const, secure: request.nextUrl.protocol === 'https:', path: '/' }
      response.cookies.set(REFERRAL_BROWSER_COOKIE, browserId, { ...options, maxAge: BROWSER_ID_MAX_AGE })
      response.cookies.set(REFERRAL_CLAIM_COOKIE, data.claim_id, { ...options, expires: new Date(data.claim_expires_at) })
    }
  } catch {
    console.error('referral visit storage unavailable')
  }
  return response
}
