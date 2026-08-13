import { NextRequest, NextResponse } from 'next/server'
import { getAnonymousSession, SESSION_COOKIE_NAME } from '@/lib/anonymousSession'

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!token) return NextResponse.json({ error: 'No scan session found.' }, { status: 404 })
  const session = await getAnonymousSession(token)
  if (!session || !session.atsScoreResult) return NextResponse.json({ error: 'This scan has expired. Please scan your resume again.' }, { status: 404 })
  return NextResponse.json({ success: true, score: session.atsScoreResult, jobMatch: session.jobMatchResult ?? null, extractedProfile: session.extractedProfile })
}
