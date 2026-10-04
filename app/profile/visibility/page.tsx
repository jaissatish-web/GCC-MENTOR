import { redirect } from 'next/navigation'

/**
 * /profile/visibility — a redirect into the Career Profile since 2026-10-04.
 *
 * Founder brief: "what appears on your CV" belongs on the main profile page,
 * as Profile settings. It is now the `?view=settings` screen of /profile, where
 * the toggles edit the same state as the rest of the profile and one Save
 * writes everything. As a separate route it unmounted the editor on the way
 * here, losing anything typed and not yet saved (docs/14_OPEN_ITEMS.md B5).
 *
 * KEPT AS A ROUTE, NOT DELETED, so a bookmark or an old link still lands. Still
 * under /profile, so middleware.ts sends a signed-out visitor to login first.
 */
export default function ProfileVisibilityPage() {
  redirect('/profile?view=settings')
}
