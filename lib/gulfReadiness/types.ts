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

import type { ArabicLevel, PaperworkStatus } from '@/types/careerProfile'

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
  | 'gulf_essentials'
  | 'resume_quality'

/**
 * What we know about the candidate's photo (Gulf Readiness v2, 2026-10-01).
 * `unknown` = we cannot tell (pasted text, a Word file on the anonymous scan):
 * the photo is then left out of the score rather than counted as missing.
 */
export type PhotoState = 'none' | 'hidden' | 'shown' | 'shown_confirmed' | 'unknown'

/**
 * Structured facts the engine reads directly when it has them (a Career
 * Profile), instead of guessing from CV text. Every field optional: the
 * anonymous scan passes only what a file can tell (photo), the rest falls back
 * to reading the text.
 */
export interface GulfFacts {
  photo?: PhotoState
  passportValidityDate?: string | null
  passportType?: string | null
  visaStatus?: string | null
  visaTransferable?: boolean | null
  noticePeriod?: string | null
  hasDrivingLicence?: boolean | null
  drivingLicenceCountry?: string | null
  whatsapp?: string | null
  /** Score these only when a target job explicitly requires them. */
  arabicRequired?: boolean
  drivingLicenceRequired?: boolean
  arabicLevel?: ArabicLevel | null
  degreeAttestation?: PaperworkStatus | null
  professionalLicence?: PaperworkStatus | null
  saudiVerification?: PaperworkStatus | null
  targetCountry?: string | null
  targetJobTitle?: string | null
}

/**
 * One must-have for a Gulf work visa or first-day job. These decide the
 * verdict, not the score: a strong CV with an expired passport is not "ready".
 *   ok          done / not a problem
 *   missing     a blocker the user has to sort out
 *   in_progress started
 *   unknown     not answered yet — "not checked", never a failure
 */
export interface MustHave {
  key: 'passport' | 'degree_attestation' | 'saudi_verification' | 'professional_licence'
  label: string
  status: 'ok' | 'missing' | 'in_progress' | 'unknown'
  /** One line on why it matters, for this person. */
  why: string
  /** The real process, in order. */
  steps: string[]
  /** The profile field that answers it (the editor jumps there). */
  field: string
}

/** The headline answer: can this person apply to Gulf jobs now? */
export interface Verdict {
  key: 'ready' | 'almost' | 'not_ready'
  label: string
  message: string
  /** Must-haves still missing. */
  blockers: number
  /** Must-haves in progress or not yet answered. */
  pending: number
}

/** A ranked thing to fix, so the user is told where to start. */
export interface Recommendation {
  /**
   * The dimension this fix raises (2026-09-11). Lets a UI point at the part of
   * the profile it is about. Additive — the score and ranking never read it.
   */
  dimension: DimensionKey
  title: string
  why: string
  impact: 'high' | 'medium' | 'low'
  difficulty: 'low' | 'medium' | 'high'
  /** impact and difficulty collapsed to a single sortable number. */
  priority: number
  /**
   * Where it sits on the guided path (v2): sort the paperwork out, strengthen
   * the profile, then apply. Absent = 'profile'.
   */
  stage?: 'paperwork' | 'profile' | 'apply'
  /** About how many points this fix adds to the score, when that is known. */
  gain?: number
  /** The process, step by step, for paperwork items. */
  steps?: string[]
  /** The Career Profile field that fixes it, when it is one field. */
  field?: string
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
  /** v2: the headline — ready / almost / not ready — from the score AND the must-haves. */
  verdict: Verdict
  /** v2: the visa and job must-haves that apply to this person. */
  mustHaves: MustHave[]
}

export interface GulfReadinessInput {
  answers: FunnelAnswers
  resumeText: string
  /** Structured facts, when known (signed-in profile). See GulfFacts. */
  facts?: GulfFacts
  /** "Today" for passport validity; tests pin it. */
  today?: Date
}
