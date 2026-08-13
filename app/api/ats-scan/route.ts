import { NextRequest, NextResponse } from 'next/server'
import { generate } from '@/lib/ai/provider'
import { EXTRACTION_SYSTEM_PROMPT, normalizeDraft, extractJsonObject } from '@/lib/ai/extractionPrompt'
import {
  buildAtsScoreSystemPrompt,
  buildAtsScoreUserPrompt,
  validateAtsScoreResult,
} from '@/lib/ai/atsScorePrompt'
import type { AtsScoreResult } from '@/lib/ai/atsScorePrompt'
import {
  buildJobDescriptionUserPrompt,
  JOB_DESCRIPTION_SYSTEM_PROMPT,
  validateStructuredJobProfile,
} from '@/lib/ai/jobDescriptionPrompt'
import {
  buildJobMatchExplanationSystemPrompt,
  buildJobMatchExplanationUserPrompt,
  validateJobMatchExplanation,
} from '@/lib/ai/jobMatchExplanation'
import {
  computeDeterministicCategories,
  combineJobMatchScore,
} from '@/lib/jobMatch/requirementMapping'
import { buildJobMatchProfileInputFromDraft } from '@/lib/jobMatch/profileAdapters'
import {
  DETERMINISTIC_CATEGORIES,
  SEMANTIC_CATEGORIES,
  JOB_MATCH_SCORING_VERSION,
} from '@/types/jobMatch'
import type { JobMatchCategoryKey, JobMatchCategoryResult, JobMatchResult } from '@/types/jobMatch'
import { getPromptTemplate } from '@/lib/ai/promptTemplates'
import {
  getAnonymousRateLimitStatus,
  incrementAnonymousRateLimit,
  getClientIdentityHash,
  LIMIT_ACTION_ANON_ATS_SCAN,
} from '@/lib/anonymousRateLimit'
import { SESSION_COOKIE_NAME, upsertAnonymousSession } from '@/lib/anonymousSession'
import { extractPdfText } from '@/lib/pdfTextExtract'
import type { CareerProfileDraft } from '@/types/careerProfile'

/**
 * Free ATS/Gulf-readiness scanner (TASK-049). Public, NO LOGIN REQUIRED —
 * this is the one deliberate exception to "every route starts with an auth
 * check" (docs/RULES.md §6): the anonymous rate limiter (TASK-048) is the
 * substitute cost/abuse control here, not a session.
 *
 * Accepts multipart/form-data with EITHER `file` (PDF/DOCX, same limits as
 * /api/parse/upload) OR `resume_text` (pasted text, same 20,000-char cap as
 * /api/parse/text) — plus an optional `job_description`. One endpoint, not
 * a file/text split like the authenticated parse routes, since the
 * frontend only needs one upload surface for this tool.
 *
 * TASK-069 update: this is no longer fully stateless. Alongside the score,
 * this route now also runs extraction (same pipeline /api/parse/text uses)
 * and persists both into a short-lived anonymous_analysis_session (migration
 * 028) so a "claim on signup" flow (app/api/anonymous-session/claim/route.ts)
 * can pre-fill the Career Profile and re-show this exact result without
 * asking the person to re-upload — the exact feature TASK-049's original
 * comment here flagged as needing its own design before being built. See
 * that migration's header for the retention/deletion reasoning. The
 * response contract for the score itself is UNCHANGED — a caller that
 * ignores the new cookie sees identical behavior to before.
 *
 * TASK-071 update: when a job description IS given, the response also
 * carries a new `jobMatch` field (docs/GCC_READINESS_JOB_MATCH.md §10-13) —
 * the founder's structured pipeline (JD → StructuredJobProfile →
 * deterministic requirement/evidence mapping → LLM semantic scoring +
 * explanation), NOT the old shallow keyword-match `score.job_match` field
 * atsScorePrompt.ts still produces. That field is left in place (not worth
 * touching a grounding-adjacent, already-approved file for this) but is no
 * longer the authoritative job-match signal — `jobMatch` is. Extraction
 * moved earlier in this route (used to run only for session persistence)
 * because the Job Match engine needs the extracted profile as its candidate
 * side; it is still entirely best-effort — a failure here degrades to
 * `jobMatch: null`, never breaks the score response the caller already paid
 * a rate-limit slot for.
 */

const MAX_FILE_SIZE_PDF = 5 * 1024 * 1024   // 5MB, matches /api/parse/upload
const MAX_FILE_SIZE_DOCX = 2 * 1024 * 1024  // 2MB, matches /api/parse/upload
const MAX_TEXT_LENGTH = 20000               // matches /api/parse/text
const MAX_JD_LENGTH = 8000

export async function POST(request: NextRequest): Promise<NextResponse> {
  const identityHash = getClientIdentityHash(request)

  // Rate limit BEFORE any parsing or the model call — server-side, never
  // client-side, same discipline as every other AI route in this product.
  const limit = await getAnonymousRateLimitStatus({
    identityHash,
    action: LIMIT_ACTION_ANON_ATS_SCAN,
  })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.message ?? 'Daily limit reached' },
      { status: 429 },
    )
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const rawText = formData.get('resume_text')
  const rawJd = formData.get('job_description')
  const jobDescription = typeof rawJd === 'string' && rawJd.trim() ? rawJd.trim().slice(0, MAX_JD_LENGTH) : null

  let resumeText = ''

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileExt = file.name.toLowerCase().split('.').pop()

    if (!['pdf', 'docx', 'doc'].includes(fileExt || '')) {
      return NextResponse.json({ error: 'Only PDF and Word files are supported' }, { status: 400 })
    }
    if (fileExt === 'pdf' && buffer.length > MAX_FILE_SIZE_PDF) {
      return NextResponse.json({ error: 'PDF file must be under 5MB' }, { status: 400 })
    }
    if (['docx', 'doc'].includes(fileExt || '') && buffer.length > MAX_FILE_SIZE_DOCX) {
      return NextResponse.json({ error: 'Word file must be under 2MB' }, { status: 400 })
    }

    // PDF header validation — reject non-PDF files early
    if (fileExt === 'pdf') {
      const header = buffer.slice(0, 5).toString()
      if (header !== '%PDF-') {
        return NextResponse.json({ error: 'This file does not appear to be a valid PDF.' }, { status: 400 })
      }
    }

    try {
          if (fileExt === 'pdf') {
                      const result = extractPdfText(buffer, true) // debug mode
                      resumeText = result.text
                      if (!resumeText || resumeText.trim().length < 50) {
                        return NextResponse.json({
                          error: 'We could not read this file. Please upload a valid text-based PDF or Word file, or copy and paste your resume text.',
                          code: 'PDF_NO_TEXT',
                          extracted: resumeText ? resumeText.length : 0,
                          debug: { filter: result.filter, streams: result.streamCount, errors: result.errorCount },
                        }, { status: 400 })
                      }
          } else {
            const mammoth = await import('mammoth')
            const parsed = await mammoth.extractRawText({ buffer })
            resumeText = parsed.value
            if (!resumeText || resumeText.trim().length < 50) {
              return NextResponse.json({
                error: 'We could not read this file. Please upload a valid text-based PDF or Word file, or copy and paste your resume text.',
                code: 'WORD_NO_TEXT',
              }, { status: 400 })
            }
          }
        } catch (e) {
          console.error(
            'ATS_SCAN_PARSE_FAILED',
            'filename=' + file.name,
            'size=' + buffer.length,
            'ext=' + fileExt,
            'error=' + (e instanceof Error ? e.message : String(e)),
            'stack=' + (e instanceof Error ? (e.stack ?? '').split('\\n').slice(0, 3).join(' | '): ''),
          )
          return NextResponse.json({
            error: 'We could not read this file. Please upload a valid text-based PDF or Word file, or copy and paste your resume text.',
            code: 'PARSE_EXCEPTION',
            detail: e instanceof Error ? e.message : String(e),
          }, { status: 422 })
        }

        // Move the length check outside the try block
        // (already handled per-format above, but belt-and-suspenders)
        if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: 'We could not read this file. Please upload a valid text-based PDF or Word file, or copy and paste your resume text.' }, { status: 400 })
    }
  } else if (typeof rawText === 'string') {
    resumeText = rawText
  }

  resumeText = resumeText.trim()
  if (resumeText.length < 50) {
    return NextResponse.json({ error: 'Resume text too short (minimum 50 characters)' }, { status: 400 })
  }
  if (resumeText.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: 'Resume text too long (maximum 20000 characters)' }, { status: 400 })
  }

  let score: AtsScoreResult
  try {
    // Admin-editable intro/tone only (lib/ai/promptTemplates.ts) — the
    // grounding constraint and output schema are always the fixed default
    // inside buildAtsScoreSystemPrompt, never overridable from here.
    const customIntro = await getPromptTemplate('ats_scan_intro')
    const result = await generate({
      system: buildAtsScoreSystemPrompt(customIntro),
      user: buildAtsScoreUserPrompt(resumeText, jobDescription),
      maxTokens: 2048,
      temperature: 0.2,
      route: '/api/ats-scan',
      configKey: 'ats_scan',
      // No userId — anonymous route, ai_usage_log records user_id = NULL
      // (migration 024).
    })
    const parsed = extractJsonObject(result.text)
    const validated = validateAtsScoreResult(parsed)
    if (!validated) {
      return NextResponse.json({ error: 'Could not analyze this resume. Please try again.' }, { status: 422 })
    }
    score = validated
  } catch (e) {
    console.error('ats-scan: AI call failed', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not analyze this resume. Please try again.' }, { status: 502 })
  }

  // A successful scan consumes a rate-limit slot regardless of what happens
  // below — the score itself already succeeded and is what the caller paid
  // a rate-limit slot for.
  await incrementAnonymousRateLimit({ identityHash, action: LIMIT_ACTION_ANON_ATS_SCAN })

  // Extraction, the Job Match engine, and session persistence are ALL
  // best-effort ON TOP OF the score — never let a failure below turn a
  // successful scan into an error response. A visitor who never signs up
  // loses nothing; one who does loses only the "don't re-upload"
  // convenience or the Job Match breakdown, not the score they already got.
  let draft: CareerProfileDraft | null = null
  try {
    const extractResult = await generate({
      system: EXTRACTION_SYSTEM_PROMPT,
      user: `Extract from this resume text:\n\n${resumeText}`,
      maxTokens: 8192,
      temperature: 0.1,
      route: '/api/ats-scan',
      configKey: 'extraction',
      // No userId — same anonymous call as the score above.
    })
    draft = normalizeDraft(extractJsonObject(extractResult.text))
  } catch (e) {
    console.error('ats-scan: extraction failed (non-fatal)', e instanceof Error ? e.message : String(e))
  }

  // Job Match engine (TASK-071) — only runs when both a JD and a usable
  // draft exist. Its own internal failures are caught per-stage below so a
  // partial result (deterministic categories with no LLM explanations yet)
  // is still better than nothing, though in practice a hard failure in
  // either AI call just yields jobMatch: null.
  let jobMatch: JobMatchResult | null = null
  if (draft && jobDescription) {
    try {
      const jdResult = await generate({
        system: JOB_DESCRIPTION_SYSTEM_PROMPT,
        user: buildJobDescriptionUserPrompt(jobDescription),
        maxTokens: 1536,
        temperature: 0.1,
        route: '/api/ats-scan',
        configKey: 'job_description',
      })
      const structuredJob = validateStructuredJobProfile(extractJsonObject(jdResult.text))

      if (structuredJob) {
        const profileInput = buildJobMatchProfileInputFromDraft(draft)
        const deterministic = computeDeterministicCategories(profileInput, structuredJob)

        const explanationResult = await generate({
          system: buildJobMatchExplanationSystemPrompt(),
          user: buildJobMatchExplanationUserPrompt({
            resumeText,
            professionalSummary: profileInput.professionalSummary,
            job: structuredJob,
            jobDescriptionText: jobDescription,
            deterministicCategories: deterministic,
          }),
          maxTokens: 2048,
          temperature: 0.3,
          route: '/api/ats-scan',
          configKey: 'job_match_explanation',
        })
        const explanation = validateJobMatchExplanation(extractJsonObject(explanationResult.text))

        if (explanation) {
          const categories = {} as Record<JobMatchCategoryKey, JobMatchCategoryResult>
          for (const key of DETERMINISTIC_CATEGORIES) {
            const c = deterministic[key]
            if (c) categories[key] = { ...c, explanation: explanation.deterministicExplanations[key] ?? '' }
          }
          for (const key of SEMANTIC_CATEGORIES) {
            const s = explanation.semanticScores[key]
            categories[key] = { score: s.score, applicable: true, evidence: [], explanation: s.explanation }
          }
          jobMatch = {
            overall_score: combineJobMatchScore(categories),
            categories,
            diagnosis: explanation.diagnosis,
            scoring_version: JOB_MATCH_SCORING_VERSION,
          }
        }
      }
    } catch (e) {
      console.error('ats-scan: job match engine failed (non-fatal)', e instanceof Error ? e.message : String(e))
    }
  }

  let sessionToken: string | null = null
  if (draft) {
    try {
      const existingToken = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? null
      sessionToken = await upsertAnonymousSession({
        existingToken,
        identityHash,
        data: {
          resumeText,
          extractedProfile: draft,
          jobDescription,
          atsScoreResult: score,
          jobMatchResult: jobMatch,
        },
      })
    } catch (e) {
      console.error('ats-scan: session persistence failed (non-fatal)', e instanceof Error ? e.message : String(e))
    }
  }

  const response = NextResponse.json({ success: true, score, jobMatch })
  if (sessionToken) {
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days — matches ANONYMOUS_SESSION_TTL_DAYS's default; cookie lifetime is a UX ceiling, the DB row's own expires_at is the real enforcement
    })
  }
  return response
}
