import { unstable_cache } from 'next/cache'
import { createServiceRoleClient } from '@/lib/supabase/serviceAdmin'

/**
 * Founder-editable site content — the legal pages and the footer's about line.
 *
 * Migration 046. Same posture as prices and prompt templates: this is business
 * copy, not code, so it lives in a row and is edited at `/admin/content`
 * without a developer or a deploy (`03_ARCHITECTURE.md` §6).
 *
 * EVERY READ HERE IS `fresh`. Next caches `fetch`, and supabase-js uses it, so
 * without this a newly published page keeps 404ing while the row plainly says
 * published — measured, not theorised. Publishing must take effect the moment
 * the founder presses Save.
 *
 * PUBLISHED IS LOAD-BEARING. `getPublishedPage` returns null for an unpublished
 * or empty row, and the footer asks `listPublishedLegal()` what to link to. So
 * a half-written privacy policy is unreachable and unlinked by construction —
 * not by anyone remembering to hide it.
 */

export interface SiteContent {
  slug: string
  title: string
  body: string
  published: boolean
  updatedAt: string
}

/** The three pages the footer will link to once they are written. */
export const LEGAL_SLUGS = ['privacy', 'terms', 'refund'] as const
export type LegalSlug = (typeof LEGAL_SLUGS)[number]

export function isLegalSlug(v: string): v is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(v)
}

function map(r: Record<string, unknown>): SiteContent {
  return {
    slug: r.slug as string,
    title: r.title as string,
    body: (r.body as string) ?? '',
    published: Boolean(r.published),
    updatedAt: r.updated_at as string,
  }
}

/**
 * The service-role client throws when `NEXT_PUBLIC_SUPABASE_URL` or
 * `SUPABASE_SERVICE_ROLE_KEY` is absent, and these reads run during the
 * production build: `AppFooter` asks for the published legal links on every
 * page, so `next build` prerenders `/` straight into "Error: supabaseUrl is
 * required." in any environment that has no Supabase settings. That is exactly
 * how the Vercel preview for `b681148` failed, while CI (placeholder values)
 * and production (real values) both built.
 *
 * Returning null lets each caller take the SAME "no content" path it already
 * takes when the query itself fails, instead of taking the build down. With
 * the settings present nothing changes at all.
 *
 * Reads only. `saveSiteContent` still constructs the client directly: an admin
 * write that silently did nothing would be worse than one that fails loudly.
 */
function serviceClientIfConfigured(opts?: { fresh?: boolean }) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn('site_content read skipped: no Supabase configuration in this environment')
    return null
  }
  return createServiceRoleClient({ fresh: opts?.fresh ?? false })
}

/**
 * PUBLIC READS ARE CACHED, AND WHY THAT MATTERS MORE THAN IT LOOKS.
 *
 * `AppFooter` renders on the landing page and seven other route trees, and it
 * asks this module for the published legal links and the footer line on every
 * render. Those two reads used `{ fresh: true }`, i.e. `cache: 'no-store'`,
 * which opts the ENTIRE route out of Next's full-route cache. The result,
 * measured in production on 2026-09-16: every page served
 * `Cache-Control: private, no-cache, no-store` with `X-Vercel-Cache: MISS`,
 * so a landing page that renders identical HTML for every visitor was rebuilt
 * per request, twice querying a database in another continent. Worse, Next
 * prefetches every nav link, so ONE page view fanned out into about ten
 * dynamic renders.
 *
 * `fresh: true` was introduced for a real bug (publishing a page and watching
 * the public URL keep 404ing), so it is not simply dropped: the cache is keyed
 * by tag and `saveSiteContent` invalidates that tag on every write. Publishing
 * is still immediate; the other 99.9% of reads are served from cache.
 */
export const SITE_CONTENT_TAG = 'site-content'

/** Every row, published or not — the admin editor's view. */
export async function listSiteContent(): Promise<SiteContent[]> {
  const supabase = serviceClientIfConfigured({ fresh: true })
  if (!supabase) return []
  const { data, error } = await supabase
    .from('site_content')
    .select('slug, title, body, published, updated_at')
    .order('slug')
  if (error) {
    console.error('site_content list failed', error.message)
    return []
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map(map)
}

/**
 * One page, for the public route.
 *
 * Returns null when unpublished OR when the body is empty. An empty published
 * page is a mistake rather than an intention, and rendering a blank legal page
 * is worse than a 404 — it looks like the policy says nothing.
 */
export const getPublishedPage = unstable_cache(
  getPublishedPageUncached,
  ['site-content-published-page'],
  { tags: [SITE_CONTENT_TAG], revalidate: 3600 }
)

async function getPublishedPageUncached(slug: string): Promise<SiteContent | null> {
  const supabase = serviceClientIfConfigured()
  if (!supabase) return null
  const { data, error } = await supabase
    .from('site_content')
    .select('slug, title, body, published, updated_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle()
  if (error || !data) return null
  const page = map(data as Record<string, unknown>)
  return page.body.trim() ? page : null
}

/** What the footer is allowed to link to. Never guesses; asks. */
export const listPublishedLegal = unstable_cache(
  listPublishedLegalUncached,
  ['site-content-published-legal'],
  { tags: [SITE_CONTENT_TAG], revalidate: 3600 }
)

async function listPublishedLegalUncached(): Promise<Array<{ slug: string; title: string }>> {
  const supabase = serviceClientIfConfigured()
  if (!supabase) return []
  const { data, error } = await supabase
    .from('site_content')
    .select('slug, title, body')
    .eq('published', true)
    .in('slug', LEGAL_SLUGS as unknown as string[])
    .order('slug')
  if (error) return []
  return ((data ?? []) as Array<Record<string, unknown>>)
    .filter((r) => String(r.body ?? '').trim())
    .map((r) => ({ slug: r.slug as string, title: r.title as string }))
}

/** A single published value, for small pieces of copy like the footer line. */
export async function getPublishedValue(slug: string, fallback: string): Promise<string> {
  const page = await getPublishedPage(slug)
  return page?.body.trim() || fallback
}

export async function saveSiteContent(opts: {
  slug: string
  title: string
  body: string
  published: boolean
  adminId: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Publishing nothing is always a mistake, and this is the one place to catch
  // it — the public route would otherwise 404 on a page the founder believes
  // is live.
  if (opts.published && !opts.body.trim()) {
    return { ok: false, error: 'Write something before publishing this page.' }
  }
  if (!opts.title.trim()) {
    return { ok: false, error: 'A page needs a title.' }
  }

  const supabase = createServiceRoleClient({ fresh: true })
  const { error } = await supabase.from('site_content').upsert(
    {
      slug: opts.slug,
      title: opts.title.trim(),
      body: opts.body,
      published: opts.published,
      updated_at: new Date().toISOString(),
      updated_by: opts.adminId,
    },
    { onConflict: 'slug' },
  )
  if (error) {
    console.error('site_content save failed: slug=' + opts.slug, error.message)
    return { ok: false, error: 'Could not save this page.' }
  }
  // The caller invalidates SITE_CONTENT_TAG. That happens in the admin server
  // action rather than here: `revalidateTag` may only be imported by server
  // code, and this module is reachable from client components.
  return { ok: true }
}
