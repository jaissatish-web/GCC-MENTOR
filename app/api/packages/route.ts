import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Package } from '@/types/package'

/**
 * Library list — TASK-035.
 *
 * GET /api/packages — returns the caller's own packages (the Library).
 * Auth first (401); scoped to user_id = caller, so a caller can only ever see
 * their own rows (RLS applies, and the filter is explicit too). No other
 * package's data is reachable. Newest first.
 *
 * Each row carries everything the Library renders: target fields, status,
 * optimization_level, created_at, and the four Phase 2–4 schema-reservation
 * slots (ats_score_card, cover_letters, interview_questions,
 * mock_interview_runs) that the artifact chips read from — all null today.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('packages')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('packages list error user=' + user.id, error.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ packages: (data as Package[] | null) ?? [] })
}
