/**
 * Job Match engine types (TASK-071, docs/GCC_READINESS_JOB_MATCH.md §10-13).
 *
 * The founder's own pipeline (§11): resume → candidate profile, JD →
 * structured job profile, then requirement/evidence mapping → deterministic
 * scoring → LLM semantic analysis → final score + human-readable
 * explanation. These types mirror that split deliberately: a category is
 * either DETERMINISTIC (computed by lib/jobMatch/requirementMapping.ts, a
 * pure function, no AI) or SEMANTIC (scored by lib/ai/jobMatchExplanation.ts,
 * which also writes the "why" text for every category, including the
 * deterministic ones — but is never allowed to change a deterministic
 * category's number; see that file's validator).
 *
 * SCORING IS INTERIM. §38 of the founder's spec explicitly says exact
 * category weights are supplied separately and must not be invented — every
 * applicable category is equally weighted for now (see
 * lib/jobMatch/requirementMapping.ts's combineScores). `scoring_version`
 * exists so a future re-weighting doesn't silently reinterpret an old,
 * already-shown result (§35 "Analysis Versioning" — do not overwrite
 * historical results' meaning out from under them).
 *
 * Company/Project/Environment Relevance (§10) is DELIBERATELY NOT a
 * category here — there is no structured data source for "similar company"
 * and the spec itself warns against making same-company experience a
 * universal requirement. Flag to the founder if this is wanted; it needs
 * its own design (what counts as "similar"?), not a guessed heuristic.
 */

import type { TargetCountry } from './careerProfile'

// ---- Structured Job Profile (extracted from a raw job description) --------

export interface StructuredJobProfile {
  job_title: string | null
  required_skills: string[]
  preferred_skills: string[]
  responsibilities: string[]
  /** Total years of experience the JD asks for, if stated. Not "relevant" years — see requirementMapping.ts for that distinction. */
  required_experience_years: number | null
  /** Free-text industry as stated/implied by the JD — not forced into PERSONA_INDUSTRIES, that mapping happens in requirementMapping.ts. */
  industry: string | null
  gcc_experience_required: boolean
  gcc_experience_preferred: boolean
  /** Specific GCC countries the JD names, if any. Empty = not country-specific. */
  target_countries: TargetCountry[]
  education_requirements: string[]
  certification_requirements: string[]
  driving_license_required: boolean
}

// ---- Per-category result ----------------------------------------------------

export type JobMatchCategoryKey =
  | 'summary_match'
  | 'career_relevance'
  | 'required_skills'
  | 'industry_match'
  | 'experience_level'
  | 'gcc_experience'
  | 'education'
  | 'certifications'
  | 'driving_license'

/** Categories scored by lib/jobMatch/requirementMapping.ts — pure, deterministic, no AI. */
export const DETERMINISTIC_CATEGORIES: readonly JobMatchCategoryKey[] = [
  'required_skills',
  'experience_level',
  'gcc_experience',
  'education',
  'certifications',
  'driving_license',
]

/** Categories scored by lib/ai/jobMatchExplanation.ts — inherently semantic judgments (does this text communicate that need?), not string-matchable. */
export const SEMANTIC_CATEGORIES: readonly JobMatchCategoryKey[] = [
  'summary_match',
  'career_relevance',
  'industry_match',
]

export interface JobMatchCategoryResult {
  score: number // 0-100
  /** false = excluded from overall_score entirely — e.g. driving_license when the JD never mentions one (spec: absence must not become a negative). */
  applicable: boolean
  /** Concrete facts the score is based on, e.g. "3 of 5 required skills found: X, Y, Z". Always present, even before the LLM explanation layer runs — this is what makes the deterministic half auditable on its own. */
  evidence: string[]
  /** Human-readable "why", filled in by the LLM layer. Empty string until that runs. */
  explanation: string
}

export interface JobMatchResult {
  overall_score: number
  categories: Record<JobMatchCategoryKey, JobMatchCategoryResult>
  /** The "Ohhh moment" — the single most important thing to know, per §13. Filled by the LLM layer. */
  diagnosis: string
  /** Bump on any change to category set or combination logic — never reinterpret an old stored result silently (§35). */
  scoring_version: string
}

export const JOB_MATCH_SCORING_VERSION = 'v1-interim-equal-weight'
