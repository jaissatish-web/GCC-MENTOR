import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { buildCoverLetterPrompt } from '@/lib/ai/buildCoverLetterPrompt'
import type { CoverLetterTarget } from '@/lib/ai/buildCoverLetterPrompt'
import { validateCoverLetterGrounding, type ParsedCoverLetter } from '@/lib/ai/validateCoverLetterGrounding'
import type { CoverLetterValidationFailure } from '@/lib/ai/validateCoverLetterGrounding'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
import {
  checkProseClaims,
  gapTermsFromMatchReport,
  profileEvidenceText,
  removeClaimSentences,
  totalExperienceYears,
  type ProseClaimIssue,
} from '@/lib/ai/proseClaims'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { LIMIT_ACTION_COVER_LETTER } from '@/lib/rateLimit'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { loadCareerProfileFull, ProfileLoadError } from '@/lib/packages/profileLoader'
import { appendCoverLetterAtomic } from '@/lib/packages/serverWrites'
// Credit helpers are deliberately not imported while the locks are off — the
// route neither checks nor consumes a credit. They come back with the lock.
import type { CoverLetter, CoverLetterTone, OptimizedContent } from '@/types/package'

const COVER_LETTER_TONES: CoverLetterTone[] = ['professional', 'short', 'technical', 'explanatory']

/**
 * Cover letter generation route (TASK-065).
 *
 * POST /api/packages/[id]/cover-letter   body: { tone? }. Target and job
 * description are read from the package itself. Tone (2026-08-18) is a STYLE
 * choice, not new data; an absent or unknown value falls back to 'professional'
 * so an old client's empty body keeps working.
 *
 * 2026-09-15 remediation:
 *   - SOURCE (audit M04): the package's SAVED CV — the document the employer
 *     reads with this letter — is the primary source; the Career Profile
 *     supplements it. A job with no built CV yet still gets a letter from the
 *     profile, as before. A failed profile read is an error, never an empty
 *     profile.
 *   - QUOTA + PAUSE (H03): reserved before the model call, consumed once the
 *     letter is saved, released on any failure.
 *   - DEADLINE (H09): every model call, the provider's retries and the
 *     corrective retry share one give-up point 20s inside `maxDuration`. The
 *     route used to cap itself at 60s while the provider could wait 280s.
 *   - SAVE (H04): appended in one statement; two letters finishing together
 *     both survive.
 *
 * Repeatable per package — each successful generation appends a letter.
 * PAYMENT: none while the locks are off (founder decision 2026-08-17). When the
 * lock returns, the credit consume goes AFTER a validated, saved letter.
 */

export const maxDuration = 120
const DEADLINE_MS = 100_000
/** A corrective second letter is only started with at least this much time left. */
const MIN_RETRY_MS = 35_000

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function buildCorrectiveAddendum(failures: CoverLetterValidationFailure[]): string {
  // Grading words are 'flag' severity but still worth asking the model to fix.
  const hard = failures.filter((f) => f.severity === 'hard' || f.code === 'unsupported_claim')
  const lines = hard.map(
    (f) => `- ${f.path}: ${f.detail}` + (f.offendingValue ? ` (found: "${f.offendingValue}")` : ''),
  )
  return (
    '\n\n## CORRECTION REQUIRED\n' +
    'Your previous response violated the grounding rule or schema in these ways:\n' +
    lines.join('\n') +
    '\n\nRegenerate the FULL letter from scratch, fixing every issue above. ' +
    'Return ONLY the corrected JSON, matching the exact schema.'
  )
}

function letterProse(parsed: Record<string, unknown>): string[] {
  const body = Array.isArray(parsed.body_paragraphs)
    ? (parsed.body_paragraphs as unknown[]).filter((p): p is string => typeof p === 'string')
    : []
  return [parsed.opening_paragraph, ...body, parsed.closing_paragraph].filter((p): p is string => typeof p === 'string')
}

function claimFailures(issues: ProseClaimIssue[]): CoverLetterValidationFailure[] {
  return issues.map((i) => ({
    code: 'unsupported_claim' as const,
    severity: i.severity === 'hard' ? ('hard' as const) : ('flag' as const),
    path: 'output',
    detail: i.detail,
    offendingValue: i.offendingValue,
  }))
}

const SAFE_CLOSING =
  'Thank you for considering my application. I would welcome the opportunity to discuss the role and how my experience can support your team.'

function composeFullText(letter: ParsedCoverLetter): string {
  return [letter.greeting, letter.opening_paragraph, ...letter.body_paragraphs, letter.closing_paragraph, letter.sign_off].join(
    '\n\n',
  )
}

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const startedAt = Date.now()
  const params = await props.params
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

  const rawBody = await request.json().catch(() => null)
  const requestedTone = isObject(rawBody) ? rawBody.tone : undefined
  const tone: CoverLetterTone =
    typeof requestedTone === 'string' && COVER_LETTER_TONES.includes(requestedTone as CoverLetterTone)
      ? (requestedTone as CoverLetterTone)
      : 'professional'

  // Owner-scoped in one query — a foreign package id matches no row and 404s.
  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select(
      'id, profile_id, target_job_title, target_industry, target_country, target_company, job_description, optimized_content, document_snapshot, skills_order, field_visibility_snapshot, match_report',
    )
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (pkgError) {
    console.error('cover-letter: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) {
    return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  }

  let profile
  try {
    profile = await loadCareerProfileFull(supabase, pkgRow.profile_id as string, user.id)
  } catch (e) {
    if (e instanceof ProfileLoadError) {
      console.error('cover-letter: incomplete profile read user=' + user.id + ' table=' + e.table)
      return NextResponse.json(
        { error: 'We could not read your full Career Profile just now. Nothing was used — please try again.' },
        { status: 503 },
      )
    }
    throw e
  }
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
  }

  // The saved CV for THIS job, exactly as the user sees and downloads it.
  const optimizedContent = pkgRow.optimized_content as OptimizedContent | null
  const snapshot = pkgRow.document_snapshot
  const savedResume: ResumeDocument | null = optimizedContent
    ? isObject(snapshot) && isObject(snapshot.header)
      ? (snapshot as unknown as ResumeDocument)
      : buildResumeDocument({
          profile,
          optimizedContent,
          skillsOrder: (pkgRow.skills_order as string[] | null) ?? [],
          fieldVisibility: (pkgRow.field_visibility_snapshot as Record<string, boolean> | null) ?? null,
          // The application's title, so this document's headline matches the CV.
          targetJobTitle: (pkgRow.target_job_title as string | null) ?? null,
        })
    : null

  const target: CoverLetterTarget = {
    target_job_title: pkgRow.target_job_title as string,
    target_industry: pkgRow.target_industry as string | null,
    target_country: pkgRow.target_country as CoverLetterTarget['target_country'],
    target_company: pkgRow.target_company as string | null,
  }

  const reservation = await reserveAiAction({
    userId: user.id,
    action: LIMIT_ACTION_COVER_LETTER,
    phone: profile.phone,
    email: profile.email,
    ttlSeconds: 150,
  })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  let succeeded = false
  try {
    const claimCtx = {
      evidence: profileEvidenceText(profile),
      gaps: gapTermsFromMatchReport(pkgRow.match_report),
      totalYears: totalExperienceYears(profile),
    }
    const { system, user: userPrompt } = buildCoverLetterPrompt(
      profile,
      target,
      pkgRow.job_description as string | null,
      tone,
      savedResume,
      { totalYears: claimCtx.totalYears, gaps: claimCtx.gaps.filter((g) => g.kind !== 'soft_skill').map((g) => g.term) },
    )
    const giveUpAt = startedAt + DEADLINE_MS
    const groundedProfile = profile

    const runOnce = async (userMessage: string) => {
      const result = await generate({
        system,
        user: userMessage,
        maxTokens: 2048,
        temperature: 0.4,
        userId: user.id,
        route: '/api/packages/[id]/cover-letter',
        configKey: 'cover_letter',
        deadlineAt: giveUpAt,
        giveUpAt,
      })
      const parsed = extractJsonObject(result.text)
      const validation = validateCoverLetterGrounding(groundedProfile, parsed)
      if (!validation.failures.some((f) => f.severity === 'hard') && isObject(parsed)) {
        const issues = checkProseClaims({ ...claimCtx, text: letterProse(parsed).join('\n\n') })
        if (issues.length > 0) {
          validation.failures.push(...claimFailures(issues))
          validation.valid = !validation.failures.some((f) => f.severity === 'hard')
        }
      }
      return { parsed, validation }
    }

    let attempt: Awaited<ReturnType<typeof runOnce>>
    try {
      attempt = await runOnce(userPrompt)
      if (!attempt.validation.valid && giveUpAt - Date.now() >= MIN_RETRY_MS) {
        attempt = await runOnce(userPrompt + buildCorrectiveAddendum(attempt.validation.failures))
      }
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e)
      console.error('cover-letter: AI call failed user=' + user.id + ' pkg=' + packageId, reason)
      return NextResponse.json(
        {
          error: /stall|out of time|deadline/i.test(reason)
            ? "The AI service didn't answer in time. Nothing was used — please try again."
            : 'Could not generate your cover letter. Nothing was used — please try again.',
        },
        { status: 502 },
      )
    }

    // After the corrective retry, a letter whose ONLY hard problems are claims
    // is repaired by dropping those sentences rather than failed: the user has
    // already waited for two generations, and every remaining sentence passed.
    if (
      !attempt.validation.valid &&
      isObject(attempt.parsed) &&
      attempt.validation.failures.filter((f) => f.severity === 'hard').every((f) => f.code === 'unsupported_claim')
    ) {
      const p = attempt.parsed as Record<string, unknown>
      const clean = (t: unknown) => (typeof t === 'string' ? removeClaimSentences(t, claimCtx) : '')
      const body = (Array.isArray(p.body_paragraphs) ? (p.body_paragraphs as unknown[]) : []).map(clean).filter((t) => t.trim())
      let opening = clean(p.opening_paragraph)
      if (!opening.trim() && body.length > 1) opening = body.shift() as string
      const closing = clean(p.closing_paragraph).trim() || SAFE_CLOSING
      if (opening.trim() && body.length > 0) {
        const repaired = { ...p, opening_paragraph: opening, body_paragraphs: body, closing_paragraph: closing }
        const recheck = validateCoverLetterGrounding(groundedProfile, repaired)
        const left = checkProseClaims({ ...claimCtx, text: letterProse(repaired).join('\n\n') })
        if (recheck.valid && !left.some((i) => i.severity === 'hard')) {
          console.info(`cover-letter: removed unsupported claims pkg=${packageId}`)
          attempt = { parsed: repaired, validation: recheck }
        }
      }
    }

    if (!attempt.validation.valid) {
      const reasons = attempt.validation.failures
        .filter((f) => f.severity === 'hard')
        .map((f) => `${f.code}@${f.path}`)
        .join(',')
      console.error('cover-letter: validation failed user=' + user.id + ' pkg=' + packageId + ' reasons=' + reasons)
      return NextResponse.json(
        { error: 'Could not produce a grounded letter. Nothing was used — please try again.' },
        { status: 502 },
      )
    }

    const parsedLetter = attempt.parsed as unknown as ParsedCoverLetter
    const letter: CoverLetter = {
      id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      target_job_title: pkgRow.target_job_title as string,
      target_company: pkgRow.target_company as string | null,
      tone,
      greeting: parsedLetter.greeting,
      opening_paragraph: parsedLetter.opening_paragraph,
      body_paragraphs: parsedLetter.body_paragraphs,
      closing_paragraph: parsedLetter.closing_paragraph,
      sign_off: parsedLetter.sign_off,
      full_text: composeFullText(parsedLetter),
    }

    let saved: boolean
    try {
      saved = await appendCoverLetterAtomic({
        packageId,
        userId: user.id,
        letter,
        meta: { tone, source: savedResume ? 'saved_cv' : 'career_profile' },
      })
    } catch (e) {
      console.error('cover-letter: save FAILED user=' + user.id + ' pkg=' + packageId, e instanceof Error ? e.message : String(e))
      return NextResponse.json({ error: 'Your letter was generated but could not be saved. Please try again.' }, { status: 500 })
    }
    if (!saved) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }

    succeeded = true
    console.info(`cover letter generated: pkg=${packageId} user=${user.id} letter=${letter.id}`)
    return NextResponse.json({ success: true, letter })
  } finally {
    await reservation.finish(succeeded)
  }
}
