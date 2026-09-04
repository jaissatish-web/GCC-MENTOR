import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/siteUrl'

/**
 * sitemap.xml (2026-08-19).
 *
 * PUBLIC ROUTES ONLY — the four a logged-out visitor can actually reach and
 * that render real content. Everything behind middleware.ts's auth check is
 * deliberately absent: submitting a URL that answers every crawl with a login
 * redirect is how a site teaches a search engine to distrust its own sitemap.
 *
 * Kept as a hand-written list rather than derived from the route tree. A
 * generated sitemap would silently start advertising every new page, including
 * ones that are half-built or deliberately unlinked — the retired /ats-scan and
 * /create-resume redirects being live examples.
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/gulf-readiness-score`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
