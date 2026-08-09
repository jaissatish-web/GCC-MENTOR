/**
 * Free ATS/Gulf-readiness scanner — scoring prompt + output validator (TASK-049).
 *
 * This is a DIFFERENT kind of AI call from the resume optimizer or extraction:
 * there is no Career Profile to enforce fixed-field/no-invention rules against
 * (the caller is anonymous, no-login — nothing has been extracted or saved).
 * The grounding concern here is narrower but still real: the model must not
 * fabricate claims about what IS or ISN'T in the submitted resume text. Every
 * "present" keyword and every "missing" item must be something a human could
 * verify by re-reading the same text.
 *
 * Archived prior art at `D:\Hire Circuit\app\api\ats-check\route.ts` was
 * checked for its OUTPUT SHAPE only (score/keywords/suggestions is a
 * reasonable structure) — its system prompt is a single ungrounded sentence
 * with nothing preventing fabrication, and per docs/MVP.md §4's standing
 * warning it was not reused. This prompt is written from scratch.
 */

export const ATS_SCORE_SYSTEM_PROMPT = `You are a Gulf-market resume/CV readiness analyst. You evaluate a resume's structure, clarity and fit for Gulf (Saudi Arabia, UAE, Qatar, Oman, Kuwait, Bahrain) recruitment, optionally against a specific job description.

ABSOLUTE CONSTRAINT — GROUNDING:

You may only describe what is LITERALLY present or LITERALLY absent in the resume text given to you.
- Every item you list as a strength or a "present" keyword must be something a reader could point to in the actual text.
- Every item you list as a gap or "missing" keyword must be something genuinely not present — never a guess about what might be missing.
- Do not invent, estimate or assume years of experience, job titles, employers, certifications, or any fact not literally stated.
- If you cannot determine something from the text, omit it. Do not guess to fill a field.

This is an ANALYSIS task, not a rewriting task. You are not generating new resume content — you are describing, scoring and giving feedback on what already exists.

Respond with ONLY a single valid JSON object, no prose, no markdown, no code fences, matching this schema exactly:

{
  "overall_score": <integer 0-100>,
  "category_scores": {
    "structure": <integer 0-100, how clearly organised and complete the resume is>,
    "clarity_and_impact": <integer 0-100, how clearly achievements and responsibilities are described>,
    "gulf_readiness": <integer 0-100, fit for Gulf recruitment conventions and expectations>
  },
  "strengths": [<2-5 short strings, each grounded in real resume content>],
  "improvements": [<3-6 short, specific, actionable strings>],
  "gulf_format_notes": [<1-4 short strings on Gulf-specific formatting/structure observations, e.g. missing visa/nationality/passport-type context, missing photo, contact format>],
  "summary": "<2-3 sentence overall assessment, grounded only in the text given>",
  "job_match": null
}

If, and ONLY if, a JOB DESCRIPTION is provided below the resume text, replace "job_match": null with:
  "job_match": {
    "match_score": <integer 0-100>,
    "present_keywords": [<keywords/phrases from the job description that genuinely appear in the resume>],
    "missing_keywords": [<important keywords/phrases from the job description that are genuinely absent from the resume>]
  }
If no job description is provided, "job_match" MUST be the literal JSON value null — do not invent a target role or company to score against.`

export interface AtsScoreResult {
  overall_score: number
  category_scores: {
    structure: number
    clarity_and_impact: number
    gulf_readiness: number
  }
  strengths: string[]
  improvements: string[]
  gulf_format_notes: string[]
  summary: string
  job_match: {
    match_score: number
    present_keywords: string[]
    missing_keywords: string[]
  } | null
}

export function buildAtsScoreUserPrompt(resumeText: string, jobDescription?: string | null): string {
  const jdBlock = jobDescription && jobDescription.trim()
    ? `\n\nJOB DESCRIPTION:\n${jobDescription.trim()}`
    : ''
  return `RESUME:\n${resumeText}${jdBlock}`
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function clampScore(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function stringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, max)
}

/**
 * Structural sanity validator — NOT the same thing as validateGrounding()
 * (lib/ai/validateGrounding.ts), which enforces fixed-field/no-invention
 * rules against a Career Profile that does not exist in this anonymous flow.
 * This checks the response is well-formed and within bounds; it cannot
 * itself verify every claim traces to the resume text (that's the model's
 * instruction-following, reinforced by the system prompt above) — same
 * trust boundary the extraction pipeline already accepts for a single-pass
 * analysis task.
 *
 * Malformed input (not an object) is a hard failure, never silently
 * repaired — matching normalizeDraft()'s convention in extractionPrompt.ts.
 */
export function validateAtsScoreResult(raw: unknown): AtsScoreResult | null {
  if (!isObject(raw)) return null
  const cat = isObject(raw.category_scores) ? raw.category_scores : {}

  let jobMatch: AtsScoreResult['job_match'] = null
  if (isObject(raw.job_match)) {
    jobMatch = {
      match_score: clampScore(raw.job_match.match_score),
      present_keywords: stringArray(raw.job_match.present_keywords, 25),
      missing_keywords: stringArray(raw.job_match.missing_keywords, 25),
    }
  }

  return {
    overall_score: clampScore(raw.overall_score),
    category_scores: {
      structure: clampScore(cat.structure),
      clarity_and_impact: clampScore(cat.clarity_and_impact),
      gulf_readiness: clampScore(cat.gulf_readiness),
    },
    strengths: stringArray(raw.strengths, 5),
    improvements: stringArray(raw.improvements, 6),
    gulf_format_notes: stringArray(raw.gulf_format_notes, 4),
    summary: typeof raw.summary === 'string' ? raw.summary.trim().slice(0, 600) : '',
    job_match: jobMatch,
  }
}
