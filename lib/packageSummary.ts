import type { MockInterviewRun, Package, PackageStatus } from '@/types/package'

/**
 * One saved job as a LIST shows it (audit M08, migration 055).
 *
 * Lists — the Library, the dashboard, every service's job picker — need who the
 * job is for, its stage and what it already has. They never need the CV text,
 * the letters, the 25 answers or the interview transcripts, and fetching those
 * for every job made the Library slower and heavier with each job saved.
 * Summaries carry flags and counts instead; a screen loads the full package
 * (GET /api/packages/[id]) only for the job it opens.
 *
 * The helpers below answer the same questions for a summary OR a full package,
 * so shared logic (lib/nextAction.ts, the preparation journey) works with both.
 * Client-safe: no server imports.
 */
export interface PackageSummary {
  id: string
  profile_id: string
  name: string | null
  target_job_title: string
  target_company: string | null
  target_country: Package['target_country']
  target_industry: string | null
  status: PackageStatus
  optimization_level: Package['optimization_level']
  template_id: string | null
  is_paid: boolean
  created_at: string
  updated_at: string | null
  job_url: string | null
  application_deadline: string | null
  interview_date: string | null
  application_notes: string | null
  has_resume: boolean
  cover_letter_count: number
  qa_question_count: number
  /** The newest mock run with a saved report, if any. */
  mock_completed_run_id: string | null
  mock_in_progress: boolean
}

export type PackageListItem = Package | PackageSummary

export interface PackageListPage {
  packages: PackageSummary[]
  /** Pass back as `before` + `before_id` for the next page; null on the last page. */
  next_cursor: { before: string; before_id: string } | null
  /** Per-stage counts across ALL of the user's jobs (only when `counts=1`). */
  counts?: Record<PackageStatus, number>
  total?: number
}

export function isSummary(p: PackageListItem): p is PackageSummary {
  return typeof (p as PackageSummary).has_resume === 'boolean'
}

export function cvReady(p: PackageListItem): boolean {
  return isSummary(p) ? p.has_resume : p.optimized_content != null
}

export function letterCount(p: PackageListItem): number {
  if (isSummary(p)) return p.cover_letter_count
  return Array.isArray(p.cover_letters) ? p.cover_letters.length : 0
}

export function qaReady(p: PackageListItem): boolean {
  return isSummary(p) ? p.qa_question_count > 0 : Boolean(p.interview_questions?.questions?.length)
}

function latestCompletedRun(runs: MockInterviewRun[] | null | undefined): MockInterviewRun | null {
  return (
    [...(runs ?? [])]
      .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
      .find((run) => run.status === 'completed' && run.final_report) ?? null
  )
}

/** Id of the newest mock run with a saved report, or null. */
export function completedReportRunId(p: PackageListItem): string | null {
  return isSummary(p) ? p.mock_completed_run_id : latestCompletedRun(p.mock_interview_runs)?.id ?? null
}

/**
 * A mock interview has been finished for this job. For a full package this is
 * exactly the rule lib/nextAction.ts always used (any run marked completed);
 * a summary reports the newest completed run, which always carries its report.
 */
export function mockDone(p: PackageListItem): boolean {
  if (isSummary(p)) return p.mock_completed_run_id !== null
  return Boolean(p.mock_interview_runs?.some((run) => run.status === 'completed'))
}

/** Every stage at zero — the shape the Library's stage strip counts into. */
export function emptyStageCounts(): Record<PackageStatus, number> {
  return { saved: 0, applied: 0, shortlisted: 0, interview: 0, visa_processing: 0, offer: 0, rejected: 0, withdrawn: 0 }
}
