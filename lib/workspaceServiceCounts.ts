import type { Package, PackageServiceEventType } from '@/types/package'

type WorkspaceServiceData = Partial<Pick<Package,
  'service_events' | 'cover_letters' | 'interview_questions' | 'interview_question_sets' | 'mock_interview_runs'
>>

/** Lifetime usage for this workspace, with saved-output fallbacks for older CVs. */
export function workspaceServiceCounts(pkg: WorkspaceServiceData) {
  const events = Array.isArray(pkg.service_events) ? pkg.service_events : []
  const count = (type: PackageServiceEventType) => events.filter(event => event.type === type).length
  return {
    coverLetters: Math.max(count('cover_letter_generated'), pkg.cover_letters?.length ?? 0),
    qaSets: Math.max(count('qa_generated'), pkg.interview_question_sets?.length ?? 0, pkg.interview_questions?.questions?.length ? 1 : 0),
    mockInterviews: Math.max(count('mock_interview_started'), count('mock_interview_completed'), pkg.mock_interview_runs?.length ?? 0),
  }
}
