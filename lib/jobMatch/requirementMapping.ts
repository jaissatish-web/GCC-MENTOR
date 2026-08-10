import type { StructuredJobProfile, JobMatchCategoryResult, JobMatchCategoryKey } from '@/types/jobMatch'
import { DETERMINISTIC_CATEGORIES, JOB_MATCH_SCORING_VERSION } from '@/types/jobMatch'
import type { TargetCountry } from '@/types/careerProfile'

/**
 * Deterministic requirement/evidence mapping (TASK-071, docs/GCC_READINESS_JOB_MATCH.md
 * §11 pipeline steps 3-4). Pure function, no AI, no database access — same
 * standard as lib/readiness.ts and lib/employmentGaps.ts. Same candidate +
 * same job description must always produce the same numbers (spec §6's
 * requirement for GCC Readiness applies equally here: "Do NOT let the LLM
 * randomly generate the final score").
 *
 * SCORING IS INTERIM — see types/jobMatch.ts's header. The matching itself
 * (skill/education/certification overlap) is deliberately simple
 * case-insensitive substring matching, not real NLP — good enough to be
 * directionally correct and fully reproducible, not claimed to be precise.
 * lib/ai/jobMatchExplanation.ts's semantic layer is where genuine judgment
 * calls belong; this file only ever compares strings and dates.
 *
 * Decoupled from CareerProfileDraft/CareerProfileFull on purpose — accepts a
 * small purpose-built shape (JobMatchProfileInput) so this module doesn't
 * have to reason about which optional fields a draft vs a saved profile
 * happens to carry. The caller (the route handler) adapts whichever shape
 * it has.
 */

export interface JobMatchWorkExperienceInput {
  role: string
  startDate: string | null
  endDate: string | null // null = current/ongoing
  description: string | null
  highlights: string[]
  gccCountry: TargetCountry | null
}

export interface JobMatchProfileInput {
  professionalSummary: string | null
  workExperience: JobMatchWorkExperienceInput[]
  skillNames: string[]
  certificationNames: string[]
  educationEntries: Array<{ degree: string; fieldOfStudy: string | null }>
  /** null covers BOTH "not yet answered" (a real profile) and "unknown" (an anonymous draft, which has no such field at all) — scoring treats them identically: never a confirmed negative. */
  hasDrivingLicense: boolean | null
}

function norm(s: string): string {
  return s.toLowerCase().trim()
}

/** Case-insensitive substring match, either direction — deliberately simple, see file header. */
function fuzzyMatch(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return false
  return na.includes(nb) || nb.includes(na)
}

function anyFuzzyMatch(needle: string, haystack: string[]): boolean {
  return haystack.some((h) => fuzzyMatch(needle, h))
}

function yearsBetween(start: string, end: string): number {
  const startMs = new Date(start).getTime()
  const endMs = new Date(end).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || endMs <= startMs) return 0
  return (endMs - startMs) / (1000 * 60 * 60 * 24 * 365.25)
}

/**
 * Total years worked, summed per entry. Concurrent roles (two overlapping
 * entries) double-count their overlap — a known, accepted limitation for
 * this interim version rather than the interval-merge lib/employmentGaps.ts
 * uses, since double-counting a genuinely-concurrent second job is a much
 * rarer and lower-stakes edge case here than the false-gap risk that made
 * merging necessary there.
 */
function computeExperienceYears(
  work: JobMatchWorkExperienceInput[],
  relevantTo: string[], // job's required_skills + responsibilities, for the "relevant" subset
): { totalYears: number; relevantYears: number } {
  const nowIso = new Date().toISOString()
  let totalYears = 0
  let relevantYears = 0

  for (const w of work) {
    if (!w.startDate) continue
    const end = w.endDate ?? nowIso
    const duration = yearsBetween(w.startDate, end)
    totalYears += duration

    const text = [w.role, w.description ?? '', ...w.highlights].join(' ')
    const isRelevant = relevantTo.length === 0 || relevantTo.some((r) => fuzzyMatch(text, r))
    if (isRelevant) relevantYears += duration
  }

  return { totalYears: Math.round(totalYears * 10) / 10, relevantYears: Math.round(relevantYears * 10) / 10 }
}

function requiredSkillsCategory(profile: JobMatchProfileInput, job: StructuredJobProfile): JobMatchCategoryResult {
  const requiredTotal = job.required_skills.length
  const preferredTotal = job.preferred_skills.length
  if (requiredTotal === 0 && preferredTotal === 0) {
    return { score: 0, applicable: false, evidence: [], explanation: '' }
  }

  const matchedRequired = job.required_skills.filter((s) => anyFuzzyMatch(s, profile.skillNames))
  const matchedPreferred = job.preferred_skills.filter((s) => anyFuzzyMatch(s, profile.skillNames))
  const missingRequired = job.required_skills.filter((s) => !matchedRequired.includes(s))

  const requiredPct = requiredTotal > 0 ? matchedRequired.length / requiredTotal : 1
  const preferredPct = preferredTotal > 0 ? matchedPreferred.length / preferredTotal : 1
  const score = requiredTotal > 0
    ? Math.round(requiredPct * 85 + preferredPct * 15)
    : Math.round(preferredPct * 100)

  const evidence: string[] = []
  if (requiredTotal > 0) evidence.push(`${matchedRequired.length} of ${requiredTotal} required skills found: ${matchedRequired.join(', ') || 'none'}`)
  if (missingRequired.length > 0) evidence.push(`Missing required skills: ${missingRequired.join(', ')}`)
  if (preferredTotal > 0) evidence.push(`${matchedPreferred.length} of ${preferredTotal} preferred skills found: ${matchedPreferred.join(', ') || 'none'}`)

  return { score, applicable: true, evidence, explanation: '' }
}

function experienceLevelCategory(profile: JobMatchProfileInput, job: StructuredJobProfile): JobMatchCategoryResult {
  if (job.required_experience_years === null) {
    return { score: 0, applicable: false, evidence: [], explanation: '' }
  }
  const relevantTo = [...job.required_skills, ...job.responsibilities]
  const { totalYears, relevantYears } = computeExperienceYears(profile.workExperience, relevantTo)
  const required = job.required_experience_years

  const score = required > 0 ? Math.min(100, Math.round((relevantYears / required) * 100)) : 100
  return {
    score,
    applicable: true,
    evidence: [
      `${totalYears} total years of experience, ${relevantYears} years in roles matching this job's skills/responsibilities`,
      `Job asks for ${required} years`,
    ],
    explanation: '',
  }
}

function gccExperienceCategory(profile: JobMatchProfileInput, job: StructuredJobProfile): JobMatchCategoryResult {
  const cares = job.gcc_experience_required || job.gcc_experience_preferred || job.target_countries.length > 0
  if (!cares) {
    return { score: 0, applicable: false, evidence: [], explanation: '' }
  }

  const gccEntries = profile.workExperience.filter((w) => w.gccCountry !== null)
  const hasGcc = gccEntries.length > 0
  const countryMatch = job.target_countries.length === 0
    ? hasGcc
    : gccEntries.some((w) => w.gccCountry !== null && job.target_countries.includes(w.gccCountry))

  let score: number
  if (job.gcc_experience_required) {
    score = !hasGcc ? 0 : countryMatch ? 100 : 70
  } else {
    // preferred only, or only a specific country named without "required"
    score = hasGcc ? (countryMatch ? 100 : 85) : 60
  }

  const evidence = [
    hasGcc
      ? `GCC experience found: ${gccEntries.map((w) => `${w.role} (${w.gccCountry})`).join(', ')}`
      : 'No GCC-tagged work experience found on the profile',
  ]
  if (job.target_countries.length > 0) evidence.push(`Job targets: ${job.target_countries.join(', ')}`)

  return { score, applicable: true, evidence, explanation: '' }
}

function educationCategory(profile: JobMatchProfileInput, job: StructuredJobProfile): JobMatchCategoryResult {
  if (job.education_requirements.length === 0) {
    return { score: 0, applicable: false, evidence: [], explanation: '' }
  }
  const candidateText = profile.educationEntries.map((e) => `${e.degree} ${e.fieldOfStudy ?? ''}`)
  const matched = job.education_requirements.filter((req) => candidateText.some((c) => fuzzyMatch(c, req)))
  const score = Math.round((matched.length / job.education_requirements.length) * 100)
  return {
    score,
    applicable: true,
    evidence: [`${matched.length} of ${job.education_requirements.length} education requirements matched: ${matched.join(', ') || 'none'}`],
    explanation: '',
  }
}

function certificationsCategory(profile: JobMatchProfileInput, job: StructuredJobProfile): JobMatchCategoryResult {
  if (job.certification_requirements.length === 0) {
    return { score: 0, applicable: false, evidence: [], explanation: '' }
  }
  const matched = job.certification_requirements.filter((req) => anyFuzzyMatch(req, profile.certificationNames))
  const score = Math.round((matched.length / job.certification_requirements.length) * 100)
  return {
    score,
    applicable: true,
    evidence: [`${matched.length} of ${job.certification_requirements.length} required certifications found: ${matched.join(', ') || 'none'}`],
    explanation: '',
  }
}

function drivingLicenseCategory(profile: JobMatchProfileInput, job: StructuredJobProfile): JobMatchCategoryResult {
  if (!job.driving_license_required) {
    return { score: 0, applicable: false, evidence: [], explanation: '' }
  }
  if (profile.hasDrivingLicense === true) {
    return { score: 100, applicable: true, evidence: ['Driving license confirmed on profile'], explanation: '' }
  }
  if (profile.hasDrivingLicense === false) {
    return { score: 0, applicable: true, evidence: ['Profile states no driving license'], explanation: '' }
  }
  // null: genuinely unknown — partial credit, not a confirmed fail (spec: absence must not automatically become a major negative).
  return { score: 40, applicable: true, evidence: ['Driving license not specified on profile — not confirmed either way'], explanation: '' }
}

/**
 * Runs every deterministic category. Returns a partial map — the semantic
 * categories (summary_match, career_relevance, industry_match) are the
 * caller's responsibility via lib/ai/jobMatchExplanation.ts.
 */
export function computeDeterministicCategories(
  profile: JobMatchProfileInput,
  job: StructuredJobProfile,
): Partial<Record<JobMatchCategoryKey, JobMatchCategoryResult>> {
  return {
    required_skills: requiredSkillsCategory(profile, job),
    experience_level: experienceLevelCategory(profile, job),
    gcc_experience: gccExperienceCategory(profile, job),
    education: educationCategory(profile, job),
    certifications: certificationsCategory(profile, job),
    driving_license: drivingLicenseCategory(profile, job),
  }
}

/**
 * Combines every APPLICABLE category into one overall score. Equal weight
 * across whatever categories actually apply — interim, see types/jobMatch.ts.
 * A category with applicable: false contributes nothing, positive or
 * negative (the entire point of marking driving_license/education/etc.
 * inapplicable when the JD never raised them).
 */
export function combineJobMatchScore(categories: Record<JobMatchCategoryKey, JobMatchCategoryResult>): number {
  const applicableScores = Object.values(categories)
    .filter((c) => c.applicable)
    .map((c) => c.score)
  if (applicableScores.length === 0) return 0
  return Math.round(applicableScores.reduce((sum, s) => sum + s, 0) / applicableScores.length)
}

export { DETERMINISTIC_CATEGORIES, JOB_MATCH_SCORING_VERSION }
