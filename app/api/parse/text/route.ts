import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { EXTRACTION_SYSTEM_PROMPT, normalizeDraft, extractJsonObject } from '@/lib/ai/extractionPrompt'
import { getRateLimitStatus, incrementRateLimit, LIMIT_ACTION_EXTRACTION } from '@/lib/rateLimit'
import type { CareerProfileDraft } from '@/types/careerProfile'

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await request.json()
  if (!text || text.trim().length < 50) {
    return NextResponse.json({ error: 'Resume text too short (minimum 50 characters)' }, { status: 400 })
  }
  if (text.length > 20000) {
    return NextResponse.json({ error: 'Resume text too long (maximum 20000 characters)' }, { status: 400 })
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
      user: `Extract from this resume text:\n\n${text}`,
      maxTokens: 8192,
      temperature: 0.1,
      userId: user.id,
      route: '/api/parse/text',
      configKey: 'extraction',
    })
    const parsed = extractJsonObject(result.text)
    const normalized = normalizeDraft(parsed)
    if (!normalized) {
      return NextResponse.json({ error: 'Could not extract profile from this text. Please check and retry.' }, { status: 422 })
    }
    draft = normalized
  } catch (e) {
    console.error('parse text: AI call failed user=' + user.id + ' route=/api/parse/text', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not extract profile from this text. Please try again.' }, { status: 502 })
  }

  // A successful extraction consumes a rate-limit slot. usage logging happens
  // inside generate() (TASK-039) — do not add a second call.
  await incrementRateLimit({ userId: user.id, action: LIMIT_ACTION_EXTRACTION })

  return NextResponse.json({ success: true, draft })
}
