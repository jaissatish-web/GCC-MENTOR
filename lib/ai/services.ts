/**
 * THE SERVICE REGISTRY — one list, and the only one.
 *
 * This list used to live in three places: the admin AI-provider screen, the
 * provider config's known-keys set, and the control layer. Adding a service meant
 * remembering all three, and the service-package admin screen carries a warning on
 * its own face about what happens when they drift — "a typo means the quota
 * silently never matches any route", i.e. a customer buys credits that never work.
 *
 * A service key is used, unchanged, as all of:
 *   - the AI provider config key   (which model runs it, set in /admin)
 *   - the prompt key               (which prompt version it runs on)
 *   - the service key on a package (how many of it a bundle includes)
 *
 * They are deliberately the same string. One name per service means a typo is a
 * type error rather than a silent mismatch discovered by a paying customer.
 *
 * `built: false` means the service is configured but has no call site yet. Those
 * rows exist so a service can be switched on without a migration, and every screen
 * that lists them must say so rather than implying they work.
 */

export const AI_SERVICES = {
  extraction: { label: 'Resume Parsing', built: true, description: 'Reads an uploaded or pasted resume into structured profile data.' },
  optimization: { label: 'Resume Optimization', built: true, description: 'Rewrites a resume for one target job, using only facts already in the profile.' },
  ats_scan: { label: 'ATS / GCC Scanner', built: true, description: 'Scores a resume for GCC readiness.' },
  job_description: { label: 'Job Description Structuring', built: true, description: 'Turns a pasted job advert into structured requirements.' },
  job_match_explanation: { label: 'Job Match Explanation', built: true, description: 'The semantic half of Job Match — why each category scored as it did.' },
  cover_letter: { label: 'Cover Letter', built: true, description: 'Writes a cover letter for a resume package.' },
  qa_generation: { label: 'Interview Q&A', built: false, description: 'Planned interview preparation. No route calls this yet.' },
  mock_interview: { label: 'Mock Interview', built: false, description: 'Planned mock-interview review. No route calls this yet.' },
} as const

export type ServiceKey = keyof typeof AI_SERVICES

export const SERVICE_KEYS = Object.keys(AI_SERVICES) as ServiceKey[]

export function isServiceKey(v: unknown): v is ServiceKey {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(AI_SERVICES, v)
}

/**
 * Token budgets per service.
 *
 * REASONING MODELS SPEND THIS BUDGET BEFORE WRITING ANYTHING. The configured
 * default is one, and an under-budgeted call comes back with a populated
 * `reasoning` field and null content — which reads like a refusal and is not one.
 * The provider layer reports that case properly; these numbers exist so it happens
 * less often.
 */
export const TOKEN_BUDGET: Record<ServiceKey, number> = {
  extraction: 8000,
  optimization: 8000,
  ats_scan: 4000,
  job_description: 3000,
  job_match_explanation: 3000,
  cover_letter: 4000,
  qa_generation: 4000,
  mock_interview: 4000,
}
