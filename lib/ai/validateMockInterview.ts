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
  if (!nonEmptyString(output.executive_summary)) failures.push('executive_summary: expected string')
  if (!nonEmptyString(output.priority_focus)) failures.push('priority_focus: expected string')
  if (!isRecord(output.score_explanations)) failures.push('score_explanations: expected object')
  else for (const key of ['technical', 'role_fit', 'gulf_readiness', 'answer_structure']) {
    if (!nonEmptyString(output.score_explanations[key])) failures.push(`score_explanations.${key}: expected string`)
  }
  return failures
}

const REPORT_SCORE_KEYS = ['overall_score', 'technical_score', 'role_fit_score', 'gulf_readiness_score', 'answer_structure_score'] as const

/**
 * A report written on the answers' 10-point scale (2026-10-03: overall 2 for
 * answers scored 3/10 — the user would read "2/100"). When every report score
 * is 10 or less while the answers averaged 2/10 or more, the report used the
 * wrong scale and is multiplied by ten. A real 0–100 report that low would
 * contradict the answers it summarises.
 */
export function onHundredScale(output: unknown, answerScores: number[]): unknown {
  if (!isRecord(output) || answerScores.length === 0) return output
  const mean = answerScores.reduce((a, b) => a + b, 0) / answerScores.length
  const tenScale = REPORT_SCORE_KEYS.every((k) => typeof output[k] === 'number' && (output[k] as number) <= 10)
  if (!tenScale || mean < 2) return output
  const scaled: Record<string, unknown> = { ...output }
  for (const k of REPORT_SCORE_KEYS) scaled[k] = Math.min(100, (output[k] as number) * 10)
  return scaled
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
    executive_summary: nonEmptyString(o.executive_summary) ? o.executive_summary.trim() : undefined,
    priority_focus: nonEmptyString(o.priority_focus) ? o.priority_focus.trim() : undefined,
    score_explanations: isRecord(o.score_explanations) ? {
      technical: String(o.score_explanations.technical ?? '').trim(),
      role_fit: String(o.score_explanations.role_fit ?? '').trim(),
      gulf_readiness: String(o.score_explanations.gulf_readiness ?? '').trim(),
      answer_structure: String(o.score_explanations.answer_structure ?? '').trim(),
    } : undefined,
  }
}
