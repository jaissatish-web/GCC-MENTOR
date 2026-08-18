import { redirect } from 'next/navigation'

/**
 * Retired 2026-08-18 (founder decision: one free scan, one profile route).
 *
 * `/ats-scan` was the original anonymous scanner. It is superseded by the
 * arithmetic Gulf Readiness Scorecard at `/gulf-readiness-score`, which is now the
 * single free scan entry point. This route stays only to redirect old links and
 * bookmarks rather than 404 them; the page's former UI and its LLM job-match path
 * are gone.
 */
export default function AtsScanRedirect() {
  redirect('/gulf-readiness-score')
}
