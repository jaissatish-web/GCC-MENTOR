import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import type { SelectedBlocks, OptimizationTarget } from '@/lib/ai/buildOptimizationPrompt'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { loadCareerProfileFull, ProfileLoadError } from '@/lib/packages/profileLoader'
import { appendPackageEventAtomic, insertPackageForUser, updatePackageServerFields } from '@/lib/packages/serverWrites'
import { getTemplate } from '@/lib/templates'
import { LIMIT_ACTION_JOB_DESCRIPTION, LIMIT_ACTION_OPTIMIZATION } from '@/lib/rateLimit'
import { analysisInputHash, bridgeEvidence, buildAnalysisReport, profileFingerprint } from '@/lib/optimizer/analyze'
import { getAnalysisById } from '@/lib/optimizer/analysisStore'
import { analysisNeedsModel, resolveAnalysis } from '@/lib/optimizer/resolveAnalysis'
import { runOptimizationPipeline } from '@/lib/optimizer/pipeline'
import { validateKeywords } from '@/lib/optimizer/jobAnalysis'
import { verifyBridges } from '@/lib/optimizer/evidence'
import type { JobTargetProfile, MatchReport, VerifiedBridge } from '@/lib/optimizer/types'
import type { CareerProfileFull, TargetCountry } from '@/types/careerProfile'
import type { OptimizationLevel } from '@/types/package'

/**
 * Optimization route (TASK-021; rebuilt on the optimizer engine 2026-09-17 —
 * docs/17_OPTIMIZER_ENGINE.md).
 *
 * TWO PHASES, ONE ROUTE
 *   PHASE A  POST { profileId, targetFields, jobDescription, selectedBlocks, level, analysisId? }
 *            -> creates the package EMPTY and returns its id. No model call.
 *               Since 2026-09-17 the setup screen sends no analysis (no score
 *               before optimizing), so Phase B runs the one analysis call. An
 *               analysisId from another caller is still attached when it
 *               matches this exact target.
 *   PHASE B  POST { packageId }
 *            -> generates into that row through lib/optimizer/pipeline.ts.
 *
 * Phase B reads every target field back off the ROW, never from the request,
 * so a caller cannot set up one job title and generate against another.
 *
 * Nothing about validity is trusted from the client. Every generated word passes
 * the grounding validator, the quality gate and the review before it is saved,
 * or the block keeps the candidate's own text.
 *
 * Ownership (docs/TASKS.md Unplanned #5): the profile is loaded scoped to
 * `user_id = caller` AND `id = profileId`; an analysis by `user_id = caller`
 * AND `id = analysisId`. Neither id is ever trusted alone.
 *
 * NO PAYMENT CHECK while the locks are off (founder decision 2026-08-17); when
 * they return, the check goes at the top of Phase B. RATE LIMITED — see
 * LIMIT_ACTION_OPTIMIZATION in lib/rateLimit.ts.
 *
 * No `maxDuration` (removed 2026-09-11): the platform ceiling here is 300s, and
 * the route keeps its own give-up point inside it.
 */

const TARGET_COUNTRIES: TargetCountry[] = [
  'saudi_arabia', 'uae', 'qatar', 'oman', 'kuwait', 'bahrain', 'generic_gulf',
]
const OPTIMIZATION_LEVELS: OptimizationLevel[] = ['easy', 'moderate', 'high']

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

interface ParsedBody {
  profileId: string
  targetFields: OptimizationTarget
  jobDescription: string | null
  selectedBlocks: SelectedBlocks
  level: OptimizationLevel
  analysisId: string | null
}

/** Validate the request body. Returns the offending field name only (never a value) or the parsed body. */
function validateBody(body: unknown): { error: string } | { body: ParsedBody } {
  if (!isObject(body)) return { error: 'body' }

  if (typeof body.profileId !== 'string' || body.profileId.trim() === '') return { error: 'profileId' }

  const tf = body.targetFields
  if (!isObject(tf)) return { error: 'targetFields' }
  if (typeof tf.target_job_title !== 'string' || tf.target_job_title.trim() === '') {
    return { error: 'targetFields.target_job_title' }
  }
  // Optional (migration 043) — see lib/ai/personas.ts's fallback note.
  if (tf.target_industry !== undefined && tf.target_industry !== null && typeof tf.target_industry !== 'string') {
    return { error: 'targetFields.target_industry' }
  }
  // Optional (migration 030) — null/absent is valid; if present it must be a real enum member.
  if (tf.target_country !== undefined && tf.target_country !== null) {
    if (typeof tf.target_country !== 'string' || !TARGET_COUNTRIES.includes(tf.target_country as TargetCountry)) {
      return { error: 'targetFields.target_country' }
    }
  }
  if (tf.target_company !== undefined && tf.target_company !== null && typeof tf.target_company !== 'string') {
    return { error: 'targetFields.target_company' }
  }

  if (body.jobDescription !== undefined && body.jobDescription !== null && typeof body.jobDescription !== 'string') {
    return { error: 'jobDescription' }
  }

  const sb = body.selectedBlocks
  if (!isObject(sb)) return { error: 'selectedBlocks' }
  if (typeof sb.summary !== 'boolean') return { error: 'selectedBlocks.summary' }
  if (!Array.isArray(sb.experienceIds) || sb.experienceIds.some((x) => typeof x !== 'string')) {
    return { error: 'selectedBlocks.experienceIds' }
  }
  // "Optimize nothing" (open item B8) is rejected: it would spend a build and
  // deliver the candidate's own text back.
  if (!sb.summary && sb.experienceIds.length === 0) return { error: 'selectedBlocks' }

  if (typeof body.level !== 'string' || !OPTIMIZATION_LEVELS.includes(body.level as OptimizationLevel)) {
    return { error: 'level' }
  }
  if (body.analysisId !== undefined && body.analysisId !== null && typeof body.analysisId !== 'string') {
    return { error: 'analysisId' }
  }

  const jd = typeof body.jobDescription === 'string' && body.jobDescription.trim() !== '' ? body.jobDescription : null
  return {
    body: {
      profileId: body.profileId,
      targetFields: {
        target_job_title: tf.target_job_title,
        target_industry: (tf.target_industry as string | null | undefined) ?? null,
        target_country: (tf.target_country as TargetCountry | null | undefined) ?? null,
        target_company: (tf.target_company as string | null | undefined) ?? null,
      },
      jobDescription: jd,
      selectedBlocks: {
        summary: sb.summary,
        experienceIds: sb.experienceIds as string[],
      },
      level: body.level as OptimizationLevel,
      analysisId: typeof body.analysisId === 'string' && body.analysisId.trim() ? body.analysisId.trim() : null,
    },
  }
}

/** A stored report is data: re-validate the parts the engine will trust. */
function readStoredAnalysis(raw: unknown, profile: CareerProfileFull): { target: JobTargetProfile; bridges: VerifiedBridge[]; fingerprint: string; analysisId: string | null } | null {
  if (!isObject(raw) || !isObject(raw.target)) return null
  const t = raw.target as unknown as JobTargetProfile
  const keywords = validateKeywords(t.keywords)
  if (keywords.length === 0 || (t.mode !== 'job_description' && t.mode !== 'target_title_only')) return null
  const target: JobTargetProfile = { ...t, keywords, title_variants: Array.isArray(t.title_variants) ? t.title_variants : [] }
  return {
    target,
    bridges: verifyBridges(profile, target, raw.bridges),
    fingerprint: typeof raw.profile_fingerprint === 'string' ? raw.profile_fingerprint : '',
    analysisId: typeof raw.analysis_id === 'string' ? raw.analysis_id : null,
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // The route's own give-up point inside the platform's 300s ceiling
  // (2026-09-12): no model attempt starts or runs past it, so the route always
  // answers with its own message instead of the platform's timeout page.
  const giveUpAt = Date.now() + 280 * 1000
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const bodyObj = (rawBody ?? {}) as Record<string, unknown>
  const generatePackageId =
    typeof bodyObj.packageId === 'string' && bodyObj.packageId.trim() ? bodyObj.packageId.trim() : null

  let profileId: string
  let targetFields: OptimizationTarget
  let jobDescription: string | null
  let selectedBlocks: SelectedBlocks
  let level: OptimizationLevel
  let storedReport: unknown = null
  let parsedAnalysisId: string | null = null

  if (generatePackageId) {
    const { data: pkgRow, error: pkgErr } = await supabase
      .from('packages')
      .select('*')
      .eq('id', generatePackageId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (pkgErr) {
      console.error('optimize: package lookup failed user=' + user.id, pkgErr.message)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
    if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    // Idempotence: a double-click, a refresh, or a retry must not spend a
    // second build on a package that already has its resume.
    if (pkgRow.optimized_content) {
      return NextResponse.json({ success: true, packageId: generatePackageId, alreadyGenerated: true })
    }

    profileId = pkgRow.profile_id as string
    targetFields = {
      target_job_title: pkgRow.target_job_title as string,
      target_industry: pkgRow.target_industry as string | null,
      target_country: (pkgRow.target_country as TargetCountry | null) ?? null,
      target_company: (pkgRow.target_company as string | null) ?? null,
    }
    jobDescription = (pkgRow.job_description as string | null) ?? null
    storedReport = pkgRow.match_report ?? null
    level = pkgRow.optimization_level as OptimizationLevel
    selectedBlocks = (pkgRow.selected_blocks as SelectedBlocks | null) ?? { summary: true, experienceIds: [] }
  } else {
    const parsedBody = validateBody(rawBody)
    if ('error' in parsedBody) {
      return NextResponse.json({ error: `Invalid field: ${parsedBody.error}` }, { status: 400 })
    }
    ;({ profileId, targetFields, jobDescription, selectedBlocks, level } = parsedBody.body)
    parsedAnalysisId = parsedBody.body.analysisId
  }

  // One loader for every AI route (lib/packages/profileLoader.ts): a failed
  // child read is an error, not an empty work history (audit M04).
  let loadedProfile: CareerProfileFull | null
  try {
    loadedProfile = await loadCareerProfileFull(supabase, profileId, user.id)
  } catch (e) {
    if (e instanceof ProfileLoadError) {
      console.error('optimize: incomplete profile read user=' + user.id + ' table=' + e.table)
      return NextResponse.json(
        { error: 'We could not read your full Career Profile just now. Nothing was used — please try again.' },
        { status: 503 },
      )
    }
    throw e
  }
  if (!loadedProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }
  const profile: CareerProfileFull = loadedProfile

  // ---- PHASE B0: analyse the job for this package, build nothing -------------
  // POST { packageId, analyzeOnly: true }. The analysis (requirements + evidence)
  // can take 90–125s on a long profile with a reasoning model, and inside the
  // build's own request it had only 90s, so it failed and the CV shipped with
  // no ATS score (founder report 2026-09-17). The build screen now calls this
  // first, in its own request with its own time budget; the build then finds the
  // analysis in the cache and makes no analysis call.
  if (generatePackageId && bodyObj.analyzeOnly === true) {
    const input = {
      userId: user.id,
      profile,
      targetJobTitle: targetFields.target_job_title,
      targetIndustry: targetFields.target_industry,
      jobDescription,
    }
    if (readStoredAnalysis(storedReport, profile) || !(await analysisNeedsModel(input))) {
      return NextResponse.json({ success: true, analyzed: true, cached: true })
    }
    const reservation = await reserveAiAction({
      userId: user.id,
      action: LIMIT_ACTION_JOB_DESCRIPTION,
      phone: profile.phone,
      email: profile.email,
      ttlSeconds: 300,
    })
    if (!reservation.ok) {
      // Not fatal to the build: it tries a short analysis itself.
      return NextResponse.json({ success: true, analyzed: false })
    }
    let analyzed = false
    try {
      const resolved = await resolveAnalysis({ ...input, generateFn: generate, route: '/api/optimize', giveUpAt })
      analyzed = resolved !== null
    } catch (e) {
      console.error('optimize: analyze phase failed user=' + user.id, e instanceof Error ? e.message : String(e))
    } finally {
      await reservation.finish(analyzed)
    }
    console.log('optimize: analyze phase user=' + user.id + ' package=' + generatePackageId + ' ok=' + analyzed)
    return NextResponse.json({ success: true, analyzed })
  }

  // ---- PHASE A: create the package, generate nothing -------------------------
  if (!generatePackageId) {
    const chosenTemplate = getTemplate(typeof bodyObj.templateId === 'string' ? bodyObj.templateId : null)

    // Attach the setup screen's analysis only when it is the caller's AND was
    // computed for exactly this target. Anything else is ignored, and Phase B
    // analyses inline instead.
    let matchReport: MatchReport | null = null
    if (parsedAnalysisId) {
      const analysis = await getAnalysisById(user.id, parsedAnalysisId)
      const expectedHash = analysisInputHash(targetFields.target_job_title, targetFields.target_industry, jobDescription)
      if (analysis && analysis.inputHash === expectedHash) {
        matchReport = buildAnalysisReport({
          profile,
          target: analysis.targetProfile,
          bridges: verifyBridges(profile, analysis.targetProfile, analysis.bridges),
          analysisId: analysis.id,
          targetJobTitle: targetFields.target_job_title,
        })
      }
    }

    const { row: createdRow, error: createError } = await insertPackageForUser<{ id: string }>({
      userId: user.id,
      row: {
        profile_id: profileId,
        target_job_title: targetFields.target_job_title,
        target_industry: targetFields.target_industry,
        target_country: targetFields.target_country,
        target_company: targetFields.target_company,
        job_description: jobDescription,
        // Kept for Job Match consumers (migration 045); the engine reads match_report.
        structured_job: matchReport?.target.structured ?? null,
        match_report: matchReport,
        optimization_level: level,
        selected_blocks: selectedBlocks,
        // Stamp the template AND its version at creation (migration 035).
        template_id: chosenTemplate.id,
        template_version: chosenTemplate.version,
        optimized_content: null,
        skills_order: null,
        field_visibility_snapshot: profile.field_visibility,
        // FALSE while the locks are off: nothing was paid (see route header).
        is_paid: false,
      },
    })

    if (createError || !createdRow) {
      console.error('optimize: package create failed user=' + user.id + ' profile=' + profileId, createError ?? 'no row')
      return NextResponse.json({ error: 'Could not start your optimization. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, packageId: createdRow.id, requiresPayment: false })
  }

  // ---- PHASE B: generate into the row -----------------------------------------
  // Reserved BEFORE any model call and settled after (lib/ai/serviceGuard.ts):
  // in-flight builds count toward the daily limit, and the founder's pause
  // applies here.
  const reservation = await reserveAiAction({
    userId: user.id,
    action: LIMIT_ACTION_OPTIMIZATION,
    phone: profile.phone,
    email: profile.email,
    ttlSeconds: 330,
  })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  // Only a build that is SAVED counts as a use.
  let generatedAndSaved = false
  try {
    // The analysis: from the row when Phase A attached it, with evidence
    // re-bridged if the profile changed since; otherwise resolved now. A failed
    // analysis is not a failed build — the pipeline still writes a grounded
    // resume, just without a plan or a score.
    let target: JobTargetProfile | null = null
    let bridges: VerifiedBridge[] = []
    let analysisId: string | null = null
    const stored = readStoredAnalysis(storedReport, profile)
    try {
      if (stored) {
        target = stored.target
        analysisId = stored.analysisId
        bridges =
          stored.fingerprint === profileFingerprint(profile)
            ? stored.bridges
            : await bridgeEvidence({ generateFn: generate, profile, target, userId: user.id, route: '/api/optimize', giveUpAt: Date.now() + 60_000 })
      } else {
        const resolved = await resolveAnalysis({
          userId: user.id,
          profile,
          targetJobTitle: targetFields.target_job_title,
          targetIndustry: targetFields.target_industry,
          jobDescription,
          generateFn: generate,
          route: '/api/optimize',
          // The analyze phase normally filled the cache. If it did not, only a
          // requirements-only call fits beside the build.
          giveUpAt: Date.now() + 100_000,
          requirementsOnly: true,
        })
        if (resolved) {
          target = resolved.targetProfile
          bridges = resolved.bridges
          analysisId = resolved.analysisId
        }
      }
    } catch (e) {
      console.error('optimize: analysis failed (non-fatal) user=' + user.id, e instanceof Error ? e.message : String(e))
    }

    const result = await runOptimizationPipeline({
      profile,
      target: targetFields,
      level,
      selectedBlocks,
      jobDescription,
      targetProfile: target,
      bridges,
      analysisId,
      userId: user.id,
      giveUpAt,
      generateFn: generate,
    })

    // Codes and counts only — never a field value (docs/RULES.md §3).
    console.log(
      'optimize: pipeline user=' + user.id + ' package=' + generatePackageId +
        ' ok=' + result.ok + ' sections=' + result.stats.sections + ' calls=' + result.stats.modelCalls +
        ' repaired=' + result.stats.repaired + ' fellBack=' + result.stats.fellBack +
        ' review=' + result.stats.reviewRan + ' codes=' + [...new Set(result.stats.codes)].join(','),
    )

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    // Server-derived fields go through the server writer (migration 050).
    // document_snapshot freezes what was delivered (migration 034).
    const { row: saved, error: saveError } = await updatePackageServerFields<{ id: string }>({
      packageId: generatePackageId,
      userId: user.id,
      fields: {
        optimized_content: result.optimizedContent,
        skills_order: result.skillsOrder,
        field_visibility_snapshot: profile.field_visibility,
        document_snapshot: result.documentSnapshot,
        match_report: result.report,
        ...(result.report?.target.structured ? { structured_job: result.report.target.structured } : {}),
      },
    })

    if (saveError || !saved) {
      console.error('optimize: package update failed user=' + user.id + ' package=' + generatePackageId, saveError ?? 'no row')
      return NextResponse.json({ error: 'Could not save your optimized resume. Please try again.' }, { status: 500 })
    }

    await appendPackageEventAtomic({
      packageId: saved.id,
      userId: user.id,
      type: 'cv_generated',
      label: 'Optimized CV generated',
      meta: result.report?.after ? { match_before: result.report.before.total, match_after: result.report.after.total } : undefined,
    }).catch((e) =>
      console.error('optimize: history event not recorded pkg=' + saved.id, e instanceof Error ? e.message : String(e)),
    )

    // Usage logging happens inside generate() (TASK-039).
    generatedAndSaved = true
    return NextResponse.json({
      success: true,
      packageId: saved.id,
      match: result.report?.after ? { before: result.report.before.total, after: result.report.after.total } : null,
    })
  } finally {
    await reservation.finish(generatedAndSaved)
  }
}
