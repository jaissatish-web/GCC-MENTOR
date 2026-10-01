import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { LIMIT_ACTION_EXTRACTION } from '@/lib/rateLimit'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { getRecreationStatus, recordRecreation } from '@/lib/recreateLimit'
import { savePendingDraft } from '@/lib/pendingDraft'
import { extractProfile } from '@/lib/resumeParse/pipeline'

// NO `maxDuration` here, deliberately — a 60s cap broke long reads in
// production (2026-09-11). See the note in app/api/parse/upload/route.ts.

/** Same wording and reasoning as the upload route (2026-09-11). */
const READ_FAILED =
  "We couldn't finish reading your CV this time. Nothing was changed, and it didn't count against your limit — please try again."

const MIN_CHARS = 50
const MAX_CHARS = 20000

export async function POST(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const text = body && typeof body === 'object' && typeof (body as { text?: unknown }).text === 'string' ? (body as { text: string }).text : ''
  if (text.trim().length < MIN_CHARS) {
    return NextResponse.json({ error: `Resume text too short (minimum ${MIN_CHARS} characters)` }, { status: 400 })
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: `Resume text too long (maximum ${MAX_CHARS} characters)` }, { status: 400 })
  }

  // Monthly recreation limit (founder decision 2026-09-11). See lib/recreateLimit.ts.
  const recreation = await getRecreationStatus(user.id)
  if (!recreation.allowed) {
    return NextResponse.json(
      { error: recreation.message, code: 'RECREATE_LIMIT', recreation },
      { status: 429 },
    )
  }

  // Reserved before the model call, settled after (lib/ai/serviceGuard.ts,
  // audit H01/H03): the founder's pause applies, and concurrent reads cannot
  // both pass a count they each read before the other finished.
  const reservation = await reserveAiAction({ userId: user.id, action: LIMIT_ACTION_EXTRACTION, ttlSeconds: 330 })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  let succeeded = false
  try {
    // lib/resumeParse (2026-10-01): fast read, checks, at most one re-read.
    const parsed = await extractProfile(text.replace(/\r\n?/g, '\n').trim(), { route: '/api/parse/text', userId: user.id })
    if (!parsed.ok) {
      console.error('parse text: read failed user=' + user.id + ' code=' + parsed.code + (parsed.detail ? ' ' + parsed.detail : ''))
      return NextResponse.json({ error: READ_FAILED, code: parsed.code }, { status: 502 })
    }
    const { draft, report } = parsed

    // A successful read counts once — and, when a profile already existed, as
    // one of this month's recreations.
    succeeded = true
    if (recreation.isRecreate) await recordRecreation(user.id)

    // Kept server-side BEFORE answering, so a closed browser cannot lose a paid
    // reading (2026-09-11, migration 047). See lib/pendingDraft.ts.
    await savePendingDraft(supabase, user.id, draft, 'paste', report)

    return NextResponse.json({ success: true, draft, report })
  } finally {
    await reservation.finish(succeeded)
  }
}
