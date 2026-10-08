import { buildCareerProfileResume } from '@/lib/careerProfileResume'
import type { CareerProfileFull } from '@/types/careerProfile'

/** Names and target-job metadata are never evidence for a profile-only service. */
export function careerProfileServiceContext(profile: CareerProfileFull) {
  const latestRole = [...(profile.work_experience ?? [])]
    .sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? '') || a.sort_order - b.sort_order)
    .find((role) => role.role?.trim())?.role
  return {
    resume: buildCareerProfileResume(profile),
    target: {
      target_job_title: profile.target_job_title?.trim() || latestRole?.trim() || 'Career opportunities',
      target_company: null,
      target_country: null,
      target_industry: null,
    },
    jobDescription: null,
  }
}

export const PROFILE_ONLY_SERVICE_RULE =
  'PROFILE-ONLY PREPARATION: No vacancy, employer or job description is supplied. ' +
  'Act as a hiring specialist for the professional field evidenced by the candidate’s saved profile and resume. ' +
  'Use their real roles, duties, skills, education and achievements only. ' +
  'Do not invent a vacancy, company requirement, certification, employer interest or candidate achievement. ' +
  'Do not treat the user’s custom resume name as their profession. ' +
  'Keep missing facts as honest placeholders; a practice scenario must be clearly hypothetical.'
