/**
 * Session-storage handoff between the extraction screen (TASK-023) and the
 * Career Profile review screen (TASK-024).
 *
 * TASK-023 stores the successful CareerProfileDraft JSON here so TASK-024 can
 * consume it. TASK-024 must READ and CLEAR this key when built.
 *
 * sessionStorage (not localStorage) is deliberate: this is parsed resume
 * content and must not persist across browser sessions.
 */
export const CAREER_PROFILE_DRAFT_KEY = 'career_profile_draft'

/**
 * Session-storage handoff for the optimization TARGET selection (TASK-027 →
 * TASK-028). TASK-027 (/optimize/target) collects the per-optimization target
 * (title, industry, country, company, JD text) and writes it here on "Choose
 * what to optimize"; /optimize/setup (TASK-028) will READ and CLEAR this key
 * when built.
 *
 * sessionStorage (not localStorage) is deliberate: this is a single
 * optimization's intent and must not persist across browser sessions.
 */
export const OPTIMIZATION_TARGET_DRAFT_KEY = 'optimization_target_draft'
