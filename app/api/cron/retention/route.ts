import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { runRetention } from '@/lib/admin/retention'

/**
 * GET /api/cron/retention — the daily retention clean-up (audit H07).
 *
 * Called by Vercel Cron (vercel.json), which sends `Authorization: Bearer
 * $CRON_SECRET` when the CRON_SECRET environment variable is set on the
 * project. FAILS CLOSED: without that variable configured, or with a wrong
 * header, nothing runs. The comparison is constant-time.
 *
 * Returns counts only; never content.
 */
export const dynamic = 'force-dynamic'

function authorized(request: NextRequest, secret: string): boolean {
  const given = Buffer.from(request.headers.get('authorization') ?? '')
  const expected = Buffer.from(`Bearer ${secret}`)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('cron retention: CRON_SECRET is not configured — refusing to run')
    return NextResponse.json({ error: 'Not configured' }, { status: 503 })
  }
  if (!authorized(request, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runRetention('cron')
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
