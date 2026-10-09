import type { MockInterviewFinalReport, MockInterviewRun } from '@/types/package'

export type InterviewAttempt = Pick<MockInterviewRun, 'id' | 'generated_at' | 'completed_at' | 'input_mode' | 'resume_fingerprint' | 'rubric_version' | 'mode' | 'difficulty' | 'question_count' | 'status' | 'final_report'>
export const INTERVIEW_METRICS = [
  { key: 'overall_score', label: 'Overall' },
  { key: 'technical_score', label: 'Technical knowledge' },
  { key: 'role_fit_score', label: 'Role fit' },
  { key: 'gulf_readiness_score', label: 'Gulf readiness' },
  { key: 'answer_structure_score', label: 'Answer structure' },
] as const

export function orderedAttempts<T extends InterviewAttempt>(runs: T[]): T[] {
  return runs.slice().sort((a, b) => (a.generated_at ?? '').localeCompare(b.generated_at ?? '') || a.id.localeCompare(b.id))
}

function validReport(report: MockInterviewFinalReport | null | undefined): report is MockInterviewFinalReport {
  return Boolean(report && INTERVIEW_METRICS.every(({ key }) => typeof report[key] === 'number' && Number.isFinite(report[key]) && report[key] >= 0 && report[key] <= 100))
}

export function comparableAttempts(a: InterviewAttempt, b: InterviewAttempt): boolean {
  // Older text interviews have no frozen-resume identity. Do not claim a verified trend.
  return Boolean(a.resume_fingerprint && a.rubric_version &&
    a.resume_fingerprint === b.resume_fingerprint && a.rubric_version === b.rubric_version &&
    (a.input_mode ?? 'text') === (b.input_mode ?? 'text') && a.mode === b.mode &&
    a.difficulty === b.difficulty && a.question_count === b.question_count)
}

export function interviewProgress(runs: InterviewAttempt[], selectedId?: string) {
  const all = orderedAttempts(runs)
  const selected = selectedId ? all.find(r => r.id === selectedId) : all.filter(r => r.status === 'completed' && validReport(r.final_report)).at(-1)
  if (!selected || selected.status !== 'completed' || !validReport(selected.final_report)) return null
  const position = all.findIndex(r => r.id === selected.id)
  const earlier = all.slice(0, position).filter(r => r.status === 'completed' && validReport(r.final_report) && comparableAttempts(selected, r))
  const previous = earlier.at(-1)
  const first = earlier[0]
  const report = selected.final_report
  return {
    selectedId: selected.id, generatedAt: selected.generated_at, attemptNumber: position + 1, totalAttempts: all.length,
    mode: selected.mode, difficulty: selected.difficulty, questionCount: selected.question_count,
    previousNumber: previous ? all.findIndex(r => r.id === previous.id) + 1 : null,
    comparableCount: earlier.length + 1,
    timeline: all.slice(0, position + 1).flatMap((attempt, index) => {
      if (attempt.status !== 'completed' || !validReport(attempt.final_report)) return []
      return [{ id: attempt.id, number: index + 1,
        comparable: attempt.id === selected.id || comparableAttempts(selected, attempt),
        scores: Object.fromEntries(INTERVIEW_METRICS.map(({ key }) => [key, attempt.final_report![key]])) as Record<typeof INTERVIEW_METRICS[number]['key'], number> }]
    }),
    metrics: INTERVIEW_METRICS.map(({ key, label }) => ({ key, label, score: report[key],
      previous: previous?.final_report?.[key] ?? null,
      delta: previous?.final_report ? report[key] - previous.final_report[key] : null,
      fromFirst: first?.final_report ? report[key] - first.final_report[key] : null })),
    nextSteps: report.improvement_plan.slice(0, 3),
  }
}

export type InterviewProgress = NonNullable<ReturnType<typeof interviewProgress>>
export interface ResumeInterviewProgress { packageId: string; progress: InterviewProgress }
