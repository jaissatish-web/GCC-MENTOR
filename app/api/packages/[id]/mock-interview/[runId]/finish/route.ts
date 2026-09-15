import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMockInterviewReportPrompt } from '@/lib/ai/buildMockInterviewPrompt'
import { runAiTask, AiTaskError } from '@/lib/ai/runTask'
import { normalizeMockInterviewReport, validateMockInterviewReport } from '@/lib/ai/validateMockInterview'
import { appendPackageEvent } from '@/lib/packageEvents'
import type { MockInterviewRun } from '@/types/package'

export const maxDuration = 120

function safeDetail(error: unknown): string {
  if (error instanceof AiTaskError) return `${error.kind}: ${error.detail ?? error.message}`
  return error instanceof Error ? error.message : String(error)
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string; runId: string } },
): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select('id, mock_interview_runs, service_events')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (pkgError) {
    console.error('mock-interview finish: package lookup error user=' + user.id + ' pkg=' + params.id, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  const runs = Array.isArray(pkgRow.mock_interview_runs) ? (pkgRow.mock_interview_runs as MockInterviewRun[]) : []
  const runIndex = runs.findIndex((r) => r.id === params.runId)
  if (runIndex < 0) return NextResponse.json({ error: 'Mock interview not found' }, { status: 404 })
  const run = runs[runIndex]
  const answeredCount = run.questions.filter((q) => q.answer).length
  if (answeredCount === 0) return NextResponse.json({ error: 'Answer at least one question before finishing.' }, { status: 400 })

  const prompt = buildMockInterviewReportPrompt(run)
  let report
  try {
    const result = await runAiTask({
      service: 'mock_interview',
      route: '/api/packages/[id]/mock-interview/[runId]/finish',
      userId: user.id,
      persona: prompt.persona,
      instructions: prompt.instructions,
      input: prompt.input,
      grounding: { mode: 'not_applicable', reason: 'summarizes the user supplied mock interview answers and per-answer feedback' },
      validateShape: (output) => {
        const failures = validateMockInterviewReport(output)
        return failures.length ? failures.join('; ') : null
      },
      maxTokens: 2200,
      temperature: 0.2,
      repairAttempts: 1,
    })
    report = normalizeMockInterviewReport(result.value)
  } catch (error) {
    console.error('mock-interview finish: AI call failed user=' + user.id + ' pkg=' + params.id, safeDetail(error))
    return NextResponse.json({ error: 'Could not create the final report. Please try again.' }, { status: 502 })
  }

  const updatedRun: MockInterviewRun = {
    ...run,
    status: 'completed',
    completed_at: new Date().toISOString(),
    current_index: Math.min(answeredCount, run.questions.length - 1),
    final_report: report,
  }
  const updatedRuns = runs.map((r, i) => (i === runIndex ? updatedRun : r))
  const { error: updateError } = await supabase
    .from('packages')
    .update({
      mock_interview_runs: updatedRuns,
      service_events: appendPackageEvent(pkgRow.service_events, 'mock_interview_completed', 'Mock interview report completed', {
        overall_score: report.overall_score,
      }),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
  if (updateError) {
    console.error('mock-interview finish: save failed user=' + user.id + ' pkg=' + params.id, updateError.message)
    return NextResponse.json({ error: 'Could not save the final report. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, run: updatedRun })
}
