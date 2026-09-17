import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { LIMIT_ACTION_JOB_DESCRIPTION } from '@/lib/rateLimit'
import { loadCareerProfileFull, ProfileLoadError } from '@/lib/packages/profileLoader'
import { analysisNeedsModel, resolveAnalysis } from '@/lib/optimizer/resolveAnalysis'
import { baselineDocument, qualificationScore } from '@/lib/optimizer/analyze'
import { buildEvidenceMap } from '@/lib/optimizer/evidence'
import { maxAchievableScore, scoreDocumentFromResume, scoreResume } from '@/lib/optimizer/score'
import type { AnalysisView } from '@/lib/optimizer/view'

/**
 * POST /api/optimize/analyze (2026-09-17) — the match report shown on the setup
 * screen BEFORE anything is generated. docs/17_OPTIMIZER_ENGINE.md §2.
 *
 * Body: { profileId, targetFields: { target_job_title, target_industry? }, jobDescription? }
 *
 * Analyses the advert (or, with none, the job title) into matchable
 * requirements, bridges them to the caller's own profile, and returns the
 * deterministic score of the resume as it stands today, the honest maximum,
 * and everything the screen needs to project a score per level and selection
 * in the browser without another request.
 *
 * Cached (migration 056): the second analysis of the same job costs no model
 * call; a profile edit re-runs only the evidence half. Nothing is created in
 * `packages` — a user may check their match and leave.
 */

const MAX_JD_CHARS = 20_000

export async function POST(request: NextRequest): Promise<NextResponse> {
  const giveUpAt = Date.now() + 150_000
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    const raw = await request.json()
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('shape')
    body = raw as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : ''
  const tf = (typeof body.targetFields === 'object' && body.targetFields !== null ? body.targetFields : {}) as Record<string, unknown>
  const targetJobTitle = typeof tf.target_job_title === 'string' ? tf.target_job_title.trim() : ''
  const targetIndustry = typeof tf.target_industry === 'string' && tf.target_industry.trim() ? tf.target_industry.trim() : null
  const jobDescription =
    typeof body.jobDescription === 'string' && body.jobDescription.trim() ? body.jobDescription.trim().slice(0, MAX_JD_CHARS) : null
  if (!profileId) return NextResponse.json({ error: 'Invalid field: profileId' }, { status: 400 })
  if (!targetJobTitle || targetJobTitle.length > 300) {
    return NextResponse.json({ error: 'Invalid field: targetFields.target_job_title' }, { status: 400 })
  }

  let profile
  try {
    profile = await loadCareerProfileFull(supabase, profileId, user.id)
  } catch (e) {
    if (e instanceof ProfileLoadError) {
      return NextResponse.json({ error: 'We could not read your full Career Profile just now. Please try again.' }, { status: 503 })
    }
    throw e
  }
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // Model calls pass the same guard as every other one. A cached analysis
  // costs nothing and needs no slot.
  const needsModel = await analysisNeedsModel({ userId: user.id, profile, targetJobTitle, targetIndustry, jobDescription })
  const reservation = needsModel
    ? await reserveAiAction({ userId: user.id, action: LIMIT_ACTION_JOB_DESCRIPTION, phone: profile.phone, email: profile.email, ttlSeconds: 180 })
    : null
  if (reservation && !reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  let resolved
  try {
    resolved = await resolveAnalysis({
      userId: user.id,
      profile,
      targetJobTitle,
      targetIndustry,
      jobDescription,
      generateFn: generate,
      route: '/api/optimize/analyze',
      giveUpAt,
    })
  } finally {
    if (reservation && reservation.ok) await reservation.finish(true)
  }
  if (!resolved) {
    return NextResponse.json(
      { error: "We couldn't analyse this job just now. You can still build your CV — the match score will be added when it's ready." },
      { status: 502 },
    )
  }

  const baseline = baselineDocument(profile, targetJobTitle)
  const scoreDocument = scoreDocumentFromResume(baseline)
  const evidence = buildEvidenceMap(profile, resolved.targetProfile, resolved.bridges)
  const qualifications = qualificationScore(profile, resolved.targetProfile)
  const before = scoreResume(scoreDocument, resolved.targetProfile, qualifications)
  const maxTotal = maxAchievableScore(scoreDocument, resolved.targetProfile, evidence.keywords, qualifications, {
    summary: true,
    experienceIds: (profile.work_experience ?? []).map((e) => e.id),
  })

  const view: AnalysisView = {
    analysisId: resolved.analysisId,
    mode: resolved.targetProfile.mode,
    target: resolved.targetProfile,
    before,
    maxTotal,
    qualifications,
    keywords: evidence.keywords,
    scoreDocument,
  }
  return NextResponse.json(view)
}
