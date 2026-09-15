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

export function validateInterviewQa(output: unknown): InterviewQaValidationResult {
  if (!isRecord(output)) return { valid: false, failures: ['output: expected JSON object'] }
  const questions = output.questions
  const failures: string[] = []

  if (!Array.isArray(questions)) {
    return { valid: false, failures: ['questions: expected array'] }
  }
  if (questions.length !== 25) {
    add(failures, 'questions', 'expected exactly 25 items')
  }

  questions.forEach((item, index) => {
    const path = `questions[${index}]`
    if (!isRecord(item)) {
      add(failures, path, 'expected object')
      return
    }
    if (!CATEGORIES.includes(item.category as InterviewQuestionCategory)) {
      add(failures, `${path}.category`, 'unknown category')
    }
    if (!DIFFICULTIES.includes(item.difficulty as InterviewQuestionDifficulty)) {
      add(failures, `${path}.difficulty`, 'unknown difficulty')
    }
    for (const key of ['question', 'answer', 'why_asked', 'resume_basis'] as const) {
      if (!nonEmptyString(item[key])) add(failures, `${path}.${key}`, 'expected non-empty string')
    }
    if (item.follow_up !== null && item.follow_up !== undefined && typeof item.follow_up !== 'string') {
      add(failures, `${path}.follow_up`, 'expected string or null')
    }
    if (!stringArray(item.tags)) {
      add(failures, `${path}.tags`, 'expected 1-3 strings')
    }
  })

  return { valid: failures.length === 0, failures }
}

export function normalizeInterviewQa(output: unknown): ParsedInterviewQa {
  const questions = (output as { questions: unknown[] }).questions
  return {
    questions: questions.map((item) => {
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
