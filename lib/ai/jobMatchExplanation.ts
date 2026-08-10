import type { JobMatchCategoryKey, JobMatchCategoryResult, StructuredJobProfile } from '@/types/jobMatch'
import { DETERMINISTIC_CATEGORIES, SEMANTIC_CATEGORIES } from '@/types/jobMatch'

/**
 * LLM semantic layer (TASK-071, docs/GCC_READINESS_JOB_MATCH.md §11 pipeline
 * steps 5, 7, 8, and §12-13). Two jobs, both explanatory/judgment work the
 * deterministic layer (lib/jobMatch/requirementMapping.ts) structurally
 * cannot do:
 *
 * 1. SCORES three categories that are inherently semantic judgments, not
 *    string-matchable facts — does the summary actually communicate the
 *    right things, does the career narrative demonstrate the responsibilities,
 *    does the industry background align. See SEMANTIC_CATEGORIES.
 * 2. WRITES the human-readable "why" for every category, including the
 *    deterministic ones — but this file NEVER gets to change a deterministic
 *    category's NUMBER. buildDeterministicContext() below only ever sends
 *    the model deterministic scores as fixed, already-decided facts to
 *    explain; validateJobMatchExplanation() only ever reads `.explanation`
 *    strings back out for those categories, never a `.score` — there is no
 *    code path by which a deterministic score could be overwritten by this
 *    layer, structurally, not just by convention.
 *
 * Grounding here means the same thing it means in lib/ai/atsScorePrompt.ts:
 * an ANALYSIS task, not a generation task. The model may only describe what
 * is literally present or absent in the resume/JD text it was given.
 */

const JOB_MATCH_EXPLANATION_SYSTEM_PROMPT = `You are a Gulf-market recruitment analyst explaining a candidate/job match to the candidate themselves.

ABSOLUTE CONSTRAINT — GROUNDING:
- Score summary_match, career_relevance, and industry_match only from what is literally in the resume text and job description given to you.
- Do not claim the resume demonstrates something it does not literally describe.
- Do not invent industry experience, responsibilities, or achievements not stated in the resume.
- The other categories (required_skills, experience_level, gcc_experience, education, certifications, driving_license) have ALREADY been scored by a separate, deterministic process — you are given each one's score and the evidence it found. Your job for those is ONLY to write one clear, specific sentence explaining that score in plain language. Do not propose a different number for them; you have no field to put one in.
- The overall diagnosis must name the single most important, concrete reason for the match quality — not a generic summary. Ground it in the actual evidence, deterministic or your own.

Respond with ONLY a single valid JSON object, no prose, no markdown, no code fences, matching this schema exactly:

{
  "summary_match": { "score": <integer 0-100>, "explanation": "<one clear sentence>" },
  "career_relevance": { "score": <integer 0-100>, "explanation": "<one clear sentence>" },
  "industry_match": { "score": <integer 0-100>, "explanation": "<one clear sentence>" },
  "explanations": {
    "required_skills": "<one sentence explaining the given score>",
    "experience_level": "<one sentence explaining the given score>",
    "gcc_experience": "<one sentence explaining the given score>",
    "education": "<one sentence explaining the given score>",
    "certifications": "<one sentence explaining the given score>",
    "driving_license": "<one sentence explaining the given score>"
  },
  "diagnosis": "<2-3 sentences: the single most important thing this candidate should understand about this match, grounded in real evidence>"
}

Omit an "explanations" key entirely (do not include it, do not write an empty string) for any category marked "not applicable — the job description never raised this" in the evidence below.`

/** Deterministic evidence, formatted as fixed context for the model to explain — never to re-decide. */
function formatDeterministicContext(categories: Partial<Record<JobMatchCategoryKey, JobMatchCategoryResult>>): string {
  const lines: string[] = []
  for (const key of DETERMINISTIC_CATEGORIES) {
    const c = categories[key]
    if (!c) continue
    if (!c.applicable) {
      lines.push(`${key}: not applicable — the job description never raised this`)
      continue
    }
    lines.push(`${key}: score ${c.score}/100. Evidence: ${c.evidence.join('; ') || 'none recorded'}`)
  }
  return lines.join('\n')
}

export function buildJobMatchExplanationSystemPrompt(): string {
  return JOB_MATCH_EXPLANATION_SYSTEM_PROMPT
}

export function buildJobMatchExplanationUserPrompt(opts: {
  resumeText: string
  professionalSummary: string | null
  job: StructuredJobProfile
  jobDescriptionText: string
  deterministicCategories: Partial<Record<JobMatchCategoryKey, JobMatchCategoryResult>>
}): string {
  const detContext = formatDeterministicContext(opts.deterministicCategories)
  const summaryBlock = opts.professionalSummary
    ? `CANDIDATE'S PROFESSIONAL SUMMARY:\n${opts.professionalSummary}`
    : 'CANDIDATE\'S PROFESSIONAL SUMMARY: (none provided)'
  return [
    `RESUME:\n${opts.resumeText}`,
    summaryBlock,
    `JOB DESCRIPTION:\n${opts.jobDescriptionText}`,
    `JOB'S STATED INDUSTRY: ${opts.job.industry ?? '(not stated)'}`,
    `ALREADY-SCORED DETERMINISTIC CATEGORIES (explain these, do not re-score them):\n${detContext}`,
  ].join('\n\n')
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function clampScore(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, Math.round(n)))
}

function explanationString(v: unknown): string {
  return typeof v === 'string' ? v.trim().slice(0, 400) : ''
}

export interface JobMatchExplanationResult {
  semanticScores: Record<(typeof SEMANTIC_CATEGORIES)[number], { score: number; explanation: string }>
  deterministicExplanations: Partial<Record<JobMatchCategoryKey, string>>
  diagnosis: string
}

/**
 * Structural sanity validator, same trust boundary as validateAtsScoreResult.
 * By construction, this can only ever produce a `score` for the three
 * SEMANTIC_CATEGORIES and only ever an `explanation` string for deterministic
 * ones — there is no field in JobMatchExplanationResult a deterministic
 * category's number could land in.
 */
export function validateJobMatchExplanation(raw: unknown): JobMatchExplanationResult | null {
  if (!isObject(raw)) return null

  const semanticScores = {} as JobMatchExplanationResult['semanticScores']
  for (const key of SEMANTIC_CATEGORIES) {
    const entry = raw[key]
    if (!isObject(entry)) return null
    semanticScores[key] = {
      score: clampScore(entry.score),
      explanation: explanationString(entry.explanation),
    }
  }

  const deterministicExplanations: Partial<Record<JobMatchCategoryKey, string>> = {}
  const rawExplanations = isObject(raw.explanations) ? raw.explanations : {}
  for (const key of DETERMINISTIC_CATEGORIES) {
    const v = rawExplanations[key]
    if (typeof v === 'string' && v.trim()) {
      deterministicExplanations[key] = explanationString(v)
    }
  }

  return {
    semanticScores,
    deterministicExplanations,
    diagnosis: explanationString(raw.diagnosis).slice(0, 600),
  }
}
