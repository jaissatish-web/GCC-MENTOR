import type { MetadataRoute } from 'next'
import { TOOLS, isActive, UPDATED } from '@/lib/free-tools/registry'
import { SITE_URL } from '@/lib/siteUrl'

/** Public indexable routes plus the explicitly published free-tools registry.
 * Unverified/incomplete tools never enter this sitemap.
 */

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: `${SITE_URL}/tools`, lastModified: UPDATED, changeFrequency: 'monthly', priority: 0.8 },
    ...TOOLS.filter(t=>isActive(t.id)).map(t=>({url:`${SITE_URL}/tools/${t.slug}`,lastModified:UPDATED,changeFrequency:'monthly' as const,priority:0.7})),
    { url: SITE_URL, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/preparation-pack`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/gulf-readiness-score`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
  ]
}
