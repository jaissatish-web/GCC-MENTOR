import type {
  InterviewQuestionAnswer,
  InterviewQuestionCategory,
  InterviewQuestionDifficulty,
} from '@/types/package'

export interface ParsedInterviewQa {
  questions: Array<Omit<InterviewQuestionAnswer, 'id'>>
}

export interface InterviewQaValidationResult {
  valid: boolean
  failures: string[]
}

const CATEGORIES: InterviewQuestionCategory[] = [
  'hr',
  'technical',
  'project',
  'behavioral',
  'gulf_readiness',
  'company_role',
]

const DIFFICULTIES: InterviewQuestionDifficulty[] = ['standard', 'strong', 'challenging']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function stringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0 && v.length <= 3 && v.every(nonEmptyString)
}

function add(failures: string[], path: string, message: string): void {
  failures.push(`${path}: ${message}`)
}

/**
 * How many good questions make a usable set (2026-09-23).
 *
 * The prompt asks for 25. The validator used to demand EXACTLY 25 and fail the
 * whole set over one short or malformed item: on a real run the model returned
 * a slightly shorter list twice (the first call and the repair, 207s), the user
 * got "Could not generate interview Q&A", and every good question was thrown
 * away. The screen promises "up to 25", so a set of 15 or more valid questions
 * is kept; invalid items are dropped by normalizeInterviewQa.
 */
export const MIN_QA_QUESTIONS = 15
export const MAX_QA_QUESTIONS = 25

function itemFailures(item: unknown, path: string): string[] {
  const failures: string[] = []
  if (!isRecord(item)) return [`${path}: expected object`]
  if (!CATEGORIES.includes(item.category as InterviewQuestionCategory)) add(failures, `${path}.category`, 'unknown category')
  if (!DIFFICULTIES.includes(item.difficulty as InterviewQuestionDifficulty)) add(failures, `${path}.difficulty`, 'unknown difficulty')
  for (const key of ['question', 'answer', 'why_asked', 'resume_basis'] as const) {
    if (!nonEmptyString(item[key])) add(failures, `${path}.${key}`, 'expected non-empty string')
  }
  if (item.follow_up !== null && item.follow_up !== undefined && typeof item.follow_up !== 'string') {
    add(failures, `${path}.follow_up`, 'expected string or null')
  }
  if (!stringArray(item.tags)) add(failures, `${path}.tags`, 'expected 1-3 strings')
  return failures
}

export function validateInterviewQa(output: unknown): InterviewQaValidationResult {
  if (!isRecord(output)) return { valid: false, failures: ['output: expected JSON object'] }
  const questions = output.questions
  if (!Array.isArray(questions)) {
    return { valid: false, failures: ['questions: expected array'] }
  }
  const failures: string[] = []
  let good = 0
  questions.forEach((item, index) => {
    const f = itemFailures(item, `questions[${index}]`)
    if (f.length === 0) good++
    else failures.push(...f)
  })
  if (good >= MIN_QA_QUESTIONS) return { valid: true, failures: [] }
  return {
    valid: false,
    failures: [`questions: only ${good} valid items; return ${MAX_QA_QUESTIONS} complete items`, ...failures],
  }
}

/** The valid items only (at most 25), each trimmed. Call after validateInterviewQa passed. */
export function normalizeInterviewQa(output: unknown): ParsedInterviewQa {
  const questions = (output as { questions: unknown[] }).questions
  return {
    questions: questions
      .filter((item, index) => itemFailures(item, `questions[${index}]`).length === 0)
      .slice(0, MAX_QA_QUESTIONS)
      .map((item) => {
        const q = item as Record<string, unknown>
        return {
          category: q.category as InterviewQuestionCategory,
          difficulty: q.difficulty as InterviewQuestionDifficulty,
          question: String(q.question).trim(),
          answer: String(q.answer).trim(),
          why_asked: String(q.why_asked).trim(),
          resume_basis: String(q.resume_basis).trim(),
          follow_up: nonEmptyString(q.follow_up) ? q.follow_up.trim() : null,
          tags: (q.tags as string[]).map((tag) => tag.trim()).filter(Boolean).slice(0, 3),
        }
      }),
  }
}
