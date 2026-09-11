import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generate } from '@/lib/ai/provider'
import { EXTRACTION_MAX_TOKENS, EXTRACTION_SYSTEM_PROMPT, normalizeDraft, extractJsonObject } from '@/lib/ai/extractionPrompt'
import { getRateLimitStatus, incrementRateLimit, LIMIT_ACTION_EXTRACTION } from '@/lib/rateLimit'
import { getRecreationStatus, recordRecreation } from '@/lib/recreateLimit'
import type { CareerProfileDraft } from '@/types/careerProfile'

// NO `maxDuration` here, deliberately — a 60s cap broke long reads in
// production (2026-09-11). See the note in app/api/parse/upload/route.ts.

/** Same wording and reasoning as the upload route (2026-09-11). */
const READ_FAILED =
  "We couldn't finish reading your CV this time. Nothing was changed, and it didn't count against your limit — please try again."

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

  // Monthly recreation limit (founder decision 2026-09-11). See lib/recreateLimit.ts.
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
      user: `Extract from this resume text:\n\n${text}`,
      maxTokens: EXTRACTION_MAX_TOKENS,
      temperature: 0.1,
      userId: user.id,
      route: '/api/parse/text',
      configKey: 'extraction',
    })
    // Cut off at the budget: the JSON is incomplete, so do not try to parse it.
    if (result.truncated) {
      console.error('parse text: answer cut off at the token budget user=' + user.id + ' out=' + result.outputTokens)
      return NextResponse.json({ error: READ_FAILED, code: 'EXTRACTION_TRUNCATED' }, { status: 502 })
    }
    const parsed = extractJsonObject(result.text)
    const normalized = normalizeDraft(parsed)
    if (!normalized) {
      console.error('parse text: answer was not a readable profile user=' + user.id + ' out=' + result.outputTokens)
      return NextResponse.json({ error: READ_FAILED }, { status: 422 })
    }
    draft = normalized
  } catch (e) {
    console.error('parse text: AI call failed user=' + user.id + ' route=/api/parse/text', e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: READ_FAILED }, { status: 502 })
  }

  // A successful extraction consumes a rate-limit slot — and, when a profile
  // already existed, one of this month's recreations. usage logging happens
  // inside generate() (TASK-039) — do not add a second call.
  await incrementRateLimit({ userId: user.id, action: LIMIT_ACTION_EXTRACTION })
  if (recreation.isRecreate) await recordRecreation(user.id)

  return NextResponse.json({ success: true, draft })
}
