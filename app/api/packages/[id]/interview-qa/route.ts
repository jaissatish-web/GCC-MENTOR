import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { buildInterviewQaPrompt } from '@/lib/ai/buildInterviewQaPrompt'
import { runAiTask, AiTaskError } from '@/lib/ai/runTask'
import { normalizeInterviewQa, validateInterviewQa } from '@/lib/ai/validateInterviewQa'
import { allowedNumbersFor, resumeDocumentTexts, unsourcedNumbers } from '@/lib/ai/answerGrounding'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { LIMIT_ACTION_INTERVIEW_QA } from '@/lib/rateLimit'
import { loadCareerProfileFull, ProfileLoadError } from '@/lib/packages/profileLoader'
import { setInterviewQuestionsAtomic } from '@/lib/packages/serverWrites'
import type { InterviewQuestionSet, OptimizedContent } from '@/types/package'

/**
 * POST /api/packages/[id]/interview-qa — up to 25 interview questions with
 * sample answers for one saved job.
 *
 * 2026-09-15 remediation (audit H03, H04, H09, M04; review finding X01):
 *   - QUOTA + PAUSE: reserved before the model call (lib/ai/serviceGuard.ts),
 *     consumed only once the set is saved, released on any failure.
 *   - DEADLINE: one give-up point for the call and its repair, 30s inside the
 *     function's ceiling, so the route always answers with its own message.
 *   - GROUNDING: every number in a first-person answer must come from the
 *     profile, the saved CV, the advert or the user's own dates. Before this the
 *     "enforced" check only validated JSON shape. More than five unsourced
 *     answers sends the set back for repair; any that survive a repair are
 *     DROPPED — never shown, never patched by guessing.
 *   - SOURCE: the saved CV (document_snapshot) the user sees and downloads is the
 *     primary source; the Career Profile supplements it. A failed profile read is
 *     an error, not an empty profile.
 *   - SAVE: one atomic statement (migration 050).
 */

export const maxDuration = 300
const DEADLINE_MS = 270_000
/** A repair is a full second generation (~2 min on slower upstreams). */
const MIN_REPAIR_MS = 120_000
const MAX_UNGROUNDED_ANSWERS = 5

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function aiFailureMessage(error: unknown): string {
  const detail = error instanceof AiTaskError ? `${error.kind} ${error.detail ?? ''}` : String(error)
  return /stall|out of time|deadline|timed out/i.test(detail)
    ? "The AI service didn't answer in time. Nothing was used — please try again."
    : 'Could not generate interview Q&A. Nothing was used — please try again.'
}

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const startedAt = Date.now()
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const packageId = params.id
  if (typeof packageId !== 'string' || packageId.trim() === '') {
    return NextResponse.json({ error: 'Invalid package id' }, { status: 400 })
  }

  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select(
      'id, profile_id, target_job_title, target_country, target_company, target_industry, job_description, optimized_content, skills_order, field_visibility_snapshot, document_snapshot',
    )
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (pkgError) {
    console.error('interview-qa: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

  const optimizedContent = pkgRow.optimized_content as OptimizedContent | null
  if (!optimizedContent) {
    return NextResponse.json(
      { error: 'Build the optimized resume for this job before generating interview Q&A.' },
      { status: 400 },
    )
  }

  let profile
  try {
    profile = await loadCareerProfileFull(supabase, pkgRow.profile_id as string, user.id)
  } catch (e) {
    if (e instanceof ProfileLoadError) {
      console.error('interview-qa: incomplete profile read user=' + user.id + ' table=' + e.table)
      return NextResponse.json(
        { error: 'We could not read your full Career Profile just now. Nothing was used — please try again.' },
        { status: 503 },
      )
    }
    throw e
  }
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  // The saved CV for THIS job is the version the answers must match.
  const snapshot = pkgRow.document_snapshot
  const resume: ResumeDocument =
    isRecord(snapshot) && isRecord(snapshot.header)
      ? (snapshot as unknown as ResumeDocument)
      : buildResumeDocument({
          profile,
          optimizedContent,
          skillsOrder: (pkgRow.skills_order as string[] | null) ?? [],
          fieldVisibility: (pkgRow.field_visibility_snapshot as Record<string, boolean> | null) ?? null,
        })

  const allowed = allowedNumbersFor(profile, [
    ...resumeDocumentTexts(resume),
    pkgRow.job_description as string | null,
    pkgRow.target_job_title as string | null,
    pkgRow.target_company as string | null,
  ])
  const ungroundedAnswers = (output: unknown): Array<{ index: number; values: string[] }> => {
    const qs = isRecord(output) && Array.isArray(output.questions) ? output.questions : []
    const bad: Array<{ index: number; values: string[] }> = []
    qs.forEach((q, index) => {
      const answer = isRecord(q) && typeof q.answer === 'string' ? q.answer : ''
      const values = unsourcedNumbers(answer, allowed)
      if (values.length > 0) bad.push({ index, values })
    })
    return bad
  }

  const reservation = await reserveAiAction({
    userId: user.id,
    action: LIMIT_ACTION_INTERVIEW_QA,
    phone: profile.phone,
    email: profile.email,
    ttlSeconds: 330,
  })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  let succeeded = false
  try {
    const prompt = buildInterviewQaPrompt(
      profile,
      resume,
      {
        target_job_title: String(pkgRow.target_job_title),
        target_country: (pkgRow.target_country as InterviewQuestionSet['target_country']) ?? null,
        target_company: (pkgRow.target_company as string | null) ?? null,
        target_industry: (pkgRow.target_industry as string | null) ?? null,
      },
      (pkgRow.job_description as string | null) ?? null,
    )

    let parsed
    try {
      const result = await runAiTask({
        service: 'qa_generation',
        route: '/api/packages/[id]/interview-qa',
        userId: user.id,
        persona: prompt.persona,
        instructions: prompt.instructions,
        input: prompt.input,
        grounding: {
          mode: 'enforced',
          profile,
          check: (_profile, output) => {
            const bad = ungroundedAnswers(output)
            if (bad.length <= MAX_UNGROUNDED_ANSWERS) return { valid: true, failures: [] }
            return {
              valid: false,
              failures: bad.map((b) => ({
                detail: `questions[${b.index}].answer states a number that is not in the profile, CV or job advert`,
                offendingValue: b.values.join(', '),
              })),
            }
          },
        },
        validateShape: (output) => {
          const validation = validateInterviewQa(output)
          return validation.valid ? null : validation.failures.slice(0, 5).join('; ')
        },
        maxTokens: 6000,
        temperature: 0.1,
        repairAttempts: 1,
        deadlineAt: startedAt + DEADLINE_MS,
        minRepairMs: MIN_REPAIR_MS,
      })
      parsed = normalizeInterviewQa(result.value)
    } catch (error) {
      console.error(
        'interview-qa: AI call failed user=' + user.id + ' pkg=' + packageId,
        error instanceof AiTaskError ? `${error.kind}: ${error.detail ?? error.message}` : String(error),
      )
      return NextResponse.json({ error: aiFailureMessage(error) }, { status: 502 })
    }

    // Anything still carrying an unsourced number is not shown.
    const kept = parsed.questions.filter((q) => unsourcedNumbers(q.answer, allowed).length === 0)
    const dropped = parsed.questions.length - kept.length
    if (kept.length === 0) {
      return NextResponse.json({ error: 'Could not generate grounded answers. Nothing was used — please try again.' }, { status: 502 })
    }

    const interviewQuestions: InterviewQuestionSet = {
      id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      target_job_title: String(pkgRow.target_job_title),
      target_company: (pkgRow.target_company as string | null) ?? null,
      target_country: (pkgRow.target_country as InterviewQuestionSet['target_country']) ?? null,
      question_count: kept.length,
      source: 'optimized_resume',
      questions: kept.map((question) => ({ id: crypto.randomUUID(), ...question })),
    }

    let saved: boolean
    try {
      saved = await setInterviewQuestionsAtomic({ packageId, userId: user.id, questions: interviewQuestions })
    } catch (e) {
      console.error('interview-qa: save failed user=' + user.id + ' pkg=' + packageId, e instanceof Error ? e.message : String(e))
      return NextResponse.json({ error: 'Your Q&A was generated but could not be saved. Please try again.' }, { status: 500 })
    }
    if (!saved) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    succeeded = true
    if (dropped > 0) console.info(`interview-qa: dropped ${dropped} ungrounded answer(s) pkg=${packageId}`)
    console.info(`interview Q&A generated: pkg=${packageId} user=${user.id} set=${interviewQuestions.id}`)
    return NextResponse.json({ success: true, interview_questions: interviewQuestions })
  } finally {
    await reservation.finish(succeeded)
  }
}
