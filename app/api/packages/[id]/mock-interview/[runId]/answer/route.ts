import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMockInterviewFeedbackPrompt } from '@/lib/ai/buildMockInterviewPrompt'
import { runAiTask, AiTaskError } from '@/lib/ai/runTask'
import { normalizeMockInterviewFeedback, validateMockInterviewFeedback } from '@/lib/ai/validateMockInterview'
import { appendPackageEvent } from '@/lib/packageEvents'
import type { MockInterviewRun } from '@/types/package'

export const maxDuration = 90

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function safeDetail(error: unknown): string {
  if (error instanceof AiTaskError) return `${error.kind}: ${error.detail ?? error.message}`
  return error instanceof Error ? error.message : String(error)
}

export async function POST(
  request: Request,
  { params }: { params: { id: string; runId: string } },
): Promise<NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const answer = isRecord(body) && typeof body.answer === 'string' ? body.answer.trim() : ''
  const questionId = isRecord(body) && typeof body.questionId === 'string' ? body.questionId : ''
  if (!answer) return NextResponse.json({ error: 'Write an answer before submitting.' }, { status: 400 })

  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select('id, mock_interview_runs, service_events')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (pkgError) {
    console.error('mock-interview answer: package lookup error user=' + user.id + ' pkg=' + params.id, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  const runs = Array.isArray(pkgRow.mock_interview_runs) ? (pkgRow.mock_interview_runs as MockInterviewRun[]) : []
  const runIndex = runs.findIndex((r) => r.id === params.runId)
  if (runIndex < 0) return NextResponse.json({ error: 'Mock interview not found' }, { status: 404 })
  const run = runs[runIndex]
  if (run.status !== 'in_progress') return NextResponse.json({ error: 'This mock interview is already completed.' }, { status: 400 })

  const qIndex = run.questions.findIndex((q) => q.id === questionId)
  if (qIndex < 0) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  const question = run.questions[qIndex]

  const prompt = buildMockInterviewFeedbackPrompt(run, question, answer)
  let feedback
  try {
    const result = await runAiTask({
      service: 'mock_interview',
      route: '/api/packages/[id]/mock-interview/[runId]/answer',
      userId: user.id,
      persona: prompt.persona,
      instructions: prompt.instructions,
      input: prompt.input,
      grounding: { mode: 'not_applicable', reason: 'evaluates the user supplied answer for one saved interview question' },
      validateShape: (output) => {
        const failures = validateMockInterviewFeedback(output)
        return failures.length ? failures.join('; ') : null
      },
      maxTokens: 1600,
      temperature: 0.2,
      repairAttempts: 1,
    })
    feedback = normalizeMockInterviewFeedback(result.value)
  } catch (error) {
    console.error('mock-interview answer: AI call failed user=' + user.id + ' pkg=' + params.id, safeDetail(error))
    return NextResponse.json({ error: 'Could not review this answer. Please try again.' }, { status: 502 })
  }

  const updatedRun: MockInterviewRun = {
    ...run,
    current_index: Math.min(qIndex + 1, run.questions.length - 1),
    questions: run.questions.map((q, i) =>
      i === qIndex
        ? {
            ...q,
            answer,
            feedback: feedback.feedback,
            better_answer: feedback.better_answer,
            follow_up: feedback.follow_up,
            score: feedback.score,
            answered_at: new Date().toISOString(),
          }
        : q,
    ),
  }
  const updatedRuns = runs.map((r, i) => (i === runIndex ? updatedRun : r))
  const { error: updateError } = await supabase
    .from('packages')
    .update({
      mock_interview_runs: updatedRuns,
      service_events: appendPackageEvent(pkgRow.service_events, 'mock_interview_answered', `Mock interview question ${qIndex + 1} answered`, {
        score: feedback.score,
      }),
    })
    .eq('id', params.id)
    .eq('user_id', user.id)
  if (updateError) {
    console.error('mock-interview answer: save failed user=' + user.id + ' pkg=' + params.id, updateError.message)
    return NextResponse.json({ error: 'Could not save this answer. Please try again.' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    run: updatedRun,
    next_question: updatedRun.questions[qIndex + 1] ?? null,
  })
}
