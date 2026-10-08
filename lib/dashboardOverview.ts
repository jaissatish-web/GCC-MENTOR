import type { PackageStatus } from '@/types/package'
import type { NextAction } from '@/lib/nextAction'

/** Saved items across the whole account, never a page of documents. */
export interface DashboardOverview {
  resume_count: number
  profile_resume_count: number
  optimized_resume_count: number
  target_job_count: number
  draft_resume_count: number
  cover_letter_count: number
  qa_set_count: number
  mock_interview_count: number
  mock_completed_count: number
  mock_in_progress_count: number
  average_mock_score: number | null
  resumes_with_letter: number
  resumes_with_qa: number
  resumes_with_mock: number
  stages: Record<PackageStatus, number>
}

/** Keep the selected destination, but leave individual job names in the Library. */
export function dashboardNextAction(action: NextAction): NextAction {
  if (action.state === 'add_next_job') return { ...action, body: 'Each new target job reuses your saved Career Profile. Open your Resume Library to see all applications.' }
  const titles: Partial<Record<NextAction['state'], string>> = {
    job_unpaid: 'Continue your unfinished resume',
    job_not_generated: 'Finish your resume optimization',
    job_needs_letter: 'Write your next cover letter',
    job_needs_qa: 'Prepare your interview answers',
    job_needs_mock: 'Practise your next interview',
  }
  return titles[action.state] ? { ...action, title: titles[action.state]! } : action
}

export function coveragePercent(ready: number, total: number): number {
  return total > 0 ? Math.min(100, Math.max(0, Math.round(ready / total * 100))) : 0
}
