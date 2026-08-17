/**
 * Gulf Readiness Scorecard — the shared types.
 *
 * The whole engine is ARITHMETIC. No LLM call anywhere in this folder. Founder
 * decision 2026-08-17: the score, the scenario, the strengths, the gaps and the
 * ranked recommendations are all computed by rules on the funnel answers and the
 * resume text, so the result is reproducible, free, instant, and cannot fabricate.
 *
 * The same pure function runs for an anonymous visitor and for a signed-in user.
 * The anonymous view shows a subset; the signed-in view shows the same object in
 * full. Because it is deterministic, the number a user sees before signing up is
 * exactly the number they see after — which is the whole point of not using a
 * model here.
 *
 * NOT to be confused with:
 *   - lib/readiness.ts        — the older profile-completeness score (signed-in,
 *                               weighted-fill). Superseded for the anonymous
 *                               scorecard by this module.
 *   - lib/gccReadiness/       — the earlier anonymous analysis. This module is the
 *                               scenario-based replacement.
 */

/** The four Gulf-career scenarios, chosen by the funnel, never inferred. */
export type Scenario = 'currently_in_gulf' | 'returner' | 'experienced' | 'fresher'

/**
 * The funnel answers — the source of truth for the scenario.
 *
 * No country, no year counts (founder decision). Gulf experience yes/no, then one
 * follow-up: where you are now (if yes) or whether you have professional
 * experience (if no).
 */
export interface FunnelAnswers {
  hasGulfExperience: boolean
  /** Only meaningful when hasGulfExperience is true. */
  currentlyInGulf?: boolean
  /** Only meaningful when hasGulfExperience is false. */
  hasProfessionalExperience?: boolean
}

/** How sure the heuristic is that it read a dimension correctly. */
export type Confidence = 'high' | 'medium' | 'low'

/** One scored dimension of the six. */
export interface DimensionResult {
  key: DimensionKey
  label: string
  score: number
  max: number
  /** What the engine actually found in the resume. Never invented. */
  evidence: string[]
  /** What is missing or weak. Drives the recommendations. */
  gaps: string[]
  confidence: Confidence
}

export type DimensionKey =
  | 'gulf_market_position'
  | 'work_experience'
  | 'skills'
  | 'education'
  | 'certifications'
  | 'resume_quality'

/** A ranked thing to fix, so the user is told where to start. */
export interface Recommendation {
  title: string
  why: string
  impact: 'high' | 'medium' | 'low'
  difficulty: 'low' | 'medium' | 'high'
  /** impact and difficulty collapsed to a single sortable number. */
  priority: number
}

export interface ScoreBand {
  key: 'under_50' | 'mid' | 'ready'
  /** Scenario-aware label, e.g. "Promising Start" vs "GCC Re-entry Needs Work". */
  label: string
  /** Two or three sentences, scenario-aware, always routing to optimization. */
  message: string
}

/** The complete result. Anonymous shows a subset of it; signup unblurs the rest. */
export interface GulfReadinessResult {
  scenario: Scenario
  scenarioLabel: string
  finalScore: number
  band: ScoreBand
  dimensions: DimensionResult[]
  strengths: string[]
  weaknesses: string[]
  recommendations: Recommendation[]
  /** Overall read confidence — lowest of the dimension confidences. */
  confidence: Confidence
  /** True when the resume text was too thin to read reliably. */
  lowResumeSignal: boolean
}

export interface GulfReadinessInput {
  answers: FunnelAnswers
  resumeText: string
}
