import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMockInterviewReportPrompt } from '@/lib/ai/buildMockInterviewPrompt'
import { runAiTask, AiTaskError } from '@/lib/ai/runTask'
import { normalizeMockInterviewReport, validateMockInterviewReport } from '@/lib/ai/validateMockInterview'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { LIMIT_ACTION_MOCK_REPORT } from '@/lib/rateLimit'
import { completeMockRunAtomic } from '@/lib/packages/serverWrites'
import { claimsInFeedback, NOT_IN_CV_PREFIX } from '@/lib/ai/proseClaims'
import type { MockInterviewRun } from '@/types/package'

/**
 * POST /api/packages/[id]/mock-interview/[runId]/finish — the preparation report.
 *
 * 2026-09-15 remediation (audit M05, H03, H04, H09):
 *   - A COMPLETED REPORT IS FINAL. Finishing an already-finished run returns the
 *     saved report and spends nothing — it used to regenerate and overwrite it.
 *     To practise again the user starts a new run; old reports stay as they were.
 *   - EARLY FINISH is allowed with at least one answer, and says so: the response
 *     carries answered/total, and the report is told which questions were skipped
 *     so it does not guess how they would have gone.
 *   - Quota + pause guard, one deadline, atomic save (migration 050).
 */

export const maxDuration = 120
const DEADLINE_MS = 100_000
const MIN_REPAIR_MS = 35_000

export async function POST(_request: Request, props: { params: Promise<{ id: string; runId: string }> }): Promise<NextResponse> {
  const startedAt = Date.now()
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select('id, mock_interview_runs')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (pkgError) {
    console.error('mock-interview finish: package lookup error user=' + user.id + ' pkg=' + params.id, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  const runs = Array.isArray(pkgRow.mock_interview_runs) ? (pkgRow.mock_interview_runs as MockInterviewRun[]) : []
  const run = runs.find((r) => r.id === params.runId)
  if (!run) return NextResponse.json({ error: 'Mock interview not found' }, { status: 404 })
  if (run.input_mode === 'voice') return NextResponse.json({ error: 'Use the recorded interview review flow for this session.' }, { status: 409 })

  const total = run.questions.length
  const answered = run.questions.filter((q) => q.answer).length
  if (run.status === 'completed' && run.final_report) {
    return NextResponse.json({ success: true, run, answered, total, alreadyCompleted: true })
  }
  if (answered === 0) return NextResponse.json({ error: 'Answer at least one question before finishing.' }, { status: 400 })

  const reservation = await reserveAiAction({ userId: user.id, action: LIMIT_ACTION_MOCK_REPORT, ttlSeconds: 150 })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  let succeeded = false
  try {
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
        deadlineAt: startedAt + DEADLINE_MS,
        minRepairMs: MIN_REPAIR_MS,
      })
      report = normalizeMockInterviewReport(result.value)
      // Answers that claimed what the CV does not show are the riskiest thing
      // in the run; they lead the list whatever the model chose.
      const flagged = run.questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) => typeof q.feedback === 'string' && q.feedback.startsWith(NOT_IN_CV_PREFIX))
        .map(({ q, i }) => `Q${i + 1}: ${q.feedback!.slice(NOT_IN_CV_PREFIX.length).split('.')[0].trim()}`)
      if (flagged.length > 0) report = { ...report, risky_answers: [...flagged, ...report.risky_answers].slice(0, 5) }
      // A claim the CV does not show is never a strength (2026-09-23: a real report
      // listed an unproven certificate and platform as the candidate's strengths).
      const claimed = run.questions.flatMap((q) => claimsInFeedback(q.feedback)).map((c) => c.toLowerCase())
      if (claimed.length > 0) {
        report = { ...report, strengths: report.strengths.filter((st) => !claimed.some((c) => st.toLowerCase().includes(c))) }
      }
    } catch (error) {
      console.error(
        'mock-interview finish: AI call failed user=' + user.id + ' pkg=' + params.id,
        error instanceof AiTaskError ? `${error.kind}: ${error.detail ?? error.message}` : String(error),
      )
      return NextResponse.json(
        { error: 'Could not create the report. Your answers are saved and nothing was used — please try again.' },
        { status: 502 },
      )
    }

    let write
    try {
      write = await completeMockRunAtomic({ packageId: params.id, userId: user.id, runId: params.runId, report })
    } catch (e) {
      console.error('mock-interview finish: save failed user=' + user.id + ' pkg=' + params.id, e instanceof Error ? e.message : String(e))
      return NextResponse.json({ error: 'Could not save the report. Your answers are saved — please try again.' }, { status: 500 })
    }

    if (write.status === 'already_completed' && write.run) {
      // Another tab finished first. Its report stands; this one is not saved.
      return NextResponse.json({ success: true, run: write.run, answered, total, alreadyCompleted: true })
    }
    if (write.status === 'no_answers') {
      return NextResponse.json({ error: 'Answer at least one question before finishing.' }, { status: 400 })
    }
    if (write.status !== 'completed' || !write.run) {
      return NextResponse.json({ error: 'Mock interview not found' }, { status: 404 })
    }

    succeeded = true
    return NextResponse.json({ success: true, run: write.run, answered, total })
  } finally {
    await reservation.finish(succeeded)
  }
}
