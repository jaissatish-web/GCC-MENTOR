import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { loadCareerProfileFull, ProfileLoadError } from '@/lib/packages/profileLoader'
import { LIMIT_ACTION_JOB_DESCRIPTION } from '@/lib/rateLimit'
import { checkReport, getAnalysisV3, isAnalysisCachedV3 } from '@/lib/optimizer/v3/service'

/**
 * POST /api/optimize/check — "check this job" on the level screen (optimizer v3,
 * 2026-10-02).
 *
 * Runs the ONE analysis for this job and profile (cached — the build reuses it,
 * so checking first makes the build faster, not slower) and answers what the
 * user should know before choosing a level:
 *   - field match: same field / partly your field / outside your field
 *   - the honest best score per level
 *   - certificates and licences the job asks for that the profile does not show
 *     — offered, never written
 *   - whether this user still has to see the first-time explainer and agreement
 *
 * Body: { profileId, targetFields: { target_job_title, target_industry? }, jobDescription? }
 * Rate limited like a job analysis; a cached answer costs nothing.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const tf = (body?.targetFields ?? null) as Record<string, unknown> | null
  const profileId = typeof body?.profileId === 'string' ? body.profileId : ''
  const title = typeof tf?.target_job_title === 'string' ? tf.target_job_title.trim() : ''
  if (!profileId || !title) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const industry = typeof tf?.target_industry === 'string' && tf.target_industry.trim() ? tf.target_industry.trim() : null
  const jd = typeof body?.jobDescription === 'string' && body.jobDescription.trim() ? body.jobDescription.slice(0, 20_000) : null

  let profile
  try {
    profile = await loadCareerProfileFull(supabase, profileId, user.id)
  } catch (e) {
    if (e instanceof ProfileLoadError) return NextResponse.json({ error: 'We could not read your Career Profile just now. Please try again.' }, { status: 503 })
    throw e
  }
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { count } = await supabase
    .from('packages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .not('optimized_content', 'is', null)
  const firstTime = !profile.optimizer_consent_at || !count

  // A cached analysis for this job and this version of the profile costs nothing.
  const isCached = await isAnalysisCachedV3(user.id, profile, title, industry, jd)
  const reservation = isCached ? null : await reserveAiAction({ userId: user.id, action: LIMIT_ACTION_JOB_DESCRIPTION, phone: profile.phone, email: profile.email, ttlSeconds: 120 })
  if (reservation && !reservation.ok) return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })

  let ok = false
  try {
    const { analysis } = await getAnalysisV3({ userId: user.id, profile, targetJobTitle: title, targetIndustry: industry, jobDescription: jd, route: '/api/optimize/check' })
    const report = checkReport(profile, analysis, title, jd, profile.field_visibility)
    ok = true
    return NextResponse.json({ success: true, check: report, consented: !!profile.optimizer_consent_at, firstTime })
  } catch (e) {
    console.error('optimize check: failed user=' + user.id, e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'We could not check this job just now. You can still optimize.' }, { status: 503 })
  } finally {
    if (reservation) await reservation.finish(ok)
  }
}
