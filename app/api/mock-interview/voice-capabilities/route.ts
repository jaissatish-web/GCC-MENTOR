import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { voiceAdmin, voiceEnabled, transcriptionReady } from '@/lib/voice/server'
export const dynamic = 'force-dynamic'
export async function GET() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const enabled = voiceEnabled() && transcriptionReady()
  if (!enabled) return NextResponse.json({ enabled: false })
  const { error } = await voiceAdmin().from('voice_interview_sessions').select('id').limit(0)
  return NextResponse.json({ enabled: !error })
}
