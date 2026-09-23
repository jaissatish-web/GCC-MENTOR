import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildMockInterviewFeedbackPrompt } from '@/lib/ai/buildMockInterviewPrompt'
import { runAiTask, AiTaskError } from '@/lib/ai/runTask'
import { normalizeMockInterviewFeedback, validateMockInterviewFeedback } from '@/lib/ai/validateMockInterview'
import { collectNumbers, unsourcedNumbers } from '@/lib/ai/answerGrounding'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { LIMIT_ACTION_MOCK_ANSWER } from '@/lib/rateLimit'
import { recordMockAnswerAtomic } from '@/lib/packages/serverWrites'
import { loadCareerProfileFull } from '@/lib/packages/profileLoader'
import {
  gapTermsFromMatchReport,
  groundAnswer,
  notInCvFeedback,
  profileEvidenceText,
  totalExperienceYears,
  unsupportedAnswerClaims,
  unverifiedEntityClaims,
} from '@/lib/ai/proseClaims'
import { MOCK_ANSWER_MAX_CHARS } from '@/lib/mockInterviewLimits'
import type { MockInterviewRun } from '@/types/package'

/**
 * POST /api/packages/[id]/mock-interview/[runId]/answer — feedback on one typed answer.
 *
 * 2026-09-15 remediation (audit M05, H03, H04, H09; review finding X01):
 *   - An answer is at most MOCK_ANSWER_MAX_CHARS. Unbounded input was unbounded spend.
 *   - Only an IN-PROGRESS run's UNANSWERED question can be answered. A repeat
 *     submit (double tap, retry after a lost response) is answered from what is
 *     saved — 409 with the run — and costs no model call. Two in flight at once
 *     are stopped by the per-user concurrency cap before either calls the model.
 *   - The "better answer" is written in the user's voice, so it may only use what
 *     the user typed (and the question's expected points). Any number in it must
 *     come from those; a missing detail becomes a [placeholder], never a guess.
 *   - Saved atomically, never overwriting another answer or run (migration 050).
 */

export const maxDuration = 90
const DEADLINE_MS = 70_000
const MIN_REPAIR_MS = 25_000

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export async function POST(request: Request, props: { params: Promise<{ id: string; runId: string }> }): Promise<NextResponse> {
  const startedAt = Date.now()
  const params = await props.params
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
  if (answer.length > MOCK_ANSWER_MAX_CHARS) {
    return NextResponse.json(
      {
        error: `Keep your answer under ${MOCK_ANSWER_MAX_CHARS.toLocaleString('en-US')} characters (about 500 words).`,
        code: 'ANSWER_TOO_LONG',
      },
      { status: 400 },
    )
  }

  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select('id, profile_id, mock_interview_runs, match_report')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (pkgError) {
    console.error('mock-interview answer: package lookup error user=' + user.id + ' pkg=' + params.id, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  const runs = Array.isArray(pkgRow.mock_interview_runs) ? (pkgRow.mock_interview_runs as MockInterviewRun[]) : []
  const run = runs.find((r) => r.id === params.runId)
  if (!run) return NextResponse.json({ error: 'Mock interview not found' }, { status: 404 })
  if (run.status !== 'in_progress') {
    return NextResponse.json({ error: 'This mock interview is already completed.', code: 'RUN_COMPLETED', run }, { status: 409 })
  }
  const qIndex = run.questions.findIndex((q) => q.id === questionId)
  if (qIndex < 0) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  const question = run.questions[qIndex]
  if (question.answer) {
    return NextResponse.json({ error: 'This question already has a saved answer.', code: 'ALREADY_ANSWERED', run }, { status: 409 })
  }

  const reservation = await reserveAiAction({ userId: user.id, action: LIMIT_ACTION_MOCK_ANSWER, ttlSeconds: 120 })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  // The better answer may only restate numbers the user or the question gave.
  const allowed = collectNumbers([answer, question.question, ...question.ideal_answer_points])

  let succeeded = false
  try {
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
        grounding: {
          mode: 'not_applicable',
          reason:
            "rewrites the user's own typed answer, not the profile; its numbers are checked against that answer and the question in validateShape",
        },
        validateShape: (output) => {
          const failures = validateMockInterviewFeedback(output)
          if (failures.length) return failures.join('; ')
          const better = isRecord(output) && typeof output.better_answer === 'string' ? output.better_answer : ''
          const invented = unsourcedNumbers(better, allowed)
          return invented.length
            ? `better_answer states numbers the candidate did not give (${invented.join(', ')}); use a [placeholder] instead`
            : null
        },
        maxTokens: 1600,
        temperature: 0.2,
        repairAttempts: 1,
        deadlineAt: startedAt + DEADLINE_MS,
        minRepairMs: MIN_REPAIR_MS,
      })
      feedback = normalizeMockInterviewFeedback(result.value)
    } catch (error) {
      console.error(
        'mock-interview answer: AI call failed user=' + user.id + ' pkg=' + params.id,
        error instanceof AiTaskError ? `${error.kind}: ${error.detail ?? error.message}` : String(error),
      )
      return NextResponse.json(
        { error: 'Could not review this answer. Your answer is still in the box and nothing was used — please try again.' },
        { status: 502 },
      )
    }

    // Claims check against the Career Profile. A profile that cannot be read
    // skips the check rather than failing a review the user already waited for.
    let feedbackText = feedback.feedback
    let betterAnswer = feedback.better_answer
    let score = feedback.score
    try {
      const profile = await loadCareerProfileFull(supabase, pkgRow.profile_id as string, user.id)
      if (profile) {
        const ctx = {
          evidence: profileEvidenceText(profile),
          gaps: gapTermsFromMatchReport(pkgRow.match_report),
          totalYears: totalExperienceYears(profile),
        }
        // Requirement gaps, plus certificates and named products the CV never
        // mentions (2026-09-23: "DeltaV" and a TUV certificate slipped through).
        const claims = [...new Set([...unsupportedAnswerClaims(answer, ctx), ...unverifiedEntityClaims(answer, ctx.evidence)])]
        if (claims.length > 0) {
          feedbackText = notInCvFeedback(claims, feedbackText)
          // An answer an interviewer can disprove from the CV is a weak answer,
          // however fluent. Capped, never raised.
          score = Math.min(score, 3)
        }
        // The model answer must not carry the candidate's claim forward.
        betterAnswer = groundAnswer(betterAnswer, ctx).text
      }
    } catch (e) {
      console.error('mock-interview answer: claim check skipped pkg=' + params.id, e instanceof Error ? e.message : String(e))
    }

    let write
    try {
      write = await recordMockAnswerAtomic({
        packageId: params.id,
        userId: user.id,
        runId: params.runId,
        questionId,
        questionNumber: qIndex + 1,
        fields: {
          answer,
          feedback: feedbackText,
          better_answer: betterAnswer,
          follow_up: feedback.follow_up,
          score,
          answered_at: new Date().toISOString(),
        },
      })
    } catch (e) {
      console.error('mock-interview answer: save failed user=' + user.id + ' pkg=' + params.id, e instanceof Error ? e.message : String(e))
      return NextResponse.json({ error: 'Could not save this answer. Your answer is still in the box — please try again.' }, { status: 500 })
    }

    if (write.status === 'already_answered' || write.status === 'run_not_in_progress') {
      return NextResponse.json(
        { error: 'This question was already answered in another tab.', code: 'ALREADY_ANSWERED', run: write.run },
        { status: 409 },
      )
    }
    if (write.status !== 'saved' || !write.run) {
      return NextResponse.json({ error: 'Mock interview not found' }, { status: 404 })
    }

    succeeded = true
    const updatedRun = write.run
    return NextResponse.json({
      success: true,
      run: updatedRun,
      next_question: updatedRun.questions.find((q) => !q.answer) ?? null,
    })
  } finally {
    await reservation.finish(succeeded)
  }
}
