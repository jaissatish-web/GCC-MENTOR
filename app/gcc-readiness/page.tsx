import { redirect } from 'next/navigation'

/**
 * /gcc-readiness — a redirect into the Career Profile since 2026-09-11.
 *
 * Founder decision: Career Profile and Profile Strength are one page. The
 * profile editor was already the live Profile Strength view, and its new
 * "Improve your profile" panel carries both scores — Profile Strength's missing
 * items and Gulf Readiness's ranked fixes — recomputed as the user types.
 *
 * KEPT AS A ROUTE, NOT DELETED, so every old link still lands: the footer and
 * dashboard of any cached page, a bookmark, a shared URL. `?tab=gulf` (the
 * dashboard card's link while this was a page) opens the Gulf tab there.
 * Still listed in middleware.ts, so a signed-out visitor is sent to login first.
 */
export default function GccReadinessPage({ searchParams }: { searchParams: { tab?: string } }) {
  redirect(searchParams.tab === 'gulf' ? '/profile?improve=gulf' : '/profile')
}
