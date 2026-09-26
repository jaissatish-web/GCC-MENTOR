/**
 * Package schema types (TASK-011).
 *
 * Mirrors migration 012 (packages) exactly — every column, correct
 * nullability, and the same value sets as the Postgres enums created in
 * supabase/migrations/012_packages.sql.
 *
 * Nullability rule: NOT NULL columns are required; nullable columns are
 * optional (`?`). Interview Q&A and text Mock Interview are live package
 * artifacts.
 */

import type { TargetCountry, FieldVisibility } from './careerProfile'

// ---- Enums (value sets match the DB enums from migration 012) --------------

/** public.optimization_level_enum */
export type OptimizationLevel = 'easy' | 'moderate' | 'high'

/**
 * public.package_status_enum — the APPLICATION stage, separate from how far the
 * preparation (CV, letter, Q&A, mock) has got. 'saved', 'rejected' and
 * 'withdrawn' added by migration 053 (audit M07): preparing a CV for a job is
 * not applying for it, and an application can end without an offer.
 */
export type PackageStatus =
  | 'saved'
  | 'applied'
  | 'shortlisted'
  | 'interview'
  | 'visa_processing'
  | 'offer'
  | 'rejected'
  | 'withdrawn'

// ---- optimized_content (JSONB, docs/DASHBOARD_LIBRARY.md §4) ---------------

export interface OptimizedSummary {
  generated: string
  user_edited?: string | null // null if untouched
  source_profile_summary: string // the before, for the diff
}

export interface ExperienceBlock {
  profile_experience_id: string
  was_optimized: boolean
  generated_bullets?: string[] | null
  user_edited_bullets?: string[] | null
  source_bullets: string[] // the before, for the diff
  /**
   * No longer requested from the model (2026-09-16). It was free text, one
   * entry per factual assertion, never read or validated by anything, and it
   * cost output tokens on the slowest call in the product. Optional so rows
   * written before that date still type-check; new rows carry an empty array.
   * A real provenance mechanism is deferred Phase 2 work.
   */
  claims?: string[]
}

export interface OptimizedContent {
  summary: OptimizedSummary
  experience_blocks: ExperienceBlock[]
  /**
   * Which blocks fell back to the profile's own text because their optimized
   * content failed grounding after the corrective retry. INTERNAL: never
   * rendered and never returned to the client — it exists so a rising fallback
   * rate shows up in the data instead of in complaints. Absent when nothing
   * fell back, so clean rows keep their existing shape exactly.
   */
  fallback_used?: { summary: boolean; experience_ids: string[] }
  /**
   * True when the skills were actually re-ranked for this job (2026-09-18).
   * The results page claims "Skills ordered by relevance" only when this is
   * true; absent on older rows, which therefore make no claim.
   */
  skills_reordered?: boolean
}

// ---- cover_letters (JSONB[], TASK-065) --------------------------------------
// full_text is composed server-side from the validated parts below, never
// requested from the model — same reasoning as OptimizedContent: storage
// can never diverge from what was actually grounding-checked.

/**
 * The four writing styles offered on /cover-letter (2026-08-18, founder
 * decision). See lib/ai/buildCoverLetterPrompt.ts's TONE_INSTRUCTIONS for what
 * each one actually asks the model to do.
 */
export type CoverLetterTone = 'professional' | 'short' | 'technical' | 'explanatory'

export interface CoverLetter {
  id: string
  generated_at: string // ISO
  target_job_title: string
  target_company: string | null
  // Optional: absent on every letter generated before 2026-08-18, when tone
  // selection did not exist. Never backfilled with a guess — a letter's real
  // tone at generation time is either known or it isn't.
  tone?: CoverLetterTone
  greeting: string
  opening_paragraph: string
  body_paragraphs: string[]
  closing_paragraph: string
  sign_off: string
  full_text: string
}

// ---- interview_questions (JSONB, Phase 4 now live for Q&A) -----------------

export type InterviewQuestionCategory =
  | 'hr'
  | 'technical'
  | 'project'
  | 'behavioral'
  | 'gulf_readiness'
  | 'company_role'

export type InterviewQuestionDifficulty = 'standard' | 'strong' | 'challenging'

export interface InterviewQuestionAnswer {
  id: string
  category: InterviewQuestionCategory
  difficulty: InterviewQuestionDifficulty
  question: string
  answer: string
  why_asked: string
  resume_basis: string
  follow_up: string | null
  tags: string[]
}

export interface InterviewQuestionSet {
  id: string
  generated_at: string
  target_job_title: string
  target_company: string | null
  target_country: TargetCountry | null
  question_count: number
  source: 'optimized_resume'
  questions: InterviewQuestionAnswer[]
}

// ---- mock_interview_runs (JSONB[], text MVP) ------------------------------

export type MockInterviewMode = 'hr' | 'technical' | 'gulf_readiness' | 'manager' | 'mixed'
export type MockInterviewDifficulty = 'standard' | 'strong' | 'challenging'
export type MockInterviewStatus = 'in_progress' | 'completed'

export interface MockInterviewQuestion {
  id: string
  category: InterviewQuestionCategory
  focus: string
  question: string
  ideal_answer_points: string[]
  answer: string | null
  feedback: string | null
  better_answer: string | null
  follow_up: string | null
  score: number | null
  answered_at: string | null
}

export interface MockInterviewFinalReport {
  overall_score: number
  technical_score: number
  role_fit_score: number
  gulf_readiness_score: number
  answer_structure_score: number
  strengths: string[]
  weak_points: string[]
  risky_answers: string[]
  improvement_plan: string[]
  next_practice_questions: string[]
}

export interface MockInterviewRun {
  input_mode?: 'text' | 'voice'
  resume_fingerprint?: string
  rubric_version?: string
  id: string
  generated_at: string
  completed_at: string | null
  target_job_title: string
  target_company: string | null
  target_country: TargetCountry | null
  mode: MockInterviewMode
  difficulty: MockInterviewDifficulty
  question_count: number
  current_index: number
  status: MockInterviewStatus
  opening_note: string
  questions: MockInterviewQuestion[]
  final_report: MockInterviewFinalReport | null
}

export type PackageServiceEventType =
  | 'package_created'
  | 'cv_generated'
  | 'cover_letter_generated'
  | 'qa_generated'
  | 'mock_interview_started'
  | 'mock_interview_answered'
  | 'mock_interview_completed'
  | 'pdf_downloaded'
  | 'status_changed'
  | 'tracker_updated'

export interface PackageServiceEvent {
  id: string
  type: PackageServiceEventType
  at: string
  label: string
  meta?: Record<string, unknown>
}

// ---- packages (migration 012) ----------------------------------------------

export interface Package {
  id: string
  user_id: string // RLS key
  profile_id: string // source of truth for fixed fields

  // Target
  target_job_title: string
  // Optional (migration 030) — see types/careerProfile.ts's note; the same
  // reasoning applies here.
  target_country: TargetCountry | null
  target_company: string | null
  // Optional (migration 043) — see lib/ai/personas.ts's fallback note; the
  // same reasoning as target_country and target_company above.
  target_industry: string | null // persona selection
  job_description: string | null // the JD it was optimized against, if provided
  job_url?: string | null
  application_deadline?: string | null
  interview_date?: string | null
  application_notes?: string | null

  // Optimization
  optimization_level: OptimizationLevel
  status: PackageStatus

  // Output (structured, never a flat file)
  /** NULL between payment and generation — see migration 033 (pay before generate). */
  optimized_content: OptimizedContent | null
  skills_order: string[] // relevance-ordered skill IDs for this target
  field_visibility_snapshot: FieldVisibility
  /**
   * The document AS DELIVERED (migration 034): buildResumeDocument() output,
   * captured once at generation. Renderers prefer it over the live profile so a
   * paid resume cannot change when the Career Profile is later edited. NULL for
   * packages generated before that migration, which still render live.
   *
   * Typed loosely here on purpose — types/package.ts is imported by client
   * components, and pulling in ResumeDocument would drag the whole
   * resume-document module into those bundles for a field they only pass
   * through untouched.
   */
  document_snapshot?: unknown | null
  /**
   * The user's font / size / accent choices (migration 037, TASK-152).
   *
   * `unknown` for the same reason as `document_snapshot` above: typing it here
   * would pull lib/resumeStyle into every bundle that merely passes a package
   * through. Read it with `readStyleOverrides()`, which drops anything that is
   * not a known option rather than trusting the column.
   *
   * Presentation only — nothing reachable from here can change a word of the
   * resume, which is why it is a separate column from `document_snapshot`.
   */
  style_overrides?: unknown | null
  /**
   * Deterministic before/after match score and the evidence it used (migration
   * 056, docs/17_OPTIMIZER_ENGINE.md). Server-written only. NULL for packages
   * built before the optimizer engine. Shape: lib/optimizer/types.ts MatchReport
   * — `unknown` here for the same bundle reason as document_snapshot.
   */
  match_report?: unknown | null
  /**
   * What the user chose to optimize, captured at creation (migration 033) so
   * generation can run later, in a request that carries only a package id.
   */
  selected_blocks?: { summary: boolean; experienceIds: string[] } | null

  /** User-chosen label (migration 036). NULL = never renamed; the UI falls back to target_job_title. */
  name?: string | null
  /** Stable template id, and its version at the time it was applied (migration 035). */
  template_id?: string | null
  template_version?: number | null

  // Payment
  is_paid: boolean // gates download
  payment_id: string | null // Razorpay reference

  // Metadata
  generation_count: number // incremented on re-optimize
  created_at: string // timestamptz
  updated_at: string // timestamptz

  // Extra package artifacts. (Required keys: the columns are always present in
  // a returned row, just null/empty until generated.)
  ats_score_card: unknown // Phase 2; jsonb
  cover_letters: CoverLetter[] // Phase 3; jsonb[] — typed as of TASK-065
  interview_questions: InterviewQuestionSet | null // Phase 4; jsonb
  mock_interview_runs: MockInterviewRun[] // Phase 4; jsonb[]
  service_events?: PackageServiceEvent[]
}
