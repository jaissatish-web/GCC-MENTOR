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
