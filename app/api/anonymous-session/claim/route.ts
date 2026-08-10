import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SESSION_COOKIE_NAME, claimAnonymousSession } from '@/lib/anonymousSession'

/**
 * Claim an anonymous analysis session (TASK-069) — docs/GCC_READINESS_JOB_MATCH.md
 * §17: "The user must NOT have to upload the resume again... The exact result
 * they saw before signup should be preserved."
 *
 * Auth-required (unlike /api/ats-scan): the cookie alone proves "this browser
 * ran an anonymous scan," but claiming writes that data into a specific
 * user's flow, so the caller must be a real, currently-authenticated session
 * — same standard as every other authenticated route in this product.
 *
 * NEW-ACCOUNT-ONLY, by design: if the caller already has a saved
 * career_profiles row, this refuses the claim (returns draft: null) even
 * with a valid cookie. Without this check, a RETURNING user who happens to
 * have a leftover anonymous-session cookie on the same browser (e.g. they
 * tried the free scanner once ages ago, unrelated to today's login) could
 * have a stale draft silently populated into their onboarding flow — which
 * risks exactly the full-object-PUT-overwrite hazard already on record as
 * Unplanned #13 in docs/TASKS.md. Scoping this to brand-new accounts only
 * closes that off entirely rather than relying on the frontend to avoid
 * triggering it.
 *
 * Always 200 with `{ draft: null }` for "nothing to claim" — this is a
 * normal, common outcome (most signups never ran an anonymous scan first),
 * never an error.
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

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.json({ draft: null })
  }

  // New-account-only guard — see header. Scoped to user_id, never trusting
  // an id alone, same pattern as every other ownership check in this codebase.
  const { data: existingProfile } = await supabase
    .from('career_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingProfile) {
    const response = NextResponse.json({ draft: null })
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  const claimed = await claimAnonymousSession(token)

  const response = NextResponse.json({
    draft: claimed?.extractedProfile ?? null,
    atsScore: claimed?.atsScoreResult ?? null,
    jobMatch: claimed?.jobMatchResult ?? null,
    jobDescription: claimed?.jobDescription ?? null,
  })
  // Single-use either way — a consumed token or a dead one should not be
  // presented again.
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}
