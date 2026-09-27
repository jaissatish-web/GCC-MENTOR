import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { processVoiceReview } from '@/lib/voice/review'
import { purgeDeletedVoiceSessions } from '@/lib/voice/retention'
export const dynamic = 'force-dynamic'
export const maxDuration = 180
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await purgeDeletedVoiceSessions()
    return NextResponse.json(await processVoiceReview())
  } catch { return NextResponse.json({ error: 'Review worker unavailable' }, { status: 503 }) }
}
