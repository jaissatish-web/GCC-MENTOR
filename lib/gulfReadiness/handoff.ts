import type { FunnelAnswers, GulfReadinessResult } from '@/lib/gulfReadiness/types'

/**
 * The anonymous → signup handoff, held in the browser only.
 *
 * Founder decision 2026-08-17: an anonymous scan writes NOTHING to the server. The
 * result, the funnel answers and the resume text live in sessionStorage until the
 * user creates an account, at which point the app persists them to the new user and
 * clears this. Abandon signup and nothing is retained anywhere.
 *
 * sessionStorage, not localStorage: it is scoped to the tab and cleared when the tab
 * closes, which matches "temporary" honestly. The tradeoff — a closed tab or a
 * different device loses it — is acceptable; the user re-runs a free, instant scan.
 */

export const HANDOFF_KEY = 'gulf_readiness_handoff'

export interface ReadinessHandoff {
  version: 1
  answers: FunnelAnswers
  result: GulfReadinessResult
  /** Kept so the profile can be pre-filled after signup without a second upload. */
  resumeText: string
  createdAt: string
}

export function saveHandoff(h: Omit<ReadinessHandoff, 'version' | 'createdAt'>): void {
  try {
    const payload: ReadinessHandoff = { version: 1, createdAt: new Date().toISOString(), ...h }
    sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(payload))
  } catch {
    // A private-mode browser can refuse sessionStorage. The result is still on
    // screen; only the signup carry-over is lost, so fail quietly rather than
    // breaking the page.
  }
}

export function readHandoff(): ReadinessHandoff | null {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReadinessHandoff
    return parsed?.version === 1 && parsed.result ? parsed : null
  } catch {
    return null
  }
}

export function clearHandoff(): void {
  try {
    sessionStorage.removeItem(HANDOFF_KEY)
  } catch {
    /* nothing to clear */
  }
}
