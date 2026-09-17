import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { LIMIT_ACTION_JOB_DESCRIPTION } from '@/lib/rateLimit'
import { loadCareerProfileFull, ProfileLoadError } from '@/lib/packages/profileLoader'
import { updatePackageServerFields } from '@/lib/packages/serverWrites'
import { analysisNeedsModel, resolveAnalysis } from '@/lib/optimizer/resolveAnalysis'
import { reportForSavedDocument } from '@/lib/optimizer/savedReport'
import { factSummary } from '@/lib/optimizer/factSummary'
import { provenSummaryTerms } from '@/lib/optimizer/pipeline'
import { buildEvidenceMap } from '@/lib/optimizer/evidence'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import type { OptimizationLevel, OptimizedContent } from '@/types/package'

/**
 * POST /api/packages/[id]/ats-score (2026-09-17) — complete the results of a CV
 * that was saved without them.
 *
 * A build whose job analysis failed saved the CV with no ATS score, and, when
 * the profile had no summary of its own, with no summary (founder report). This
 * runs the analysis in its own request (cached when it already exists: no model
 * call), scores the SAVED CV before/after, and fills an empty summary with a
 * fact-only one written in code. Nothing else in the CV changes.
 */

export const maxDuration = 300

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const giveUpAt = Date.now() + 270_000
  const { id: packageId } = await props.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!/^[0-9a-f-]{36}$/i.test(packageId)) return NextResponse.json({ error: 'Invalid package id' }, { status: 400 })

  const { data: pkg, error: pkgErr } = await supabase
    .from('packages')
    .select('id, profile_id, target_job_title, target_industry, job_description, optimization_level, optimized_content, document_snapshot, skills_order, field_visibility_snapshot')
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (pkgErr) {
    console.error('ats-score: package lookup failed user=' + user.id, pkgErr.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkg) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  const oc = pkg.optimized_content as OptimizedContent | null
  if (!oc) return NextResponse.json({ error: 'Optimize this CV first.' }, { status: 409 })

  let profile
  try {
    profile = await loadCareerProfileFull(supabase, pkg.profile_id as string, user.id)
  } catch (e) {
    if (e instanceof ProfileLoadError) {
      return NextResponse.json({ error: 'We could not read your full Career Profile just now. Please try again.' }, { status: 503 })
    }
    throw e
  }
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const input = {
    userId: user.id,
    profile,
    targetJobTitle: pkg.target_job_title as string,
    targetIndustry: (pkg.target_industry as string | null) ?? null,
    jobDescription: (pkg.job_description as string | null) ?? null,
  }
  const needsModel = await analysisNeedsModel(input)
  const reservation = needsModel
    ? await reserveAiAction({ userId: user.id, action: LIMIT_ACTION_JOB_DESCRIPTION, phone: profile.phone, email: profile.email, ttlSeconds: 300 })
    : null
  if (reservation && !reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }
  let resolved = null
  try {
    resolved = await resolveAnalysis({ ...input, generateFn: generate, route: '/api/packages/[id]/ats-score', giveUpAt })
  } catch (e) {
    console.error('ats-score: analysis failed user=' + user.id, e instanceof Error ? e.message : String(e))
  } finally {
    if (reservation && reservation.ok) await reservation.finish(resolved !== null)
  }
  if (!resolved) {
    return NextResponse.json(
      { error: "The AI service didn't finish reading this job in time. Nothing was changed — please try again." },
      { status: 502 },
    )
  }

  const snapshot = pkg.document_snapshot
  const document: ResumeDocument =
    isRecord(snapshot) && isRecord(snapshot.header)
      ? (snapshot as unknown as ResumeDocument)
      : buildResumeDocument({
          profile,
          optimizedContent: oc,
          skillsOrder: (pkg.skills_order as string[] | null) ?? [],
          fieldVisibility: (pkg.field_visibility_snapshot as Record<string, boolean> | null) ?? null,
          targetJobTitle: pkg.target_job_title as string,
        })

  // Fill an empty summary with facts from the profile. A summary the user
  // wrote or the AI produced is never replaced.
  let nextOc: OptimizedContent = oc
  let nextDoc: ResumeDocument = document
  if (!(document.summary ?? '').trim()) {
    const evidence = buildEvidenceMap(profile, resolved.targetProfile, resolved.bridges)
    const factual = factSummary(profile, (pkg.skills_order as string[] | null) ?? [], provenSummaryTerms(evidence, resolved.targetProfile))
    if (factual) {
      nextDoc = { ...document, summary: factual }
      nextOc = { ...oc, summary: { ...oc.summary, generated: factual } }
    }
  }

  const report = reportForSavedDocument({
    profile,
    target: resolved.targetProfile,
    bridges: resolved.bridges,
    analysisId: resolved.analysisId,
    targetJobTitle: pkg.target_job_title as string,
    level: pkg.optimization_level as OptimizationLevel,
    document: nextDoc,
  })

  const { row, error: saveErr } = await updatePackageServerFields({
    packageId,
    userId: user.id,
    fields: {
      match_report: report,
      optimized_content: nextOc,
      document_snapshot: nextDoc,
      ...(report.target.structured ? { structured_job: report.target.structured } : {}),
    },
  })
  if (saveErr || !row) {
    console.error('ats-score: save failed user=' + user.id + ' pkg=' + packageId, saveErr ?? 'no row')
    return NextResponse.json({ error: 'Could not save the ATS score. Please try again.' }, { status: 500 })
  }
  console.log('ats-score: user=' + user.id + ' pkg=' + packageId + ' before=' + report.before.total + ' after=' + report.after?.total)
  return NextResponse.json({ ok: true, match_report: report, document_snapshot: nextDoc })
}
