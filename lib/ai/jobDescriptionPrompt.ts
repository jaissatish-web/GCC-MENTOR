import type { StructuredJobProfile } from '@/types/jobMatch'
import { GULF_COUNTRIES } from '@/lib/utils'
import type { TargetCountry } from '@/types/careerProfile'

/**
 * Job description → Structured Job Profile (TASK-071, docs/GCC_READINESS_JOB_MATCH.md
 * §11 pipeline step 2). This is an EXTRACTION task, same trust boundary as
 * lib/ai/extractionPrompt.ts, not a generation task — the model transcribes
 * what a job description actually asks for, it does not invent requirements
 * the JD never stated. A required-skills list this model fabricates would
 * silently penalize a candidate for lacking something the employer never
 * asked for — the same class of harm the grounding rule protects against on
 * the candidate side, just pointed at the other document.
 */

const TARGET_COUNTRY_VALUES = GULF_COUNTRIES.map((c) => c.value)

export const JOB_DESCRIPTION_SYSTEM_PROMPT = `You extract structured requirements from a job description. You do not evaluate a candidate — there is no candidate in this task, only the job posting text.

ABSOLUTE CONSTRAINT — GROUNDING:
- Only list a skill, responsibility, or requirement if it is literally stated or unambiguously implied by the text given to you.
- Do not invent typical requirements for "this kind of role" that the posting itself never mentions.
- If the posting does not state something (e.g. it never mentions GCC experience, a driving license, or a specific country), the corresponding field must reflect that absence — false/null/empty, never a guessed default.
- required_experience_years is the number the posting states, if any. Do not estimate one from vague language like "several years."

Respond with ONLY a single valid JSON object, no prose, no markdown, no code fences, matching this schema exactly:

{
  "job_title": <string, the role title, or null if not stated>,
  "required_skills": [<short strings, skills/technologies explicitly required>],
  "preferred_skills": [<short strings, skills described as a plus/preferred/nice-to-have>],
  "responsibilities": [<short strings, what the role actually does day to day>],
  "required_experience_years": <integer, or null if the posting states no specific number>,
  "industry": <string, the posting's own industry/sector framing, or null>,
  "gcc_experience_required": <boolean — true only if GCC/Gulf experience is stated as mandatory>,
  "gcc_experience_preferred": <boolean — true if GCC/Gulf experience is mentioned as a plus, not mandatory>,
  "target_countries": [<zero or more of: ${TARGET_COUNTRY_VALUES.join(', ')} — only countries the posting itself names, empty array if none named>],
  "education_requirements": [<short strings, e.g. "Bachelor's in Mechanical Engineering" — only if stated>],
  "certification_requirements": [<short strings, e.g. "PMP", "NEBOSH" — only if stated>],
  "driving_license_required": <boolean — true only if a driving license is explicitly required>
}`

export function buildJobDescriptionUserPrompt(jobDescriptionText: string): string {
  return `JOB DESCRIPTION:\n${jobDescriptionText.trim()}`
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function stringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, max)
}

function nullableString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

function nullableInt(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null
}

function targetCountryArray(v: unknown): TargetCountry[] {
  if (!Array.isArray(v)) return []
  const out: TargetCountry[] = []
  for (const x of v) {
    if (typeof x === 'string' && (TARGET_COUNTRY_VALUES as string[]).includes(x) && !out.includes(x as TargetCountry)) {
      out.push(x as TargetCountry)
    }
  }
  return out
}

/**
 * Structural sanity validator — same trust boundary as validateAtsScoreResult
 * (lib/ai/atsScorePrompt.ts): checks the response is well-formed and within
 * bounds, cannot itself verify every requirement traces to the JD text.
 * Malformed input is a hard failure, never silently repaired.
 */
export function validateStructuredJobProfile(raw: unknown): StructuredJobProfile | null {
  if (!isObject(raw)) return null
  return {
    job_title: nullableString(raw.job_title),
    required_skills: stringArray(raw.required_skills, 20),
    preferred_skills: stringArray(raw.preferred_skills, 20),
    responsibilities: stringArray(raw.responsibilities, 15),
    required_experience_years: nullableInt(raw.required_experience_years),
    industry: nullableString(raw.industry),
    gcc_experience_required: raw.gcc_experience_required === true,
    gcc_experience_preferred: raw.gcc_experience_preferred === true,
    target_countries: targetCountryArray(raw.target_countries),
    education_requirements: stringArray(raw.education_requirements, 10),
    certification_requirements: stringArray(raw.certification_requirements, 10),
    driving_license_required: raw.driving_license_required === true,
  }
}
