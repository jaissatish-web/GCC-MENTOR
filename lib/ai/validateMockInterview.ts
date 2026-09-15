import type {
  InterviewQuestionCategory,
  MockInterviewFinalReport,
  MockInterviewQuestion,
} from '@/types/package'

const CATEGORIES: InterviewQuestionCategory[] = [
  'hr',
  'technical',
  'project',
  'behavioral',
  'gulf_readiness',
  'company_role',
]

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function strings(v: unknown, min: number, max: number): v is string[] {
  return Array.isArray(v) && v.length >= min && v.length <= max && v.every(nonEmptyString)
}

function score(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100
}

export function validateMockInterviewStart(output: unknown, expectedCount: number): string[] {
  const failures: string[] = []
  if (!isRecord(output)) return ['output: expected object']
  if (!nonEmptyString(output.opening_note)) failures.push('opening_note: expected non-empty string')
  if (!Array.isArray(output.questions)) return [...failures, 'questions: expected array']
  if (output.questions.length !== expectedCount) failures.push(`questions: expected exactly ${expectedCount}`)
  output.questions.forEach((item, index) => {
    if (!isRecord(item)) {
      failures.push(`questions[${index}]: expected object`)
      return
    }
    if (!CATEGORIES.includes(item.category as InterviewQuestionCategory)) failures.push(`questions[${index}].category: unknown`)
    if (!nonEmptyString(item.focus)) failures.push(`questions[${index}].focus: expected string`)
    if (!nonEmptyString(item.question)) failures.push(`questions[${index}].question: expected string`)
    if (!strings(item.ideal_answer_points, 1, 4)) failures.push(`questions[${index}].ideal_answer_points: expected 1-4 strings`)
  })
  return failures
}

export function normalizeMockInterviewQuestions(output: unknown): Pick<MockInterviewQuestion, 'category' | 'focus' | 'question' | 'ideal_answer_points'>[] {
  const questions = (output as { questions: unknown[] }).questions
  return questions.map((item) => {
    const q = item as Record<string, unknown>
    return {
      category: q.category as InterviewQuestionCategory,
      focus: String(q.focus).trim(),
      question: String(q.question).trim(),
      ideal_answer_points: (q.ideal_answer_points as string[]).map((p) => p.trim()).filter(Boolean).slice(0, 4),
    }
  })
}

export function validateMockInterviewFeedback(output: unknown): string[] {
  if (!isRecord(output)) return ['output: expected object']
  const failures: string[] = []
  if (!score(output.score)) failures.push('score: expected 0-100 number')
  if (!nonEmptyString(output.feedback)) failures.push('feedback: expected string')
  if (!nonEmptyString(output.better_answer)) failures.push('better_answer: expected string')
  if (output.follow_up !== null && output.follow_up !== undefined && typeof output.follow_up !== 'string') {
    failures.push('follow_up: expected string or null')
  }
  return failures
}

export function normalizeMockInterviewFeedback(output: unknown): {
  score: number
  feedback: string
  better_answer: string
  follow_up: string | null
} {
  const o = output as Record<string, unknown>
  const follow = nonEmptyString(o.follow_up) ? o.follow_up.trim() : null
  return {
    score: Math.round(Number(o.score)),
    feedback: String(o.feedback).trim(),
    better_answer: String(o.better_answer).trim(),
    follow_up: follow,
  }
}

export function validateMockInterviewReport(output: unknown): string[] {
  if (!isRecord(output)) return ['output: expected object']
  const failures: string[] = []
  for (const key of ['overall_score', 'technical_score', 'role_fit_score', 'gulf_readiness_score', 'answer_structure_score']) {
    if (!score(output[key])) failures.push(`${key}: expected 0-100 number`)
  }
  for (const key of ['strengths', 'weak_points', 'risky_answers', 'improvement_plan', 'next_practice_questions']) {
    const min = key === 'risky_answers' ? 0 : 1
    if (!strings(output[key], min, 5)) failures.push(`${key}: expected ${min}-5 strings`)
  }
  return failures
}

export function normalizeMockInterviewReport(output: unknown): MockInterviewFinalReport {
  const o = output as Record<string, unknown>
  const arr = (key: string) => ((o[key] as string[] | undefined) ?? []).map((s) => s.trim()).filter(Boolean).slice(0, 5)
  return {
    overall_score: Math.round(Number(o.overall_score)),
    technical_score: Math.round(Number(o.technical_score)),
    role_fit_score: Math.round(Number(o.role_fit_score)),
    gulf_readiness_score: Math.round(Number(o.gulf_readiness_score)),
    answer_structure_score: Math.round(Number(o.answer_structure_score)),
    strengths: arr('strengths'),
    weak_points: arr('weak_points'),
    risky_answers: arr('risky_answers'),
    improvement_plan: arr('improvement_plan'),
    next_practice_questions: arr('next_practice_questions'),
  }
}
