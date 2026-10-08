import type { PackageSummary } from '@/lib/packageSummary'
import { completedReportRunId, letterCount, qaReady } from '@/lib/packageSummary'
import type { Package } from '@/types/package'

export const CAREER_RESUME_SUMMARY_SELECT = 'id, profile_id, tier, name, template_id, target_job_title, status, optimization_level, is_paid, created_at, updated_at, cover_letters, interview_questions, mock_interview_runs'

/** Called only after an owner-scoped read. Strip all document and transcript data. */
export function careerProfileResumeSummary(pkg: Package): PackageSummary {
  return {
    id: pkg.id, profile_id: pkg.profile_id, tier: 'free', name: pkg.name ?? null,
    template_id: pkg.template_id ?? null, target_job_title: pkg.target_job_title,
    target_company: null, target_country: null, target_industry: null,
    status: pkg.status, optimization_level: pkg.optimization_level, is_paid: pkg.is_paid,
    created_at: pkg.created_at, updated_at: pkg.updated_at ?? null,
    job_url: null, application_deadline: null, interview_date: null, application_notes: null,
    has_resume: true, cover_letter_count: letterCount(pkg),
    qa_question_count: qaReady(pkg) ? pkg.interview_questions!.questions.length : 0,
    mock_completed_run_id: completedReportRunId(pkg),
    mock_in_progress: Boolean(pkg.mock_interview_runs?.some((run) => run.status === 'in_progress')),
  }
}
