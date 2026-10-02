/**
 * Shared types for the optimizer engine (2026-09-17). See docs/17_OPTIMIZER_ENGINE.md.
 *
 * Client-safe: type-only imports, so screens can import these freely.
 */

import type { StructuredJobProfile } from '@/types/jobMatch'
import type { OptimizationLevel } from '@/types/package'

export type OptimizationMode = 'job_description' | 'target_title_only'

export type KeywordImportance = 'must' | 'nice'

export type KeywordKind =
  | 'skill'
  | 'tool'
  | 'certification'
  | 'education'
  | 'domain'
  | 'responsibility'
  | 'soft_skill'

export interface TargetKeyword {
  /** The employer's own wording (JD mode) or the common market wording (title mode). */
  term: string
  /** Other spellings that mean exactly the same thing: acronyms, expansions. Never "related" skills. */
  aliases: string[]
  /**
   * Options the advert accepts instead ("Accounting or Finance"). Also present in
   * `aliases` for matching; kept here so re-validation does not drop them.
   */
  alternatives?: string[]
  importance: KeywordImportance
  kind: KeywordKind
}

/**
 * What a target asks for, in matchable form. Produced once per (user, input)
 * by job analysis and cached in `job_analyses`.
 *
 * In `target_title_only` mode the keywords are an ESTIMATE of what the role
 * usually asks for. They may rank and score; they are never evidence and never
 * content (the prompt, the validator and the UI all say so).
 */
export interface JobTargetProfile {
  version: 1
  mode: OptimizationMode
  job_title: string
  title_variants: string[]
  seniority: string | null
  keywords: TargetKeyword[]
  /** JD mode only: the legacy structured job, kept so Job Match categories still run. */
  structured: StructuredJobProfile | null
}

/** Where a piece of profile text lives. `summary` also covers skills, certifications and additional info. */
export type EvidenceLocation = 'summary' | string

/**
 * A profile-to-requirement equivalence that is not literal, proven by a
 * verbatim quote from the profile. Produced by the evidence bridge and
 * re-verified in code before use.
 */
export interface VerifiedBridge {
  term: string
  /** 'summary' for profile-wide text, otherwise a profile_work_experience id. */
  location: EvidenceLocation
  quote: string
}

export type KeywordStatus =
  /** Present in context (summary or experience) before optimization. */
  | 'matched'
  /** Only listed (skills, certifications, education) before optimization. */
  | 'listed'
  /** The profile proves it, but the resume does not say it in the employer's words yet. */
  | 'supported'
  /** Nothing in the profile supports it. Never written; shown to the user as a gap. */
  | 'gap'

export interface KeywordEvidence {
  term: string
  aliases: string[]
  importance: KeywordImportance
  kind: KeywordKind
  weight: number
  /** Experience entries whose own text literally contains the term. */
  literalEntryIds: string[]
  /** Literally in the professional summary. */
  inSummary: boolean
  /** Literally in skills / certifications / education / additional information. */
  listed: boolean
  bridges: VerifiedBridge[]
  /** Where the optimizer may legitimately write this term. */
  placeable: EvidenceLocation[]
  status: KeywordStatus
}

export interface ScorePart {
  score: number
  weight: number
}

export interface KeywordCredit {
  term: string
  importance: KeywordImportance
  kind: KeywordKind
  /** 0 absent, 0.6 listed only, 1 in context. */
  credit: number
  /** 'summary', 'skills', or a profile_work_experience id. */
  where: string[]
}

export interface MatchScore {
  scoring_version: string
  total: number
  parts: {
    keywords: ScorePart
    summary: ScorePart
    title: ScorePart
    format: ScorePart
    qualifications: ScorePart | null
  }
  keywords: KeywordCredit[]
}

export type KeptOriginalReason = 'grounding' | 'quality' | 'review' | 'no_output' | 'score_guard'

export interface MatchReport {
  report_version: 1
  mode: OptimizationMode
  analysis_id: string | null
  target: JobTargetProfile
  bridges: VerifiedBridge[]
  profile_fingerprint: string
  /** Deterministic qualification-fit score (years, education, certs, GCC, licence). null = not applicable. */
  qualifications: number | null
  before: MatchScore
  /** Best achievable with the real profile and every block selected. */
  max_total: number
  level?: OptimizationLevel
  after?: MatchScore
  /** Set when the user has edited generated text since the build; `after` is recomputed. */
  after_edited?: boolean
  why_fits?: Array<{ term: string; where: string[] }>
  gaps?: Array<{ term: string; importance: KeywordImportance; kind: KeywordKind }>
  kept_original?: Array<{ block: EvidenceLocation; reason: KeptOriginalReason }>
  generated_at?: string
  /** Moderate/High: drafted lines for missing requirements, awaiting the candidate. */
  suggestions?: Array<{ id: string; block: string; requirement: string; text: string; status: 'pending' | 'confirmed' | 'dismissed' }>
  /** Score if every pending suggestion were confirmed. */
  projected_with_suggestions?: number
  /** The level's target band, e.g. [75, 85]. */
  target_band?: [number, number]
  /** Which engine built it. Absent = the 2026-09-17 engine. */
  engine?: 'v3'
  /** v3: how the candidate's field relates to the job's. */
  field_match?: { match: 'same' | 'related' | 'different'; job_field: string; candidate_field: string }
  /**
   * v3: certificates and licences the job asks for that the profile does not
   * show. NEVER written into the CV — offered to the user to add to their
   * Career Profile if they really hold them, with the points each would add.
   */
  ask_certifications?: Array<{ term: string; importance: KeywordImportance; gain: number }>
  /** v3: job terms (list B) added inside the candidate's own rewritten lines — yellow on the first review. */
  added_terms?: string[]
  /** v3: no advert was pasted — matched against the typical Gulf advert for the title (typical_job_adverts). */
  advert_source?: 'typical'
  typical_advert?: string
  /** v3: added lines went straight into the CV (one-time agreement + an earlier CV); the CV page and review page show them so none is unseen. */
  auto_applied?: boolean
}
