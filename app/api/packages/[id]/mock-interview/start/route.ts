import { createHash } from 'node:crypto'
import { voiceAdmin, voiceEnabled, transcriptionReady } from '@/lib/voice/server'
import { VOICE_RUBRIC } from '@/lib/voice/types'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import { buildMockInterviewStartPrompt } from '@/lib/ai/buildMockInterviewPrompt'
import { runAiTask, AiTaskError } from '@/lib/ai/runTask'
import { normalizeMockInterviewQuestions, validateMockInterviewStart } from '@/lib/ai/validateMockInterview'
import { allowedNumbersFor, resumeDocumentTexts, unsourcedNumbers } from '@/lib/ai/answerGrounding'
import { reserveAiAction } from '@/lib/ai/serviceGuard'
import { LIMIT_ACTION_MOCK_START } from '@/lib/rateLimit'
import { loadCareerProfileFull, ProfileLoadError } from '@/lib/packages/profileLoader'
import { appendMockRunAtomic } from '@/lib/packages/serverWrites'
import type { MockInterviewDifficulty, MockInterviewMode, MockInterviewRun, OptimizedContent } from '@/types/package'

/**
 * POST /api/packages/[id]/mock-interview/start — plan a text mock interview.
 *
 * 2026-09-15 remediation (audit H03, H04, H09, M04, M05; review finding X01):
 * quota + pause guard, one deadline inside the function's ceiling, the saved CV
 * as primary source, a fail-loud profile read, a real number check on the
 * "ideal answer points" (they are what the user is coached to say), and an
 * atomic append of the new run. Starting again never touches a completed run:
 * each attempt is its own run, and completed reports stay as they were.
 */

export const maxDuration = 180
const DEADLINE_MS = 150_000
const MIN_REPAIR_MS = 60_000

const MODES: MockInterviewMode[] = ['hr', 'technical', 'gulf_readiness', 'manager', 'mixed']
const DIFFICULTIES: MockInterviewDifficulty[] = ['standard', 'strong', 'challenging']
const COUNTS = [5, 10, 15]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const startedAt = Date.now()
  const params = await props.params
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawBody = await request.json().catch(() => ({}))
  const body = isRecord(rawBody) ? rawBody : {}
  const mode: MockInterviewMode = MODES.includes(body.mode as MockInterviewMode) ? (body.mode as MockInterviewMode) : 'mixed'
  const difficulty: MockInterviewDifficulty = DIFFICULTIES.includes(body.difficulty as MockInterviewDifficulty)
    ? (body.difficulty as MockInterviewDifficulty)
    : 'standard'
  const questionCount = COUNTS.includes(Number(body.questionCount)) ? Number(body.questionCount) : 10

  const voice = body.inputMode === 'voice'
  if (voice && (!voiceEnabled() || !transcriptionReady())) return NextResponse.json({ error: 'Recorded interviews are not configured yet.' }, { status: 503 })
  if (voice) {
    const { error } = await voiceAdmin().from('voice_interview_sessions').select('id').limit(0)
    if (error) return NextResponse.json({ error: 'Voice interview storage needs setup before starting.' }, { status: 503 })
  }
  const packageId = params.id
  const { data: pkgRow, error: pkgError } = await supabase
    .from('packages')
    .select(
      'id, profile_id, target_job_title, target_country, target_company, target_industry, job_description, optimized_content, skills_order, field_visibility_snapshot, document_snapshot',
    )
    .eq('id', packageId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (pkgError) {
    console.error('mock-interview start: package lookup error user=' + user.id + ' pkg=' + packageId, pkgError.message)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
  if (!pkgRow) return NextResponse.json({ error: 'Package not found' }, { status: 404 })
  const optimizedContent = pkgRow.optimized_content as OptimizedContent | null
  if (!optimizedContent) {
    return NextResponse.json({ error: 'Build the optimized resume before starting a mock interview.' }, { status: 400 })
  }

  let profile
  try {
    profile = await loadCareerProfileFull(supabase, pkgRow.profile_id as string, user.id)
  } catch (e) {
    if (e instanceof ProfileLoadError) {
      console.error('mock-interview start: incomplete profile read user=' + user.id + ' table=' + e.table)
      return NextResponse.json(
        { error: 'We could not read your full Career Profile just now. Nothing was used — please try again.' },
        { status: 503 },
      )
    }
    throw e
  }
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const snapshot = pkgRow.document_snapshot
  const resume: ResumeDocument =
    isRecord(snapshot) && isRecord(snapshot.header)
      ? (snapshot as unknown as ResumeDocument)
      : buildResumeDocument({
          profile,
          optimizedContent,
          skillsOrder: (pkgRow.skills_order as string[] | null) ?? [],
          fieldVisibility: (pkgRow.field_visibility_snapshot as Record<string, boolean> | null) ?? null,
          // The application's title, so this document's headline matches the CV.
          targetJobTitle: (pkgRow.target_job_title as string | null) ?? null,
        })

  const allowed = allowedNumbersFor(profile, [
    ...resumeDocumentTexts(resume),
    pkgRow.job_description as string | null,
    pkgRow.target_job_title as string | null,
    pkgRow.target_company as string | null,
  ])

  const reservation = await reserveAiAction({
    userId: user.id,
    action: LIMIT_ACTION_MOCK_START,
    phone: profile.phone,
    email: profile.email,
    ttlSeconds: 210,
  })
  if (!reservation.ok) {
    return NextResponse.json({ error: reservation.error, code: reservation.code }, { status: reservation.status })
  }

  let succeeded = false
  try {
    const prompt = buildMockInterviewStartPrompt(
      profile,
      resume,
      {
        target_job_title: pkgRow.target_job_title as string,
        target_country: pkgRow.target_country as MockInterviewRun['target_country'],
        target_company: pkgRow.target_company as string | null,
        target_industry: pkgRow.target_industry as string | null,
      },
      pkgRow.job_description as string | null,
      { mode, difficulty, questionCount },
    )

    let normalized
    let openingNote = ''
    try {
      const result = await runAiTask({
        service: 'mock_interview',
        route: '/api/packages/[id]/mock-interview/start',
        userId: user.id,
        persona: prompt.persona,
        instructions: prompt.instructions,
        input: prompt.input,
        grounding: {
          mode: 'enforced',
          profile,
          check: (_profile, output) => {
            const qs = isRecord(output) && Array.isArray(output.questions) ? output.questions : []
            const failures: Array<{ detail: string; offendingValue?: string }> = []
            qs.forEach((q, i) => {
              const points = isRecord(q) && Array.isArray(q.ideal_answer_points) ? q.ideal_answer_points : []
              for (const p of points) {
                const values = typeof p === 'string' ? unsourcedNumbers(p, allowed) : []
                if (values.length > 0) {
                  failures.push({
                    detail: `questions[${i}].ideal_answer_points states a number that is not in the profile, CV or job advert`,
                    offendingValue: values.join(', '),
                  })
                }
              }
            })
            return { valid: failures.length === 0, failures }
          },
        },
        validateShape: (output) => {
          const failures = validateMockInterviewStart(output, questionCount)
          return failures.length ? failures.slice(0, 5).join('; ') : null
        },
        maxTokens: 3500,
        temperature: 0.2,
        repairAttempts: 1,
        deadlineAt: startedAt + DEADLINE_MS,
        minRepairMs: MIN_REPAIR_MS,
      })
      openingNote = String((result.value as { opening_note?: unknown }).opening_note ?? '').trim()
      normalized = normalizeMockInterviewQuestions(result.value)
    } catch (error) {
      console.error(
        'mock-interview start: AI call failed user=' + user.id + ' pkg=' + packageId,
        error instanceof AiTaskError ? `${error.kind}: ${error.detail ?? error.message}` : String(error),
      )
      return NextResponse.json({ error: 'Could not start the mock interview. Nothing was used — please try again.' }, { status: 502 })
    }

    const fingerprint = createHash('sha256').update(JSON.stringify({ resume, job: pkgRow.job_description, title: pkgRow.target_job_title, company: pkgRow.target_company })).digest('hex')
    const run: MockInterviewRun = {
      input_mode: voice ? 'voice' : 'text',
      ...(voice ? { resume_fingerprint: fingerprint, rubric_version: VOICE_RUBRIC } : {}),
      id: crypto.randomUUID(),
      generated_at: new Date().toISOString(),
      completed_at: null,
      target_job_title: pkgRow.target_job_title as string,
      target_company: pkgRow.target_company as string | null,
      target_country: pkgRow.target_country as MockInterviewRun['target_country'],
      mode,
      difficulty,
      question_count: questionCount,
      current_index: 0,
      status: 'in_progress',
      opening_note: openingNote || 'Your mock interview is ready.',
      questions: normalized.map((q) => ({
        id: crypto.randomUUID(),
        ...q,
        answer: null,
        feedback: null,
        better_answer: null,
        follow_up: null,
        score: null,
        answered_at: null,
      })),
      final_report: null,
    }

    let saved: boolean
    try {
      if (voice) {
        const { data, error } = await voiceAdmin().rpc('voice_start_session', { p_package_id: packageId, p_user_id: user.id, p_run: run, p_profile: profile, p_fingerprint: fingerprint, p_rubric: VOICE_RUBRIC })
        if (error) throw error
        saved = data === true
      } else saved = await appendMockRunAtomic({ packageId, userId: user.id, run })
    } catch (e) {
      console.error('mock-interview start: save failed user=' + user.id + ' pkg=' + packageId, e instanceof Error ? e.message : String(e))
      return NextResponse.json({ error: 'The interview was created but could not be saved. Please try again.' }, { status: 500 })
    }
    if (!saved) return NextResponse.json({ error: 'Package not found' }, { status: 404 })

    succeeded = true
    return NextResponse.json({ success: true, run })
  } finally {
    await reservation.finish(succeeded)
  }
}
