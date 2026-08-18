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

/**
 * Session-storage handoff for reuse-detection re-optimization (TASK-036).
 * When a user chooses "re-optimize" for an existing package on /optimize/target,
 * TASK-027 writes the OLD package's id here; /optimize/setup (TASK-028) reads it
 * on a SUCCESSFUL optimize and hard-deletes that old package AFTER the new one
 * is confirmed created (never before, so a failed generation can't destroy
 * existing content). Cleared by setup once consumed.
 *
 * sessionStorage (not localStorage): single-flow state, must not persist across
 * browser sessions.
 */
export const OPTIMIZATION_REPLACE_PACKAGE_KEY = 'optimization_replace_package'

/**
 * Session-storage handoff for a claimed anonymous scan result (TASK-069 →
 * TASK-070). When /onboarding claims an anonymous_analysis_session on
 * signup, it writes the ATS score + job description here (alongside the
 * profile draft under CAREER_PROFILE_DRAFT_KEY) so a "welcome back, here's
 * what we found" display can show the exact result the person already saw
 * pre-signup without a second AI call. Whoever builds that display must READ
 * and CLEAR this key — same one-time-handoff contract as every other key
 * in this file.
 *
 * sessionStorage (not localStorage): single-flow state, must not persist
 * across browser sessions.
 */
export const CLAIMED_SCAN_RESULT_KEY = 'claimed_scan_result'

/**
 * Session-storage handoff for a claimed scan that has NO draft yet.
 *
 * Since TASK-109 the free scan skips extraction unless a job description was
 * supplied, so most claimed sessions carry raw resume text rather than a
 * finished draft. /onboarding writes that text here and sends the user to
 * /onboarding/extracting, which extracts it exactly as if they had pasted it —
 * so the "you never upload your CV twice" promise still holds, with the wait
 * moved out of the free scan and behind a progress screen the user chose.
 *
 * READ and CLEARED by /onboarding/extracting. sessionStorage, same contract as
 * every other key here.
 */
export const CLAIMED_RESUME_TEXT_KEY = 'claimed_resume_text'

/**
 * Session-storage handoff for the anonymous Gulf Readiness RESULT the user saw
 * before signing up (2026-08-18: signup-restore of the full report).
 *
 * The anonymous scorecard hands off through `gulf_readiness_handoff`
 * (lib/gulfReadiness/handoff.ts). When /onboarding picks that handoff up after
 * signup it stashes the computed result here and sends the user to
 * /onboarding/report, which re-renders the SAME result object with
 * `locked={false}` — the full, unblurred report the signup gate promised. It is
 * shown before extraction so the reward is instant (the score is already
 * computed, no AI call), and the ~20s profile extraction follows on the CTA.
 *
 * Unlike the other keys here this one is NOT cleared on read: the report is
 * derived, non-sensitive, and leaving it lets a refresh of /onboarding/report
 * survive. It expires with the tab like the handoff it came from.
 */
export const CLAIMED_READINESS_RESULT_KEY = 'claimed_readiness_result'
