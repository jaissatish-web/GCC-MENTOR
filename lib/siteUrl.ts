/**
 * The site's own absolute origin — one resolution, used by every place that
 * needs to emit an absolute URL (metadataBase, robots.txt, sitemap.xml).
 *
 * WHY THIS IS A MODULE AND NOT `process.env.NEXT_PUBLIC_APP_URL ?? '...'`
 * INLINE, which is what it was until 2026-09-04:
 *
 * `metadataBase: new URL(SITE_URL)` runs while the ROOT LAYOUT's module is
 * being evaluated, so a value `new URL()` cannot parse does not degrade one
 * page — it throws `TypeError: Invalid URL` and **fails the entire production
 * build**, for every route at once. Two Vercel deployments (fd78a02 and
 * 7d9c555, both 2026-08-25) failed exactly this way and production sat on the
 * 2026-08-20 build for two weeks while the repo looked healthy: `npm run build`
 * passed locally, because locally the value is a well-formed
 * `http://localhost:3000`.
 *
 * Two values break it and both are the obvious thing to type into a hosting
 * dashboard's env field:
 *   - `gcc-mentor.vercel.app`  — a bare domain, no scheme
 *   - `` (empty)               — `??` only falls back on null/undefined
 *
 * So this normalises rather than trusts: a bare domain is promoted to https,
 * anything still unparseable falls back, and the result is an origin with no
 * trailing slash so `${SITE_URL}/sitemap.xml` cannot produce a double slash.
 * A misconfigured env var can now make a canonical URL wrong, which is a
 * content bug someone notices. It can no longer take the site off the air.
 */

const FALLBACK_SITE_URL = 'https://gcc-mentor.vercel.app'

export function normalizeSiteUrl(raw: string | undefined | null): string | null {
  const value = raw?.trim()
  if (!value) return null
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  try {
    return new URL(withScheme).origin
  } catch {
    return null
  }
}

export const SITE_URL: string =
  normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL) ?? FALLBACK_SITE_URL
