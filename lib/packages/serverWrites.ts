import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'
import { packageEvent } from '@/lib/packageEvents'
import type {
  CoverLetter,
  InterviewQuestionSet,
  MockInterviewFinalReport,
  MockInterviewRun,
  PackageServiceEventType,
} from '@/types/package'

/**
 * SERVER-OWNED package writes — the only path that may change them.
 *
 * Since migration 050 a signed-in user's own session can UPDATE only a
 * package's metadata (name, stage, template, style, tracker fields). Everything
 * the server derives — generated content, the frozen document, letters, Q&A,
 * mock runs, service history, payment state — is written here, through the
 * service-role client, after the calling route has authenticated the user.
 *
 * EVERY function takes the caller's user id and matches it in the WHERE clause
 * (or inside the migration-050 function). The service role bypasses RLS, so
 * that match IS the ownership check: never pass an id taken from a request body.
 *
 * The list/array writes go through database functions that append or edit one
 * element under a row lock (audit H04). Nothing here reads an array, changes it
 * in memory and writes it back.
 */

function writer() {
  return createServiceRoleClient()
}

function eventJson(type: PackageServiceEventType, label: string, meta?: Record<string, unknown>) {
  return packageEvent(type, label, meta)
}

/** Append one service-history event. `dedupeSeconds` skips a same-type repeat inside that window. */
export async function appendPackageEventAtomic(opts: {
  packageId: string
  userId: string
  type: PackageServiceEventType
  label: string
  meta?: Record<string, unknown>
  dedupeSeconds?: number
}): Promise<boolean> {
  const { data, error } = await writer().rpc('package_append_event', {
    p_package_id: opts.packageId,
    p_user_id: opts.userId,
    p_event: eventJson(opts.type, opts.label, opts.meta),
    p_dedupe_seconds: opts.dedupeSeconds ?? 0,
  })
  if (error) throw new Error('package_append_event: ' + error.message)
  return data === true
}

export async function appendCoverLetterAtomic(opts: {
  packageId: string
  userId: string
  letter: CoverLetter
  meta?: Record<string, unknown>
}): Promise<boolean> {
  const { data, error } = await writer().rpc('package_append_cover_letter', {
    p_package_id: opts.packageId,
    p_user_id: opts.userId,
    p_letter: opts.letter,
    p_event: eventJson('cover_letter_generated', 'Cover letter generated', opts.meta),
  })
  if (error) throw new Error('package_append_cover_letter: ' + error.message)
  return data === true
}

export async function setInterviewQuestionsAtomic(opts: {
  packageId: string
  userId: string
  questions: InterviewQuestionSet
}): Promise<boolean> {
  const { data, error } = await writer().rpc('package_set_interview_questions', {
    p_package_id: opts.packageId,
    p_user_id: opts.userId,
    p_questions: opts.questions,
    p_event: eventJson('qa_generated', 'Interview Q&A generated', { question_count: opts.questions.question_count }),
  })
  if (error) throw new Error('package_set_interview_questions: ' + error.message)
  return data === true
}

export async function appendMockRunAtomic(opts: {
  packageId: string
  userId: string
  run: MockInterviewRun
}): Promise<boolean> {
  const { data, error } = await writer().rpc('package_append_mock_run', {
    p_package_id: opts.packageId,
    p_user_id: opts.userId,
    p_run: opts.run,
    p_event: eventJson('mock_interview_started', 'Mock interview started', {
      mode: opts.run.mode,
      difficulty: opts.run.difficulty,
      question_count: opts.run.question_count,
    }),
  })
  if (error) throw new Error('package_append_mock_run: ' + error.message)
  return data === true
}

export type MockAnswerWriteStatus =
  | 'saved'
  | 'package_not_found'
  | 'run_not_found'
  | 'run_not_in_progress'
  | 'question_not_found'
  | 'already_answered'

export async function recordMockAnswerAtomic(opts: {
  packageId: string
  userId: string
  runId: string
  questionId: string
  questionNumber: number
  fields: {
    answer: string
    feedback: string
    better_answer: string
    follow_up: string | null
    score: number
    answered_at: string
  }
}): Promise<{ status: MockAnswerWriteStatus; run?: MockInterviewRun }> {
  const { data, error } = await writer().rpc('package_record_mock_answer', {
    p_package_id: opts.packageId,
    p_user_id: opts.userId,
    p_run_id: opts.runId,
    p_question_id: opts.questionId,
    p_fields: opts.fields,
    p_event: eventJson('mock_interview_answered', `Mock interview question ${opts.questionNumber} answered`, {
      score: opts.fields.score,
    }),
  })
  if (error) throw new Error('package_record_mock_answer: ' + error.message)
  return data as { status: MockAnswerWriteStatus; run?: MockInterviewRun }
}

export type MockCompleteWriteStatus = 'completed' | 'package_not_found' | 'run_not_found' | 'already_completed' | 'no_answers'

export async function completeMockRunAtomic(opts: {
  packageId: string
  userId: string
  runId: string
  report: MockInterviewFinalReport
}): Promise<{ status: MockCompleteWriteStatus; run?: MockInterviewRun }> {
  const { data, error } = await writer().rpc('package_complete_mock_run', {
    p_package_id: opts.packageId,
    p_user_id: opts.userId,
    p_run_id: opts.runId,
    p_report: opts.report,
    p_event: eventJson('mock_interview_completed', 'Mock interview report completed', {
      overall_score: opts.report.overall_score,
    }),
  })
  if (error) throw new Error('package_complete_mock_run: ' + error.message)
  return data as { status: MockCompleteWriteStatus; run?: MockInterviewRun }
}

/**
 * Update server-derived columns on one of the caller's packages (generation
 * output, the frozen document, content edits made through the validated edit
 * route, promo/payment state). Returns the selected row, or null when the
 * package is not the caller's.
 */
export async function updatePackageServerFields<T = { id: string }>(opts: {
  packageId: string
  userId: string
  fields: Record<string, unknown>
  select?: string
}): Promise<{ row: T | null; error: string | null }> {
  const { data, error } = await writer()
    .from('packages')
    .update(opts.fields)
    .eq('id', opts.packageId)
    .eq('user_id', opts.userId)
    .select(opts.select ?? 'id')
    .maybeSingle()
  return { row: (data as T | null) ?? null, error: error ? error.message : null }
}

/**
 * Create a package row for the caller. `row.user_id` is forced to `userId`, and
 * `profileId` must already have been checked to be the caller's own profile.
 */
export async function insertPackageForUser<T = { id: string }>(opts: {
  userId: string
  row: Record<string, unknown>
  select?: string
}): Promise<{ row: T | null; error: string | null }> {
  const { data, error } = await writer()
    .from('packages')
    .insert({ ...opts.row, user_id: opts.userId })
    .select(opts.select ?? 'id')
    .single()
  return { row: (data as T | null) ?? null, error: error ? error.message : null }
}
