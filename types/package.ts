/**
 * Package schema types (TASK-011).
 *
 * Mirrors migration 012 (packages) exactly — every column, correct
 * nullability, and the same value sets as the Postgres enums created in
 * supabase/migrations/012_packages.sql.
 *
 * Nullability rule: NOT NULL columns are required; nullable columns are
 * optional (`?`). The four Phase 2–4 slots are optional schema reservations.
 */

import type { TargetCountry, FieldVisibility } from './careerProfile'

// ---- Enums (value sets match the DB enums from migration 012) --------------

/** public.optimization_level_enum */
export type OptimizationLevel = 'easy' | 'moderate' | 'high'

/** public.package_status_enum */
export type PackageStatus =
  | 'applied'
  | 'shortlisted'
  | 'interview'
  | 'visa_processing'
  | 'offer'

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
  claims: string[] // extracted facts, e.g. "400+ field instruments"
}

export interface OptimizedContent {
  summary: OptimizedSummary
  experience_blocks: ExperienceBlock[]
}

// ---- cover_letters (JSONB[], TASK-065) --------------------------------------
// full_text is composed server-side from the validated parts below, never
// requested from the model — same reasoning as OptimizedContent: storage
// can never diverge from what was actually grounding-checked.

export interface CoverLetter {
  id: string
  generated_at: string // ISO
  target_job_title: string
  target_company: string | null
  greeting: string
  opening_paragraph: string
  body_paragraphs: string[]
  closing_paragraph: string
  sign_off: string
  full_text: string
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
  target_industry: string // persona selection
  job_description: string | null // the JD it was optimized against, if provided

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

  // Phase 2–4 slots — schema reservations only. Created now, left null, no
  // UI. Docs/DASHBOARD_LIBRARY.md §2. (Required keys: the column is always
  // present in a returned row, just null.)
  ats_score_card: unknown // Phase 2; jsonb
  cover_letters: CoverLetter[] // Phase 3; jsonb[] — typed as of TASK-065
  interview_questions: unknown // Phase 4; jsonb
  mock_interview_runs: unknown[] // Phase 4; jsonb[]
}
