import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { EXTRACTION_SYSTEM_PROMPT, normalizeDraft, extractJsonObject } from '@/lib/ai/extractionPrompt'
import { getRateLimitStatus, incrementRateLimit, LIMIT_ACTION_EXTRACTION } from '@/lib/rateLimit'
import type { CareerProfileDraft } from '@/types/careerProfile'

// File-size limits kept verbatim from reference/parse-upload.reference.ts.
const MAX_FILE_SIZE_PDF = 5 * 1024 * 1024   // 5MB
const MAX_FILE_SIZE_DOCX = 2 * 1024 * 1024  // 2MB

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
      const pdfParse = (await import('pdf-parse')).default
      const pdfData = await pdfParse(buffer)
      extractedText = pdfData.text
    } else if (fileExt === 'docx' || fileExt === 'doc') {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      extractedText = result.value
    }
  } catch {
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

  let draft: CareerProfileDraft
  try {
    const result = await generate({
      system: EXTRACTION_SYSTEM_PROMPT,
      user: `Extract from this resume text:\n\n${extractedText}`,
      maxTokens: 8192,
      temperature: 0.1,
      userId: user.id,
      route: '/api/parse/upload',
    })
    const parsed = extractJsonObject(result.text)
    const normalized = normalizeDraft(parsed)
    if (!normalized) {
      return NextResponse.json({ error: 'Could not extract profile from resume. Try copy-paste instead.' }, { status: 422 })
    }
    draft = normalized
  } catch (e) {
    console.error('parse upload: AI call failed user=' + user.id + ' route=/api/parse/upload', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not extract profile from resume. Please try again.' }, { status: 502 })
  }

  // A successful extraction consumes a rate-limit slot. usage logging happens
  // inside generate() (TASK-039) — do not add a second call.
  await incrementRateLimit({ userId: user.id, action: LIMIT_ACTION_EXTRACTION })

  return NextResponse.json({ success: true, draft })
}
