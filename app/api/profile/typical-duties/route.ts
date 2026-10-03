import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getRateLimitStatus, incrementRateLimit, LIMIT_ACTION_TYPICAL_DUTIES } from '@/lib/rateLimit'
import { getTypicalDuties } from '@/lib/typicalDuties'

/**
 * POST /api/profile/typical-duties — { title } → { duties: string[] }
 * (2026-10-03, launch audit I1). Typical duties for a job listed with none, for
 * the user to TICK what they really did. Written from the title alone and
 * cached per title (lib/typicalDuties.ts); nothing is saved to the profile
 * here — the ticked lines go into the job in the editor, and the user saves.
 */
export const maxDuration = 60

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const title = typeof body?.title === 'string' ? body.title.replace(/\s+/g, ' ').trim() : ''
  if (title.length < 2 || title.length > 120) return NextResponse.json({ error: 'Add the job title first.' }, { status: 400 })

  const limit = await getRateLimitStatus({ userId: user.id, action: LIMIT_ACTION_TYPICAL_DUTIES })
  if (!limit.allowed) return NextResponse.json({ error: limit.message ?? 'Daily limit reached. Please try again tomorrow.' }, { status: 429 })

  try {
    const { duties, cached } = await getTypicalDuties(title, user.id)
    // Only a new title costs a model call, so only that counts.
    if (!cached) await incrementRateLimit({ userId: user.id, action: LIMIT_ACTION_TYPICAL_DUTIES })
    return NextResponse.json({ duties })
  } catch (e) {
    console.error('typical duties failed user=' + user.id, e instanceof Error ? e.message : String(e))
    return NextResponse.json({ error: 'Could not load typical duties just now. Please try again.' }, { status: 502 })
  }
}
