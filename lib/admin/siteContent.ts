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

/** Every row, published or not — the admin editor's view. */
export async function listSiteContent(): Promise<SiteContent[]> {
  const supabase = createServiceRoleClient({ fresh: true })
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
export async function getPublishedPage(slug: string): Promise<SiteContent | null> {
  const supabase = createServiceRoleClient({ fresh: true })
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
export async function listPublishedLegal(): Promise<Array<{ slug: string; title: string }>> {
  const supabase = createServiceRoleClient({ fresh: true })
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
  return { ok: true }
}
