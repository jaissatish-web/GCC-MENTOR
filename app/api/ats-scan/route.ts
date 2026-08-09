import { NextRequest, NextResponse } from 'next/server'
import { generate } from '@/lib/ai/provider'
import { extractJsonObject } from '@/lib/ai/extractionPrompt'
import {
  ATS_SCORE_SYSTEM_PROMPT,
  buildAtsScoreUserPrompt,
  validateAtsScoreResult,
} from '@/lib/ai/atsScorePrompt'
import {
  getAnonymousRateLimitStatus,
  incrementAnonymousRateLimit,
  getClientIdentityHash,
  LIMIT_ACTION_ANON_ATS_SCAN,
} from '@/lib/anonymousRateLimit'

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
 * Never writes anything to the database — this is a stateless scan. No
 * ats_reports-style table exists for anonymous callers; storing an
 * anonymous stranger's resume text with no account and no consent flow
 * would be a bigger PII footprint than this tool needs (CTO judgment
 * call — flag if a "your last scan" feature is ever wanted, that needs its
 * own design, not a silent side effect of this route).
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

    try {
      if (fileExt === 'pdf') {
        const pdfParse = (await import('pdf-parse')).default
        const pdfData = await pdfParse(buffer)
        resumeText = pdfData.text
      } else {
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ buffer })
        resumeText = result.value
      }
    } catch {
      return NextResponse.json({ error: 'Could not read file. Try copy-paste instead.' }, { status: 422 })
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

  try {
    const result = await generate({
      system: ATS_SCORE_SYSTEM_PROMPT,
      user: buildAtsScoreUserPrompt(resumeText, jobDescription),
      maxTokens: 2048,
      temperature: 0.2,
      route: '/api/ats-scan',
      // No userId — anonymous route, ai_usage_log records user_id = NULL
      // (migration 024).
    })
    const parsed = extractJsonObject(result.text)
    const score = validateAtsScoreResult(parsed)
    if (!score) {
      return NextResponse.json({ error: 'Could not analyze this resume. Please try again.' }, { status: 422 })
    }

    // A successful scan consumes a rate-limit slot.
    await incrementAnonymousRateLimit({ identityHash, action: LIMIT_ACTION_ANON_ATS_SCAN })

    return NextResponse.json({ success: true, score })
  } catch (e) {
    console.error('ats-scan: AI call failed', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not analyze this resume. Please try again.' }, { status: 502 })
  }
}
