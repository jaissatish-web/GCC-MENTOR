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

/** `min`: valid items needed — the whole set's 15 by default, less for one part of it. */
export function validateInterviewQa(output: unknown, min: number = MIN_QA_QUESTIONS): InterviewQaValidationResult {
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
  if (good >= min) return { valid: true, failures: [] }
  return {
    valid: false,
    failures: [`questions: only ${good} valid items; return every item complete`, ...failures],
  }
}

/**
 * A part may only use its own categories (2026-10-03). In the lab one part
 * labelled all five items "gulf_readiness | company_role", copied from its
 * schema, and every one was dropped as an unknown category. The part's theme
 * is known, so a wrong label is corrected rather than losing the answers.
 */
export function withPartCategories(output: unknown, allowed: readonly InterviewQuestionCategory[]): unknown {
  if (!isRecord(output) || !Array.isArray(output.questions)) return output
  const fallback = allowed[allowed.length - 1]
  return {
    ...output,
    questions: output.questions.map((q) =>
      isRecord(q) && !allowed.includes(q.category as InterviewQuestionCategory) ? { ...q, category: fallback } : q,
    ),
  }
}

// Words every interview question shares; they say nothing about what it asks.
const QUESTION_FILLER = new Set(
  'what when where which while your yours have with that this from about describe tell time would could should give example experience role work worked into been were they them their there these those does during some such also more most very just like make made using used walk through approach ensure handle specific candidate'.split(' '),
)

function contentWords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((w) => w.length > 3 && !QUESTION_FILLER.has(w)))
}

/**
 * Drop a question that asks what an earlier one already asked (2026-10-03).
 * Parts are written separately and can land on the same CV highlight — the lab
 * saw "SAP FICO at Lulu" asked once as technical and again as project.
 *
 * Words found in three or more questions are the set's context (the employer,
 * the job title, the company) and are ignored. A repeat then shares at least
 * two of the remaining words, and at least 60% of the shorter question's. A
 * behavioural question is compared only with behavioural ones: "a mistake on
 * the metro project" is not "your role on the metro project", though it names
 * the same project. The first one asked is kept.
 */
export function dropNearDuplicates<T extends { question: string; category?: string }>(questions: T[], overlap = 0.6): T[] {
  const all = questions.map((q) => contentWords(q.question))
  const df = new Map<string, number>()
  for (const words of all) for (const w of words) df.set(w, (df.get(w) ?? 0) + 1)
  const distinctive = all.map((words) => new Set([...words].filter((w) => (df.get(w) ?? 0) < 3)))
  const story = (q: T) => q.category === 'behavioral'
  const kept: T[] = []
  const seen: Array<{ words: Set<string>; story: boolean }> = []
  questions.forEach((q, i) => {
    const words = distinctive[i]
    const repeat = seen.some((s) => {
      if (s.story !== story(q)) return false
      let shared = 0
      for (const w of words) if (s.words.has(w)) shared++
      return shared >= 2 && shared / Math.min(words.size, s.words.size) >= overlap
    })
    if (!repeat) {
      kept.push(q)
      seen.push({ words, story: story(q) })
    }
  })
  return kept
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
