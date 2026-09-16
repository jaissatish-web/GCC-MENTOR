import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { EXTRACTION_MAX_TOKENS, EXTRACTION_SYSTEM_PROMPT, normalizeDraft, extractJsonObject } from '@/lib/ai/extractionPrompt'
import { LIMIT_ACTION_EXTRACTION } from '@/lib/rateLimit'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { getRecreationStatus, recordRecreation } from '@/lib/recreateLimit'
import { savePendingDraft } from '@/lib/pendingDraft'
import { extractPdfText } from '@/lib/pdfTextExtract'
import type { CareerProfileDraft } from '@/types/careerProfile'

/**
 * UPLOAD LIMITS MATCH THE PLATFORM (audit M12, 2026-09-15).
 *
 * Vercel refuses a function request body over 4.5 MB — including the multipart
 * envelope — before this handler runs, so the old 5 MB PDF limit promised files
 * that could only fail with the platform's own error page. PDFs are now capped
 * at 4 MB (with room for the envelope) and Word files stay at 2 MB. The size is
 * checked from the request headers and the File object BEFORE the bytes are
 * buffered, and the extracted text is capped so a small file that expands into
 * a huge document cannot become a huge model call.
 */
// Not exported: a Next.js route file may export only its handlers and config.
// components/profile/ResumeImport.tsx mirrors these two numbers for the instant
// client-side check.
const MAX_FILE_SIZE_PDF = 4 * 1024 * 1024
const MAX_FILE_SIZE_DOCX = 2 * 1024 * 1024
const MAX_REQUEST_BYTES = MAX_FILE_SIZE_PDF + 256 * 1024
/** About 12 pages of CV text — far above a real CV, well below a runaway prompt. */
const MAX_EXTRACTED_CHARS = 30_000

const TOO_LARGE = 'This file is too large. PDFs can be up to 4MB and Word (.docx) files up to 2MB.'

// NO `maxDuration` HERE, deliberately (2026-09-11). One was added — 60, "like
// every other model route" — and it broke recreate-by-upload in production:
// the platform default this route had always run on is longer, and a CV that
// makes the model think long needs it. Do not re-add a cap below the platform
// default without measuring a long read first.

/**
 * What the user sees when the READ fails (2026-09-11). Both halves of the
 * sentence are true: nothing is written until a draft is returned, and only a
 * success counts against either limit.
 */
const READ_FAILED =
  "We couldn't finish reading your CV this time. Nothing was changed, and it didn't count against your limit — please try again."

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(declared) && declared > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: TOO_LARGE, code: 'TOO_LARGE' }, { status: 413 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'We could not read that upload. Please choose the file again.' }, { status: 400 })
  }
  const file = formData.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const fileExt = file.name.toLowerCase().split('.').pop() ?? ''
  if (fileExt === 'doc') {
    return NextResponse.json(
      { error: "Older .doc files can't be read. Save it as .docx or PDF and upload again, or paste your CV text.", code: 'UNSUPPORTED' },
      { status: 400 },
    )
  }
  if (fileExt !== 'pdf' && fileExt !== 'docx') {
    return NextResponse.json({ error: 'Only PDF and Word (.docx) files are supported.', code: 'UNSUPPORTED' }, { status: 400 })
  }
  if ((fileExt === 'pdf' && file.size > MAX_FILE_SIZE_PDF) || (fileExt === 'docx' && file.size > MAX_FILE_SIZE_DOCX)) {
    return NextResponse.json({ error: TOO_LARGE, code: 'TOO_LARGE' }, { status: 413 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let extractedText = ''
  if (fileExt === 'pdf') {
    if (!buffer.subarray(0, 1024).toString('latin1').includes('%PDF-')) {
      return NextResponse.json({ error: 'This file does not appear to be a valid PDF.', code: 'NOT_A_PDF' }, { status: 400 })
    }
    const pdf = await extractPdfText(buffer)
    if (!pdf.text.trim() && (pdf.imageCount ?? 0) > 0) {
      return NextResponse.json(
        {
          error:
            'This PDF looks like a scanned image, so there is no text to read. Upload the original Word file or a text PDF, or paste your CV text instead.',
          code: 'PDF_SCANNED',
        },
        { status: 422 },
      )
    }
    if (pdf.looksGarbled) {
      return NextResponse.json(
        {
          error:
            'We could not read the text in this PDF reliably. If it is password-protected, remove the password first; otherwise upload a different export (Save as PDF from Word or Google Docs works well), or paste your resume text instead.',
          code: 'PDF_UNREADABLE',
        },
        { status: 422 },
      )
    }
    extractedText = pdf.text
  } else {
    try {
      const mammoth = await import('mammoth')
      extractedText = (await mammoth.extractRawText({ buffer })).value
    } catch {
      return NextResponse.json(
        {
          error: 'We could not open this Word file — it may be damaged or password-protected. Save it again, or paste your CV text instead.',
          code: 'DOCX_UNREADABLE',
        },
        { status: 422 },
      )
    }
  }

  if (!extractedText || extractedText.trim().length < 50) {
    return NextResponse.json({ error: 'Could not extract text from file. Try copy-paste instead.' }, { status: 422 })
  }
  if (extractedText.length > MAX_EXTRACTED_CHARS) {
    return NextResponse.json(
      {
        error: 'This CV is longer than we can read in one go (about 12 pages of text). Shorten it to your most relevant roles and upload again.',
        code: 'TOO_LONG',
      },
      { status: 422 },
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

  const reservation = await reserveAiAction({ userId: user.id, action: LIMIT_ACTION_EXTRACTION, ttlSeconds: 330 })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  let succeeded = false
  try {
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
      const normalized = normalizeDraft(extractJsonObject(result.text))
      if (!normalized) {
        console.error('parse upload: answer was not a readable profile user=' + user.id + ' out=' + result.outputTokens)
        return NextResponse.json({ error: READ_FAILED }, { status: 422 })
      }
      draft = normalized
    } catch (e) {
      console.error('parse upload: AI call failed user=' + user.id + ' route=/api/parse/upload', e instanceof Error ? e.message : String(e))
      return NextResponse.json({ error: READ_FAILED }, { status: 502 })
    }

    // A successful read counts once — and, when a profile already existed, as
    // one of this month's recreations.
    succeeded = true
    if (recreation.isRecreate) await recordRecreation(user.id)

    // Kept server-side BEFORE answering, so a closed browser cannot lose a paid
    // reading (2026-09-11, migration 047). See lib/pendingDraft.ts.
    await savePendingDraft(supabase, user.id, draft, 'upload')

    return NextResponse.json({ success: true, draft })
  } finally {
    await reservation.finish(succeeded)
  }
}
