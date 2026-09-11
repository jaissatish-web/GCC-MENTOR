import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { EXTRACTION_MAX_TOKENS, EXTRACTION_SYSTEM_PROMPT, normalizeDraft, extractJsonObject } from '@/lib/ai/extractionPrompt'
import { getRateLimitStatus, incrementRateLimit, LIMIT_ACTION_EXTRACTION } from '@/lib/rateLimit'
import { getRecreationStatus, recordRecreation } from '@/lib/recreateLimit'
import { savePendingDraft } from '@/lib/pendingDraft'
import { extractPdfText } from '@/lib/pdfTextExtract'
import type { CareerProfileDraft } from '@/types/careerProfile'

// File-size limits kept verbatim from reference/parse-upload.reference.ts.
const MAX_FILE_SIZE_PDF = 5 * 1024 * 1024   // 5MB
const MAX_FILE_SIZE_DOCX = 2 * 1024 * 1024  // 2MB

// NO `maxDuration` HERE, deliberately (2026-09-11). One was added — 60, "like
// every other model route" — and it broke recreate-by-upload in production:
// the platform default this route had always run on is longer, and a CV that
// makes the model think long needs it. Reproduced live: a six-job CV read in
// 60.6s, on the edge; the founder's longer think was killed at 60s and Vercel's
// timeout page reached the panel instead of JSON. Before the cap, a 7,847-token
// read (~100s at production speed) completed and was logged. Do not re-add a
// cap below the platform default without measuring a long read first.

/**
 * What the user sees when the READ fails (2026-09-11). It used to say "Try
 * copy-paste instead" — wrong advice for the real cause, a model answer cut
 * off at its token budget, because pasting the same CV hits the same ceiling.
 * Both halves of the sentence are true: nothing is written until a draft is
 * returned, and only a success counts against either limit.
 */
const READ_FAILED =
  "We couldn't finish reading your CV this time. Nothing was changed, and it didn't count against your limit — please try again."

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileName = file.name.toLowerCase()
  const fileExt = fileName.split('.').pop()

  if (!['pdf', 'docx', 'doc'].includes(fileExt || '')) {
    return NextResponse.json({ error: 'Only PDF and Word files are supported' }, { status: 400 })
  }
  if (fileExt === 'pdf' && buffer.length > MAX_FILE_SIZE_PDF) {
    return NextResponse.json({ error: 'PDF file must be under 5MB' }, { status: 400 })
  }
  if (['docx', 'doc'].includes(fileExt || '') && buffer.length > MAX_FILE_SIZE_DOCX) {
    return NextResponse.json({ error: 'Word file must be under 2MB' }, { status: 400 })
  }

  let extractedText = ''
  try {
    if (fileExt === 'pdf') {
      // Same guard as /api/ats-scan: unreadable is not the same as
      // empty, and only the explicit check separates them.
      const pdf = await extractPdfText(buffer)
      if (pdf.looksGarbled) {
        return NextResponse.json(
          {
            error:
              'We could not read the text in this PDF reliably. Please upload a different export (Save as PDF from Word or Google Docs works well), or paste your resume text instead.',
            code: 'PDF_UNREADABLE',
          },
          { status: 400 },
        )
      }
      extractedText = pdf.text
    } else if (fileExt === 'docx' || fileExt === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    }
  } catch {
    // The FILE could not be read — here pasting the text genuinely is the fix.
    return NextResponse.json({ error: 'Could not read file. Try copy-paste instead.' }, { status: 422 })
  }

  if (!extractedText || extractedText.trim().length < 50) {
    return NextResponse.json({ error: 'Could not extract text from file. Try copy-paste instead.' }, { status: 422 })
  }

  // Rate limit BEFORE the model call (server-side, never client-side).
  const limit = await getRateLimitStatus({ userId: user.id, action: LIMIT_ACTION_EXTRACTION })
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.message ?? 'Daily limit reached' },
      { status: 429 },
    )
  }

  // Monthly recreation limit (founder decision 2026-09-11) — only when a saved
  // profile already exists. Checked before the model call, counted after a
  // successful read. See lib/recreateLimit.ts.
  const recreation = await getRecreationStatus(user.id)
  if (!recreation.allowed) {
    return NextResponse.json(
      { error: recreation.message, code: 'RECREATE_LIMIT', recreation },
      { status: 429 },
    )
  }

  let draft: CareerProfileDraft
  try {
    const result = await generate({
      system: EXTRACTION_SYSTEM_PROMPT,
      user: `Extract from this resume text:\n\n${extractedText}`,
      maxTokens: EXTRACTION_MAX_TOKENS,
      temperature: 0.1,
      userId: user.id,
      route: '/api/parse/upload',
      configKey: 'extraction',
    })
    // Cut off at the budget: the JSON is incomplete, so do not try to parse it.
    if (result.truncated) {
      console.error('parse upload: answer cut off at the token budget user=' + user.id + ' out=' + result.outputTokens)
      return NextResponse.json({ error: READ_FAILED, code: 'EXTRACTION_TRUNCATED' }, { status: 502 })
    }
    const parsed = extractJsonObject(result.text)
    const normalized = normalizeDraft(parsed)
    if (!normalized) {
      console.error('parse upload: answer was not a readable profile user=' + user.id + ' out=' + result.outputTokens)
      return NextResponse.json({ error: READ_FAILED }, { status: 422 })
    }
    draft = normalized
  } catch (e) {
    console.error('parse upload: AI call failed user=' + user.id + ' route=/api/parse/upload', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: READ_FAILED }, { status: 502 })
  }

  // A successful extraction consumes a rate-limit slot — and, when a profile
  // already existed, one of this month's recreations. usage logging happens
  // inside generate() (TASK-039) — do not add a second call.
  await incrementRateLimit({ userId: user.id, action: LIMIT_ACTION_EXTRACTION })
  if (recreation.isRecreate) await recordRecreation(user.id)

  // Kept server-side BEFORE answering, so a closed browser cannot lose a paid
  // reading (2026-09-11, migration 047). The profile page reopens it until the
  // user decides. See lib/pendingDraft.ts.
  await savePendingDraft(supabase, user.id, draft, 'upload')

  return NextResponse.json({ success: true, draft })
}
