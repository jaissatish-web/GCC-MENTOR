import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { interviewProgress, type InterviewAttempt, type ResumeInterviewProgress } from '@/lib/interviewProgress'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // Owner session + explicit owner filter; only interview history is read.
    // Paginate beyond PostgREST's page limit; never silently truncate the account.
    const progress: ResumeInterviewProgress[] = []
    let attempts = 0
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.from('packages').select('id,mock_interview_runs')
        .eq('user_id', user.id).order('created_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + 99)
      if (error) throw error
      for (const row of data ?? []) {
        const runs = (row.mock_interview_runs ?? []) as InterviewAttempt[]
        attempts += runs.length
        const summary = interviewProgress(runs)
        if (summary) progress.push({ packageId: row.id, progress: summary })
      }
      if (!data || data.length < 100) break
    }
    progress.sort((a, b) => b.progress.generatedAt.localeCompare(a.progress.generatedAt))
    return NextResponse.json({ attempts, progress }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'Could not load interview progress.' }, { status: 503 }) }
}
